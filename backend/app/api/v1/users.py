from fastapi import APIRouter, Request

from app.api.helpers import ok
from app.core.deps import CurrentUser, user_to_auth
from app.schemas.auth import AuthUser
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=ApiResponse[AuthUser])
async def get_me(request: Request, user: CurrentUser) -> ApiResponse[AuthUser]:
    return ok(request, user_to_auth(user))
