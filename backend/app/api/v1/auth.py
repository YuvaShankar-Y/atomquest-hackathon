from fastapi import APIRouter, Request
from jose import ExpiredSignatureError, JWTError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.helpers import ok
from app.core.deps import CurrentUser, DbSession, user_to_auth
from app.core.errors import ErrorCode
from app.core.exceptions import AppException
from app.core.security import (
    TOKEN_TYPE_REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.models import User
from app.schemas.auth import (
    AuthUser,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
)
from app.schemas.common import ApiResponse, LogoutData

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=ApiResponse[AuthUser])
async def register(request: Request, body: RegisterRequest, db: DbSession) -> ApiResponse[AuthUser]:
    user = User(
        email=body.email.lower(),
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
    )
    db.add(user)
    try:
        await db.flush()
        await db.refresh(user)
    except IntegrityError as exc:
        raise AppException(ErrorCode.CONFLICT, "Email already registered") from exc

    return ok(request, user_to_auth(user))


@router.post("/login", response_model=ApiResponse[TokenPair])
async def login(request: Request, body: LoginRequest, db: DbSession) -> ApiResponse[TokenPair]:
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.hashed_password):
        raise AppException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Invalid email or password")
    if not user.is_active:
        raise AppException(ErrorCode.AUTH_FORBIDDEN, "User account is inactive")

    tokens = TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )
    return ok(request, tokens)


@router.post("/refresh", response_model=ApiResponse[TokenPair])
async def refresh_tokens(request: Request, body: RefreshRequest, db: DbSession) -> ApiResponse[TokenPair]:
    try:
        payload = decode_token(body.refresh_token)
    except ExpiredSignatureError as exc:
        raise AppException(ErrorCode.AUTH_TOKEN_EXPIRED, "Refresh token has expired") from exc
    except JWTError as exc:
        raise AppException(ErrorCode.AUTH_TOKEN_INVALID, "Invalid refresh token") from exc

    if payload.get("type") != TOKEN_TYPE_REFRESH:
        raise AppException(ErrorCode.AUTH_TOKEN_INVALID, "Invalid refresh token type")

    user_id = payload.get("sub")
    if not user_id:
        raise AppException(ErrorCode.AUTH_TOKEN_INVALID, "Invalid refresh token subject")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise AppException(ErrorCode.AUTH_TOKEN_INVALID, "User not found or inactive")

    tokens = TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )
    return ok(request, tokens)


@router.post("/logout", response_model=ApiResponse[LogoutData])
async def logout(request: Request, _user: CurrentUser) -> ApiResponse[LogoutData]:
    return ok(request, LogoutData())
