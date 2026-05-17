from datetime import date

from fastapi import APIRouter, Request
from sqlalchemy import select

from app.api.helpers import ok
from app.core.deps import CurrentUser, DbSession
from app.core.errors import ErrorCode
from app.core.exceptions import AppException
from app.db.models import GoalCycle
from app.schemas.common import ApiResponse
from app.schemas.goal_cycle import GoalCyclePhase, GoalCycleRead

router = APIRouter(prefix="/cycles", tags=["cycles"])


async def get_active_cycle_record(db: DbSession) -> GoalCycle | None:
    today = date.today()

    current_result = await db.execute(
        select(GoalCycle)
        .where(
            GoalCycle.is_active.is_(True),
            GoalCycle.start_date <= today,
            GoalCycle.end_date >= today,
        )
        .order_by(GoalCycle.start_date.asc())
    )
    current_cycle = current_result.scalars().first()
    if current_cycle is not None:
        return current_cycle

    fallback_result = await db.execute(
        select(GoalCycle)
        .where(GoalCycle.is_active.is_(True))
        .order_by(GoalCycle.end_date.desc(), GoalCycle.start_date.desc())
    )
    return fallback_result.scalars().first()


async def is_goal_setting_open(db: DbSession) -> bool:
    today = date.today()
    result = await db.execute(
        select(GoalCycle.id).where(
            GoalCycle.phase == "goal_setting",
            GoalCycle.is_active.is_(True),
            GoalCycle.start_date <= today,
            GoalCycle.end_date >= today,
        )
    )
    return result.scalar_one_or_none() is not None


async def is_checkin_open(db: DbSession, quarter: GoalCyclePhase | str) -> bool:
    phase = quarter if str(quarter).endswith("_checkin") else f"{quarter}_checkin"
    today = date.today()
    result = await db.execute(
        select(GoalCycle.id).where(
            GoalCycle.phase == phase,
            GoalCycle.is_active.is_(True),
            GoalCycle.start_date <= today,
            GoalCycle.end_date >= today,
        )
    )
    return result.scalar_one_or_none() is not None


@router.get("", response_model=ApiResponse[list[GoalCycleRead]])
async def list_cycles(
    request: Request,
    db: DbSession,
    _user: CurrentUser,
) -> ApiResponse[list[GoalCycleRead]]:
    result = await db.execute(
        select(GoalCycle).order_by(GoalCycle.start_date.asc(), GoalCycle.end_date.asc())
    )
    cycles = result.scalars().all()
    return ok(request, [GoalCycleRead.model_validate(cycle) for cycle in cycles])


@router.get("/active", response_model=ApiResponse[GoalCycleRead])
async def get_active_cycle(
    request: Request,
    db: DbSession,
    _user: CurrentUser,
) -> ApiResponse[GoalCycleRead]:
    cycle = await get_active_cycle_record(db)
    if cycle is None:
        raise AppException(ErrorCode.NOT_FOUND, "No active cycle found")
    return ok(request, GoalCycleRead.model_validate(cycle))
