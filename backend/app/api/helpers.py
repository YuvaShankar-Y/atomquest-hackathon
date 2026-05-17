from typing import TypeVar

from fastapi import Request

from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta

T = TypeVar("T")


def get_request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def ok(request: Request, data: T, message: str | None = None) -> ApiResponse[T]:
    return ApiResponse(data=data, message=message, request_id=get_request_id(request))


def paginated(
    request: Request,
    data: list[T],
    *,
    page: int,
    page_size: int,
    total: int,
) -> PaginatedResponse[T]:
    return PaginatedResponse(
        data=data,
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
        request_id=get_request_id(request),
    )
