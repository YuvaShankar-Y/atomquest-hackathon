import logging
from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from typing import Any

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


def _normalize_messages(
    prompt: str,
    messages: list[dict[str, str]] | None,
) -> list[dict[str, str]]:
    if messages:
        return messages
    return [{"role": "user", "content": prompt}]


class AIProvider(ABC):
    def __init__(self, default_model: str) -> None:
        self.default_model = default_model
        self._model = default_model
        self._usage: dict[str, int] = {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        }

    @property
    def model(self) -> str:
        return self._model

    @abstractmethod
    async def generate(self, prompt: str, **kwargs: Any) -> str:
        pass

    @abstractmethod
    async def generate_stream(self, prompt: str, **kwargs: Any) -> AsyncGenerator[str, None]:
        pass

    async def token_usage(self) -> dict[str, int]:
        return dict(self._usage)

    def _set_usage(self, prompt_tokens: int, completion_tokens: int) -> None:
        self._usage = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        }


class MockProvider(AIProvider):
    def __init__(self) -> None:
        super().__init__(default_model="mock")

    async def generate(self, prompt: str, **kwargs: Any) -> str:
        model = kwargs.get("model") or self.default_model
        self._model = model
        preview = prompt[:50]
        suffix = "..." if len(prompt) > 50 else ""
        content = f"Mock response: {preview}{suffix}"
        prompt_tokens = max(len(prompt.split()), 1)
        completion_tokens = max(len(content.split()), 1)
        self._set_usage(prompt_tokens, completion_tokens)
        return content

    async def generate_stream(self, prompt: str, **kwargs: Any) -> AsyncGenerator[str, None]:
        content = await self.generate(prompt, **kwargs)
        for word in content.split(" "):
            yield word + " "


class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str, default_model: str = "gpt-4o-mini") -> None:
        super().__init__(default_model=default_model)
        from openai import AsyncOpenAI

        self._client = AsyncOpenAI(api_key=api_key)

    async def generate(self, prompt: str, **kwargs: Any) -> str:
        from openai import APIError

        model = kwargs.get("model") or self.default_model
        messages = _normalize_messages(prompt, kwargs.get("messages"))
        self._model = model
        try:
            response = await self._client.chat.completions.create(
                model=model,
                messages=messages,
            )
        except APIError as exc:
            raise RuntimeError(f"OpenAI API error: {exc}") from exc

        choice = response.choices[0].message
        usage = response.usage
        prompt_tokens = usage.prompt_tokens if usage else 0
        completion_tokens = usage.completion_tokens if usage else 0
        self._set_usage(prompt_tokens, completion_tokens)
        return choice.content or ""

    async def generate_stream(self, prompt: str, **kwargs: Any) -> AsyncGenerator[str, None]:
        from openai import APIError

        model = kwargs.get("model") or self.default_model
        messages = _normalize_messages(prompt, kwargs.get("messages"))
        self._model = model
        prompt_tokens = 0
        completion_tokens = 0
        try:
            stream = await self._client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    completion_tokens += max(len(text.split()), 0)
                    yield text
        except APIError as exc:
            raise RuntimeError(f"OpenAI API error: {exc}") from exc

        prompt_tokens = max(len(prompt.split()), 1)
        self._set_usage(prompt_tokens, completion_tokens)


