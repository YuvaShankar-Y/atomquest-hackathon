import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from jose import ExpiredSignatureError, JWTError
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app import __version__
from app.api.router import api_router
from app.api.v1.ws import counter_broadcaster
from app.config import get_settings
from app.core.errors import ERROR_STATUS_MAP, ErrorCode
from app.core.exceptions import AppException
from app.core.middleware import RequestContextMiddleware
from app.db.session import engine
from app.schemas.common import ErrorDetail, ErrorResponse

settings = get_settings()

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Starting %s v%s [%s]", settings.app_name, __version__, settings.environment)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection pool ready")
    except Exception as exc:
        logger.warning("Database not reachable at startup: %s", exc)
    await counter_broadcaster.start()
    yield
    await counter_broadcaster.stop()
    await engine.dispose()
    logger.info("Database connection pool closed")


app = FastAPI(
    title=settings.app_name,
    version=__version__,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestContextMiddleware)
app.include_router(api_router)


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _error_response(
    request: Request,
    code: ErrorCode,
    message: str,
    details: dict | list | None = None,
) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorDetail(code=code.value, message=message, details=details),
        request_id=_request_id(request),
    )
    return JSONResponse(status_code=ERROR_STATUS_MAP[code], content=body.model_dump())


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return _error_response(request, exc.code, exc.message, exc.details)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return _error_response(
        request,
        ErrorCode.VALIDATION_ERROR,
        "Request validation failed",
        exc.errors(),
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    if exc.status_code == 404:
        return _error_response(request, ErrorCode.NOT_FOUND, "Route not found")
    return _error_response(request, ErrorCode.INTERNAL_ERROR, exc.detail or "HTTP error")


@app.exception_handler(JWTError)
async def jwt_exception_handler(request: Request, exc: JWTError) -> JSONResponse:
    if isinstance(exc, ExpiredSignatureError):
        return _error_response(request, ErrorCode.AUTH_TOKEN_EXPIRED, "Token has expired")
    return _error_response(request, ErrorCode.AUTH_TOKEN_INVALID, "Invalid token")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error", exc_info=exc, extra={"request_id": _request_id(request)})
    message = "Internal server error" if settings.is_production else str(exc)
    return _error_response(request, ErrorCode.INTERNAL_ERROR, message)
