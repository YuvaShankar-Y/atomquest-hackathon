import uuid
from datetime import date

from fastapi import APIRouter, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.helpers import ok
from app.core.deps import CurrentUser, DbSession, ManagerOrAdminUser
from app.core.errors import ErrorCode
from app.core.exceptions import AppException
from app.db.models import Goal, GoalCycle, GoalSheet, User
from app.schemas.common import ApiResponse
from app.schemas.goal import (
    GoalCreate,
    GoalRead,
    SharedGoalAchievementUpdateRequest,
    SharedGoalPushRequest,
    SharedGoalWeightageAdjustRequest,
)
from app.schemas.goal_sheet import GoalSheetDetailRead, validate_goal_weightages

router = APIRouter(prefix="/shared-goals", tags=["shared-goals"])


@router.post("/push", response_model=ApiResponse[list[GoalSheetDetailRead]], status_code=201)
async def push_shared_goal(
    request: Request,
    body: SharedGoalPushRequest,
    db: DbSession,
    user: ManagerOrAdminUser,
) -> ApiResponse[list[GoalSheetDetailRead]]:
    employee_ids = list(dict.fromkeys(body.employee_ids))
    if not employee_ids:
        raise AppException(ErrorCode.VALIDATION_ERROR, "At least one employee is required")

    employees_result = await db.execute(select(User).where(User.id.in_(employee_ids)))
    employees = employees_result.scalars().all()
    employees_by_id = {employee.id: employee for employee in employees}

    if len(employees_by_id) != len(employee_ids):
        raise AppException(ErrorCode.NOT_FOUND, "One or more employees were not found")

    for employee in employees:
        if employee.role != "employee":
            raise AppException(ErrorCode.VALIDATION_ERROR, "Shared goals can only be assigned to employees")
        if user.role == "manager" and employee.manager_id != user.id:
            raise AppException(
                ErrorCode.AUTH_FORBIDDEN,
                "Managers can only push shared goals to their direct reportees",
            )

    primary_owner_id = body.primary_owner_id or employee_ids[0]
    if primary_owner_id not in employees_by_id:
        raise AppException(ErrorCode.VALIDATION_ERROR, "Primary owner must be one of the selected employees")

    cycle = await _get_active_goal_setting_cycle(db)
    shared_group_id = str(uuid.uuid4())
    created_sheets: list[GoalSheetDetailRead] = []

    for employee_id in employee_ids:
        sheet = await _get_or_create_target_sheet(db, employee_id, cycle.id)
        current_goals = [GoalCreate.model_validate(_goal_to_payload(goal)) for goal in sheet.goals]
        shared_goal_payload = GoalCreate.model_validate(body.goal_data.model_dump())
        validate_goal_weightages([*current_goals, shared_goal_payload], require_total_weightage=False)

        db.add(
            Goal(
                goal_sheet_id=sheet.id,
                is_shared=True,
                shared_group_id=shared_group_id,
                primary_owner_id=primary_owner_id,
                **body.goal_data.model_dump(),
            )
        )
        await db.flush()
        created_sheets.append(await _build_sheet_detail(db, sheet.id))

    return ok(request, created_sheets)


@router.get("", response_model=ApiResponse[list[GoalRead]])
async def list_received_shared_goals(
    request: Request,
    db: DbSession,
    user: CurrentUser,
) -> ApiResponse[list[GoalRead]]:
    result = await db.execute(
        select(Goal)
        .join(GoalSheet, Goal.goal_sheet_id == GoalSheet.id)
        .where(GoalSheet.user_id == user.id, Goal.is_shared.is_(True))
        .order_by(Goal.created_at.desc())
    )
    goals = result.scalars().all()
    return ok(request, [GoalRead.model_validate(goal) for goal in goals])


@router.post("/{goal_id}/adjust-weightage", response_model=ApiResponse[GoalRead])
async def adjust_shared_goal_weightage(
    request: Request,
    goal_id: str,
    body: SharedGoalWeightageAdjustRequest,
    db: DbSession,
    user: CurrentUser,
) -> ApiResponse[GoalRead]:
    goal = await _get_owned_shared_goal(db, user.id, goal_id)
    sheet = await _get_goal_sheet_with_goals(db, goal.goal_sheet_id)

    if sheet.status not in {"draft", "rework"}:
        raise AppException(ErrorCode.CONFLICT, "Shared goal weightage can only be adjusted before approval")

    updated_goal_payloads: list[GoalCreate] = []
    for sibling_goal in sheet.goals:
        payload = _goal_to_payload(sibling_goal)
        if sibling_goal.id == goal.id:
            payload["weightage"] = body.weightage
        updated_goal_payloads.append(GoalCreate.model_validate(payload))
    validate_goal_weightages(updated_goal_payloads, require_total_weightage=False)

    goal.weightage = body.weightage
    await db.flush()
    await db.refresh(goal)
    return ok(request, GoalRead.model_validate(goal))


