import logging
import time
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers import AIProvider, get_ai_provider
from app.core.errors import ErrorCode
from app.core.exceptions import AppException
from app.db.models import AILog
from app.schemas.ai import ChatMessage, ChatRequest, ChatResponse, TokenUsage

logger = logging.getLogger(__name__)


def messages_to_prompt(messages: list[ChatMessage]) -> str:
    return "\n".join(f"{message.role}: {message.content}" for message in messages)


def messages_to_provider_payload(messages: list[ChatMessage]) -> list[dict[str, str]]:
    return [{"role": message.role, "content": message.content} for message in messages]


class AIService:
    def __init__(
        self,
        db: AsyncSession,
        *,
        user_id: str | None = None,
        provider: AIProvider | None = None,
    ) -> None:
        self.db = db
        self.user_id = user_id
        self.provider = provider or get_ai_provider()

    async def chat(self, request: ChatRequest) -> ChatResponse:
        prompt = messages_to_prompt(request.messages)
        payload = messages_to_provider_payload(request.messages)
        started = time.perf_counter()

        try:
            content = await self.provider.generate(
                prompt,
                model=request.model,
                messages=payload,
            )
        except Exception as exc:
            logger.exception("AI provider error")
            raise AppException(
                ErrorCode.AI_PROVIDER_ERROR,
                str(exc),
            ) from exc

        latency_ms = int((time.perf_counter() - started) * 1000)
        usage_data = await self.provider.token_usage()
        usage = TokenUsage(
            prompt_tokens=usage_data.get("prompt_tokens", 0),
            completion_tokens=usage_data.get("completion_tokens", 0),
            total_tokens=usage_data.get("total_tokens", 0),
        )

        provider_name = _resolve_provider_name(self.provider)
        await self._log_call(
            provider=provider_name,
            model=self.provider.model,
            usage=usage,
            latency_ms=latency_ms,
        )
        return ChatResponse(
            content=content,
            provider=provider_name,
            model=self.provider.model,
            usage=usage,
        )

    async def chat_stream(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        prompt = messages_to_prompt(request.messages)
        payload = messages_to_provider_payload(request.messages)
        started = time.perf_counter()

        try:
            async for delta in self.provider.generate_stream(
                prompt,
                model=request.model,
                messages=payload,
            ):
                yield delta
        except Exception as exc:
            logger.exception("AI provider stream error")
            raise AppException(
                ErrorCode.AI_PROVIDER_ERROR,
                str(exc),
            ) from exc
        finally:
            latency_ms = int((time.perf_counter() - started) * 1000)
            usage_data = await self.provider.token_usage()
            usage = TokenUsage(
                prompt_tokens=usage_data.get("prompt_tokens", 0),
                completion_tokens=usage_data.get("completion_tokens", 0),
                total_tokens=usage_data.get("total_tokens", 0),
            )
            await self._log_call(
                provider=_resolve_provider_name(self.provider),
                model=self.provider.model,
                usage=usage,
                latency_ms=latency_ms,
            )

    async def _log_call(
        self,
        *,
        provider: str,
        model: str,
        usage: TokenUsage,
        latency_ms: int,
    ) -> None:
        provider_key = provider if provider in {"openai", "groq", "anthropic", "mock"} else "mock"
        log_entry = AILog(
            user_id=self.user_id,
            provider=provider_key,
            model=model,
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            latency_ms=latency_ms,
        )
        self.db.add(log_entry)
        await self.db.flush()


def _resolve_provider_name(provider: AIProvider) -> str:
    name = provider.__class__.__name__.replace("Provider", "").lower()
    if name in {"openai", "groq", "anthropic", "mock"}:
        return name
    return "mock"