class GroqProvider(AIProvider):
    def __init__(self, api_key: str, default_model: str = "llama-3.3-70b-versatile") -> None:
        super().__init__(default_model=default_model)
        from groq import AsyncGroq

        self._client = AsyncGroq(api_key=api_key)

    async def generate(self, prompt: str, **kwargs: Any) -> str:
        from groq import APIError

        model = kwargs.get("model") or self.default_model
        messages = _normalize_messages(prompt, kwargs.get("messages"))
        self._model = model
        try:
            response = await self._client.chat.completions.create(
                model=model,
                messages=messages,
            )
        except APIError as exc:
            raise RuntimeError(f"Groq API error: {exc}") from exc

        choice = response.choices[0].message
        usage = response.usage
        prompt_tokens = usage.prompt_tokens if usage else 0
        completion_tokens = usage.completion_tokens if usage else 0
        self._set_usage(prompt_tokens, completion_tokens)
        return choice.content or ""

    async def generate_stream(self, prompt: str, **kwargs: Any) -> AsyncGenerator[str, None]:
        from groq import APIError

        model = kwargs.get("model") or self.default_model
        messages = _normalize_messages(prompt, kwargs.get("messages"))
        self._model = model
        completion_tokens = 0
        try:
            stream = await self._client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    completion_tokens += max(len(text.split()), 0)
                    yield text
        except APIError as exc:
            raise RuntimeError(f"Groq API error: {exc}") from exc

        self._set_usage(max(len(prompt.split()), 1), completion_tokens)


class AnthropicProvider(AIProvider):
    def __init__(self, api_key: str, default_model: str = "claude-3-5-haiku-latest") -> None:
        super().__init__(default_model=default_model)
        from anthropic import AsyncAnthropic

        self._client = AsyncAnthropic(api_key=api_key)

    def _anthropic_messages(self, messages: list[dict[str, str]]) -> tuple[str | None, list[dict[str, str]]]:
        system_parts: list[str] = []
        chat_messages: list[dict[str, str]] = []
        for message in messages:
            role = message["role"]
            content = message["content"]
            if role == "system":
                system_parts.append(content)
            elif role == "assistant":
                chat_messages.append({"role": "assistant", "content": content})
            else:
                chat_messages.append({"role": "user", "content": content})
        system = "\n".join(system_parts) if system_parts else None
        if not chat_messages:
            chat_messages = [{"role": "user", "content": "Hello"}]
        return system, chat_messages

    async def generate(self, prompt: str, **kwargs: Any) -> str:
        from anthropic import APIError

        model = kwargs.get("model") or self.default_model
        messages = _normalize_messages(prompt, kwargs.get("messages"))
        system, chat_messages = self._anthropic_messages(messages)
        self._model = model
        try:
            response = await self._client.messages.create(
                model=model,
                max_tokens=1024,
                system=system or "",
                messages=chat_messages,
            )
        except APIError as exc:
            raise RuntimeError(f"Anthropic API error: {exc}") from exc

        content = ""
        for block in response.content:
            if block.type == "text":
                content += block.text

        self._set_usage(response.usage.input_tokens, response.usage.output_tokens)
        return content

    async def generate_stream(self, prompt: str, **kwargs: Any) -> AsyncGenerator[str, None]:
        from anthropic import APIError

        model = kwargs.get("model") or self.default_model
        messages = _normalize_messages(prompt, kwargs.get("messages"))
        system, chat_messages = self._anthropic_messages(messages)
        self._model = model
        completion_tokens = 0
        try:
            async with self._client.messages.stream(
                model=model,
                max_tokens=1024,
                system=system or "",
                messages=chat_messages,
            ) as stream:
                async for text in stream.text_stream:
                    completion_tokens += max(len(text.split()), 0)
                    yield text
                final = await stream.get_final_message()
                self._set_usage(final.usage.input_tokens, final.usage.output_tokens)
        except APIError as exc:
            raise RuntimeError(f"Anthropic API error: {exc}") from exc


def get_ai_provider(settings: Settings | None = None) -> AIProvider:
    cfg = settings or get_settings()
    name = cfg.ai_provider

    if name == "openai":
        if cfg.openai_api_key:
            return OpenAIProvider(cfg.openai_api_key)
        logger.warning("OPENAI_API_KEY missing; using MockProvider")
        return MockProvider()

    if name == "groq":
        if cfg.groq_api_key:
            return GroqProvider(cfg.groq_api_key)
        logger.warning("GROQ_API_KEY missing; using MockProvider")
        return MockProvider()

    if name == "anthropic":
        if cfg.anthropic_api_key:
            return AnthropicProvider(cfg.anthropic_api_key)
        logger.warning("ANTHROPIC_API_KEY missing; using MockProvider")
        return MockProvider()

    return MockProvider()
