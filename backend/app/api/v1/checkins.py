from datetime import date
from decimal import Decimal, InvalidOperation
import re

from fastapi import APIRouter, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.helpers import ok
from app.core.deps import CurrentUser, DbSession, EmployeeOnlyUser, ManagerOrAdminUser
from app.core.errors import ErrorCode
from app.core.exceptions import AppException
from app.db.models import CheckIn, Goal, GoalCycle, GoalSheet, User
from app.schemas.checkin import CheckInCreate, CheckInGoalRead, CheckInRead, ManagerCommentCreate
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/checkins", tags=["checkins"])


@router.get("/my-goals", response_model=ApiResponse[list[CheckInGoalRead]])
async def list_my_goals_for_checkin(
    request: Request,
    db: DbSession,
    user: EmployeeOnlyUser,
) -> ApiResponse[list[CheckInGoalRead]]:
    quarter, year = await _get_current_checkin_period(db)
    result = await db.execute(
        select(Goal)
        .options(selectinload(Goal.goal_sheet), selectinload(Goal.check_ins))
        .join(GoalSheet, Goal.goal_sheet_id == GoalSheet.id)
        .where(GoalSheet.user_id == user.id, GoalSheet.status == "approved")
        .order_by(Goal.created_at.asc())
    )
    goals = result.scalars().all()
    return ok(request, [_build_checkin_goal_read(goal, goal.goal_sheet.user_id, quarter, year) for goal in goals])


@router.post("/{goal_id}", response_model=ApiResponse[CheckInRead], status_code=201)
async def log_goal_achievement(
    request: Request,
    goal_id: str,
    body: CheckInCreate,
    db: DbSession,
    user: EmployeeOnlyUser,
) -> ApiResponse[CheckInRead]:
    goal = await _get_owned_goal_for_checkin(db, user.id, goal_id)
    quarter, year = await _get_current_checkin_period(db)

    if goal.is_shared and goal.primary_owner_id != user.id:
        raise AppException(
            ErrorCode.AUTH_FORBIDDEN,
            "Only the primary owner can update achievement for a shared goal",
        )

    checkin = CheckIn(
        goal_id=goal.id,
        quarter=quarter,
        year=year,
        actual_value=body.actual_value,
        status=body.status,
        updated_by=user.id,
    )
    db.add(checkin)

    await _apply_goal_actual_update(db, goal, body.actual_value)
    await db.flush()
    await db.refresh(checkin)
    return ok(request, CheckInRead.model_validate(checkin))


@router.get("/team", response_model=ApiResponse[list[CheckInGoalRead]])
async def list_team_goals_for_checkin(
    request: Request,
    db: DbSession,
    user: ManagerOrAdminUser,
) -> ApiResponse[list[CheckInGoalRead]]:
    quarter, year = await _get_current_checkin_period(db)
    statement = (
        select(Goal)
        .options(selectinload(Goal.goal_sheet), selectinload(Goal.check_ins))
        .join(GoalSheet, Goal.goal_sheet_id == GoalSheet.id)
        .where(GoalSheet.status == "approved")
        .order_by(Goal.updated_at.desc())
    )

    if user.role == "manager":
        reportee_ids_result = await db.execute(select(User.id).where(User.manager_id == user.id))
        reportee_ids = list(reportee_ids_result.scalars().all())
        if reportee_ids:
            statement = statement.where(GoalSheet.user_id.in_(reportee_ids))
        else:
            statement = statement.where(GoalSheet.user_id == "__no_team__")

    result = await db.execute(statement)
    goals = result.scalars().all()
    return ok(
        request,
        [_build_checkin_goal_read(goal, goal.goal_sheet.user_id, quarter, year) for goal in goals],
    )


@router.post("/{goal_id}/manager-comment", response_model=ApiResponse[CheckInRead])
async def add_manager_comment(
    request: Request,
    goal_id: str,
    body: ManagerCommentCreate,
    db: DbSession,
    user: ManagerOrAdminUser,
) -> ApiResponse[CheckInRead]:
    goal = await _get_goal_for_manager_comment(db, user, goal_id)
    quarter, year = await _get_current_checkin_period(db)

    result = await db.execute(
        select(CheckIn)
        .where(CheckIn.goal_id == goal.id, CheckIn.quarter == quarter, CheckIn.year == year)
        .order_by(CheckIn.created_at.desc())
    )
    checkin = result.scalars().first()
    if checkin is None:
        checkin = CheckIn(
            goal_id=goal.id,
            quarter=quarter,
            year=year,
            actual_value=goal.actual_value,
            status="not_started",
            updated_by=user.id,
        )
        db.add(checkin)
        await db.flush()

    checkin.manager_comment = body.manager_comment
    checkin.updated_by = user.id
    await db.flush()
    await db.refresh(checkin)
    return ok(request, CheckInRead.model_validate(checkin))


async def _get_current_checkin_period(db: DbSession) -> tuple[int, int]:
    today = date.today()
    result = await db.execute(
        select(GoalCycle)
        .where(
            GoalCycle.phase.in_(["q1_checkin", "q2_checkin", "q3_checkin", "q4_checkin"]),
            GoalCycle.is_active.is_(True),
            GoalCycle.start_date <= today,
            GoalCycle.end_date >= today,
        )
        .order_by(GoalCycle.start_date.asc())
    )
    cycle = result.scalars().first()
    if cycle is None:
        fallback = await db.execute(
            select(GoalCycle)
            .where(
                GoalCycle.phase.in_(["q1_checkin", "q2_checkin", "q3_checkin", "q4_checkin"]),
                GoalCycle.is_active.is_(True),
            )
            .order_by(GoalCycle.end_date.desc(), GoalCycle.start_date.desc())
        )
        cycle = fallback.scalars().first()
    if cycle is None:
        raise AppException(ErrorCode.CONFLICT, "No active check-in cycle is available")
    return _extract_cycle_period(cycle)