@router.post("/{goal_id}/update-achievement", response_model=ApiResponse[list[GoalRead]])
async def update_shared_goal_achievement(
    request: Request,
    goal_id: str,
    body: SharedGoalAchievementUpdateRequest,
    db: DbSession,
    user: CurrentUser,
) -> ApiResponse[list[GoalRead]]:
    result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.is_shared.is_(True)))
    goal = result.scalar_one_or_none()
    if goal is None:
        raise AppException(ErrorCode.NOT_FOUND, "Shared goal not found")
    if not goal.shared_group_id:
        raise AppException(ErrorCode.CONFLICT, "Shared goal group is invalid")
    if user.role != "admin" and goal.primary_owner_id != user.id:
        raise AppException(ErrorCode.AUTH_FORBIDDEN, "Only the primary owner can update shared goal achievement")

    linked_goals_result = await db.execute(
        select(Goal).where(Goal.shared_group_id == goal.shared_group_id).order_by(Goal.created_at.asc())
    )
    linked_goals = linked_goals_result.scalars().all()
    for linked_goal in linked_goals:
        linked_goal.actual_value = body.actual_value

    await db.flush()
    return ok(request, [GoalRead.model_validate(linked_goal) for linked_goal in linked_goals])


async def _get_active_goal_setting_cycle(db: DbSession) -> GoalCycle:
    today = date.today()
    result = await db.execute(
        select(GoalCycle)
        .where(
            GoalCycle.phase == "goal_setting",
            GoalCycle.is_active.is_(True),
            GoalCycle.start_date <= today,
            GoalCycle.end_date >= today,
        )
        .order_by(GoalCycle.start_date.asc())
    )
    cycle = result.scalars().first()
    if cycle is not None:
        return cycle

    fallback_result = await db.execute(
        select(GoalCycle)
        .where(GoalCycle.phase == "goal_setting", GoalCycle.is_active.is_(True))
        .order_by(GoalCycle.end_date.desc(), GoalCycle.start_date.desc())
    )
    fallback_cycle = fallback_result.scalars().first()
    if fallback_cycle is None:
        raise AppException(ErrorCode.CONFLICT, "No active goal setting cycle is available")
    return fallback_cycle


async def _get_or_create_target_sheet(db: DbSession, user_id: str, cycle_id: str) -> GoalSheet:
    result = await db.execute(
        select(GoalSheet)
        .options(selectinload(GoalSheet.goals))
        .where(GoalSheet.user_id == user_id, GoalSheet.cycle_id == cycle_id)
    )
    sheet = result.scalar_one_or_none()
    if sheet is None:
        sheet = GoalSheet(user_id=user_id, cycle_id=cycle_id, status="draft")
        db.add(sheet)
        await db.flush()
        await db.refresh(sheet)
        return await _get_goal_sheet_with_goals(db, sheet.id)

    if sheet.status not in {"draft", "rework"}:
        raise AppException(
            ErrorCode.CONFLICT,
            "Shared goals can only be pushed to draft or rework goal sheets",
        )
    return sheet


async def _build_sheet_detail(db: DbSession, sheet_id: str) -> GoalSheetDetailRead:
    sheet = await _get_goal_sheet_with_goals(db, sheet_id)
    return GoalSheetDetailRead.model_validate(sheet)


async def _get_goal_sheet_with_goals(db: DbSession, sheet_id: str) -> GoalSheet:
    result = await db.execute(
        select(GoalSheet)
        .options(selectinload(GoalSheet.goals))
        .where(GoalSheet.id == sheet_id)
    )
    sheet = result.scalar_one_or_none()
    if sheet is None:
        raise AppException(ErrorCode.NOT_FOUND, "Goal sheet not found")
    return sheet


async def _get_owned_shared_goal(db: DbSession, user_id: str, goal_id: str) -> Goal:
    result = await db.execute(
        select(Goal)
        .join(GoalSheet, Goal.goal_sheet_id == GoalSheet.id)
        .where(Goal.id == goal_id, Goal.is_shared.is_(True), GoalSheet.user_id == user_id)
    )
    goal = result.scalar_one_or_none()
    if goal is None:
        raise AppException(ErrorCode.NOT_FOUND, "Shared goal not found")
    return goal


def _goal_to_payload(goal: Goal) -> dict:
    return {
        "thrust_area": goal.thrust_area,
        "title": goal.title,
        "description": goal.description,
        "uom_type": goal.uom_type,
        "direction": goal.direction,
        "target_value": goal.target_value,
        "target_date": goal.target_date,
        "weightage": goal.weightage,
    }
