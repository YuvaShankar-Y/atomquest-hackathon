from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import PaginationParams

AIProviderName = Literal["openai", "groq", "anthropic", "mock"]
ChatRole = Literal["system", "user", "assistant"]


class ChatMessage(BaseModel):
    role: ChatRole
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)
    model: str | None = None
    stream: bool = False


class TokenUsage(BaseModel):
    prompt_tokens: int = Field(ge=0, default=0)
    completion_tokens: int = Field(ge=0, default=0)
    total_tokens: int = Field(ge=0, default=0)


class ChatResponse(BaseModel):
    content: str
    provider: AIProviderName
    model: str
    usage: TokenUsage


class StreamChunk(BaseModel):
    delta: str = ""
    done: bool = False


class AILogRead(BaseModel):
    id: str
    provider: AIProviderName
    model: str
    prompt_tokens: int = Field(ge=0)
    completion_tokens: int = Field(ge=0)
    latency_ms: int = Field(ge=0)
    created_at: datetime

    model_config = {"from_attributes": True}


class AILogListParams(PaginationParams):
    provider: AIProviderName | None = None
