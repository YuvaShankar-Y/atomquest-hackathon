from typing import Annotated

from fastapi import Depends, Request
from jose import ExpiredSignatureError, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ErrorCode
from app.core.exceptions import AppException
from app.core.security import TOKEN_TYPE_ACCESS, decode_token
from app.db.models import User
from app.db.session import get_db
from app.schemas.auth import AuthUser

DbSession = Annotated[AsyncSession, Depends(get_db)]


def get_request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


async def get_current_user(db: DbSession, request: Request) -> User:
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise AppException(ErrorCode.AUTH_TOKEN_INVALID, "Missing or invalid authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
    except ExpiredSignatureError as exc:
        raise AppException(ErrorCode.AUTH_TOKEN_EXPIRED, "Token has expired") from exc
    except JWTError as exc:
        raise AppException(ErrorCode.AUTH_TOKEN_INVALID, "Invalid token") from exc

    if payload.get("type") != TOKEN_TYPE_ACCESS:
        raise AppException(ErrorCode.AUTH_TOKEN_INVALID, "Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise AppException(ErrorCode.AUTH_TOKEN_INVALID, "Invalid token subject")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise AppException(ErrorCode.AUTH_TOKEN_INVALID, "User not found")
    if not user.is_active:
        raise AppException(ErrorCode.AUTH_FORBIDDEN, "User account is inactive")

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: str):
    async def dependency(user: CurrentUser) -> User:
        if user.role not in roles:
            raise AppException(
                ErrorCode.AUTH_FORBIDDEN,
                "You do not have permission to access this resource",
            )
        return user

    return dependency


EmployeeUser = Annotated[User, Depends(require_roles("employee", "manager", "admin"))]
ManagerUser = Annotated[User, Depends(require_roles("manager", "admin"))]
AdminUser = Annotated[User, Depends(require_roles("admin"))]
EmployeeOnlyUser = Annotated[User, Depends(require_roles("employee"))]
ManagerOrAdminUser = Annotated[User, Depends(require_roles("manager", "admin"))]


async def get_optional_user(db: DbSession, request: Request) -> User | None:
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
    except ExpiredSignatureError as exc:
        raise AppException(ErrorCode.AUTH_TOKEN_EXPIRED, "Token has expired") from exc
    except JWTError as exc:
        raise AppException(ErrorCode.AUTH_TOKEN_INVALID, "Invalid token") from exc

    if payload.get("type") != TOKEN_TYPE_ACCESS:
        raise AppException(ErrorCode.AUTH_TOKEN_INVALID, "Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise AppException(ErrorCode.AUTH_TOKEN_INVALID, "Invalid token subject")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise AppException(ErrorCode.AUTH_TOKEN_INVALID, "User not found")
    if not user.is_active:
        raise AppException(ErrorCode.AUTH_FORBIDDEN, "User account is inactive")

    return user


OptionalUser = Annotated[User | None, Depends(get_optional_user)]


def user_to_auth(user: User) -> AuthUser:
    return AuthUser.model_validate(user)