def _extract_cycle_period(cycle: GoalCycle) -> tuple[int, int]:
    quarter_map = {
        "q1_checkin": 1,
        "q2_checkin": 2,
        "q3_checkin": 3,
        "q4_checkin": 4,
    }
    quarter = quarter_map.get(cycle.phase)
    if quarter is None:
        raise AppException(ErrorCode.CONFLICT, "Cycle is not a valid check-in phase")

    year_match = re.search(r"(20\d{2})", cycle.name)
    year = int(year_match.group(1)) if year_match else cycle.start_date.year
    return quarter, year


async def _get_owned_goal_for_checkin(db: DbSession, user_id: str, goal_id: str) -> Goal:
    result = await db.execute(
        select(Goal)
        .options(selectinload(Goal.goal_sheet), selectinload(Goal.check_ins))
        .join(GoalSheet, Goal.goal_sheet_id == GoalSheet.id)
        .where(Goal.id == goal_id, GoalSheet.user_id == user_id, GoalSheet.status == "approved")
    )
    goal = result.scalar_one_or_none()
    if goal is None:
        raise AppException(ErrorCode.NOT_FOUND, "Goal not found for check-in")
    return goal


async def _get_goal_for_manager_comment(db: DbSession, user: User, goal_id: str) -> Goal:
    result = await db.execute(
        select(Goal)
        .options(selectinload(Goal.goal_sheet), selectinload(Goal.check_ins))
        .join(GoalSheet, Goal.goal_sheet_id == GoalSheet.id)
        .where(Goal.id == goal_id, GoalSheet.status == "approved")
    )
    goal = result.scalar_one_or_none()
    if goal is None:
        raise AppException(ErrorCode.NOT_FOUND, "Goal not found")
    if user.role == "admin":
        return goal

    owner_result = await db.execute(select(User).where(User.id == goal.goal_sheet.user_id))
    owner = owner_result.scalar_one_or_none()
    if owner is not None and owner.manager_id == user.id:
        return goal
    raise AppException(ErrorCode.AUTH_FORBIDDEN, "You do not have permission to comment on this goal")


async def _apply_goal_actual_update(db: DbSession, goal: Goal, actual_value: Decimal | None) -> None:
    if goal.is_shared and goal.shared_group_id:
        result = await db.execute(select(Goal).where(Goal.shared_group_id == goal.shared_group_id))
        linked_goals = result.scalars().all()
        for linked_goal in linked_goals:
            linked_goal.actual_value = actual_value
    else:
        goal.actual_value = actual_value


def _build_checkin_goal_read(goal: Goal, owner_id: str, quarter: int, year: int) -> CheckInGoalRead:
    checkin = _latest_checkin_for_period(goal, quarter, year)
    current_actual = checkin.actual_value if checkin is not None else goal.actual_value
    status = checkin.status if checkin is not None else "not_started"
    manager_comment = checkin.manager_comment if checkin is not None else None
    progress_score = _calculate_progress_score(
        goal=goal,
        actual_value=current_actual,
        status=status,
        completed_on=checkin.updated_at.date() if checkin is not None and status == "completed" else None,
    )
    return CheckInGoalRead(
        goal_id=goal.id,
        goal_sheet_id=goal.goal_sheet_id,
        owner_id=owner_id,
        goal_title=goal.title,
        thrust_area=goal.thrust_area,
        uom_type=goal.uom_type,
        direction=goal.direction,
        target_value=goal.target_value,
        target_date=goal.target_date,
        current_actual=current_actual,
        quarter=quarter,
        year=year,
        checkin_status=status,
        manager_comment=manager_comment,
        progress_score=progress_score,
        is_shared=goal.is_shared,
        primary_owner_id=goal.primary_owner_id,
    )


def _latest_checkin_for_period(goal: Goal, quarter: int, year: int) -> CheckIn | None:
    matching = [checkin for checkin in goal.check_ins if checkin.quarter == quarter and checkin.year == year]
    if not matching:
        return None
    return max(matching, key=lambda item: item.created_at)


def _calculate_progress_score(
    *,
    goal: Goal,
    actual_value: Decimal | None,
    status: str,
    completed_on: date | None,
) -> float | None:
    if actual_value is None and goal.uom_type != "timeline":
        return None

    try:
        if goal.uom_type in {"numeric", "percentage"}:
            if goal.target_value in (None, Decimal("0")) and goal.direction == "min":
                return None
            if goal.direction == "min":
                if goal.target_value is None:
                    return None
                return round(float((actual_value / goal.target_value) * Decimal("100")), 2)
            if goal.direction == "max":
                if actual_value in (None, Decimal("0")):
                    return 100.0
                if goal.target_value is None:
                    return None
                return round(float((goal.target_value / actual_value) * Decimal("100")), 2)

        if goal.uom_type == "timeline":
            if goal.target_date is None:
                return None
            if status == "completed" and completed_on is not None:
                return 100.0 if completed_on <= goal.target_date else 0.0
            return 0.0

        if goal.uom_type == "zero":
            return 100.0 if actual_value == Decimal("0") else 0.0
    except (InvalidOperation, ZeroDivisionError):
        return None

    return None
