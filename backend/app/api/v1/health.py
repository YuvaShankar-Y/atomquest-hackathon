from fastapi import APIRouter, Request
from sqlalchemy import text

from app import __version__
from app.api.helpers import ok
from app.core.deps import DbSession
from app.schemas.common import ApiResponse, HealthData

router = APIRouter(tags=["health"])


@router.get("/health", response_model=ApiResponse[HealthData])
async def health_check(request: Request, db: DbSession) -> ApiResponse[HealthData]:
    try:
        await db.execute(text("SELECT 1"))
        data = HealthData(status="ok", version=__version__, db="connected")
    except Exception:
        data = HealthData(status="degraded", version=__version__, db="disconnected")

    return ok(request, data)
