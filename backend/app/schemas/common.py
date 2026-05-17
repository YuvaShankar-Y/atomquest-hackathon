import math
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, Field, computed_field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | list[Any] | None = None


class ErrorResponse(BaseModel):
    success: Literal[False] = False
    error: ErrorDetail
    request_id: str | None = None


class ApiResponse(BaseModel, Generic[T]):
    success: Literal[True] = True
    data: T
    message: str | None = None
    request_id: str | None = None


class PaginationMeta(BaseModel):
    page: int = Field(ge=1, default=1)
    page_size: int = Field(ge=1, le=100, default=20)
    total: int = Field(ge=0, default=0)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total_pages(self) -> int:
        if self.total == 0:
            return 0
        return math.ceil(self.total / self.page_size)


class PaginatedResponse(BaseModel, Generic[T]):
    success: Literal[True] = True
    data: list[T]
    meta: PaginationMeta
    request_id: str | None = None


class PaginationParams(BaseModel):
    page: int = Field(ge=1, default=1)
    page_size: int = Field(ge=1, le=100, default=20)


class HealthData(BaseModel):
    status: Literal["ok", "degraded", "error"]
    version: str
    db: Literal["connected", "disconnected", "unknown"]


class LogoutData(BaseModel):
    logged_out: bool = True


class DeleteData(BaseModel):
    deleted: bool = True
