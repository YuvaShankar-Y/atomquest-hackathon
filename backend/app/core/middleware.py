import logging
import time
import uuid
from contextvars import ContextVar

from jose import JWTError
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.security import TOKEN_TYPE_ACCESS, decode_token

logger = logging.getLogger("app")
current_user_id_ctx: ContextVar[str | None] = ContextVar("current_user_id", default=None)


def get_current_user_id() -> str | None:
    return current_user_id_ctx.get()


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        user_id = _extract_user_id_from_request(request)
        request.state.current_user_id = user_id
        user_token = current_user_id_ctx.set(user_id)

        start = time.perf_counter()
        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start) * 1000

            response.headers["X-Request-ID"] = request_id
            logger.info(
                "%s %s %s %.2fms",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
                extra={"request_id": request_id},
            )
            return response
        finally:
            current_user_id_ctx.reset(user_token)


def _extract_user_id_from_request(request: Request) -> str | None:
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
    except JWTError:
        return None

    if payload.get("type") != TOKEN_TYPE_ACCESS:
        return None

    subject = payload.get("sub")
    return str(subject) if subject else None
