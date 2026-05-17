from fastapi import APIRouter

from app.api.v1 import admin, ai, approvals, auth, checkins, cycles, goals, health, items, reports, shared_goals, users, ws
from app.config import get_settings

settings = get_settings()

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router, prefix=settings.api_v1_prefix)
api_router.include_router(users.router, prefix=settings.api_v1_prefix)
api_router.include_router(admin.router, prefix=settings.api_v1_prefix)
api_router.include_router(cycles.router, prefix=settings.api_v1_prefix)
api_router.include_router(goals.router, prefix=settings.api_v1_prefix)
api_router.include_router(approvals.router, prefix=settings.api_v1_prefix)
api_router.include_router(checkins.router, prefix=settings.api_v1_prefix)
api_router.include_router(reports.router, prefix=settings.api_v1_prefix)
api_router.include_router(shared_goals.router, prefix=settings.api_v1_prefix)
api_router.include_router(items.router, prefix=settings.api_v1_prefix)
api_router.include_router(ai.router, prefix=settings.api_v1_prefix)
api_router.include_router(ws.router, prefix=settings.api_v1_prefix)
