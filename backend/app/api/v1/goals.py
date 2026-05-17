from datetime import datetime, timezone

from fastapi import APIRouter, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.helpers import ok
from app.core.deps import CurrentUser, DbSession, EmployeeOnlyUser
from app.core.errors import ErrorCode
from app.core.exceptions import AppException
from app.db.models import Goal, GoalCycle, GoalSheet, User
from app.schemas.common import ApiResponse
from app.schemas.goal import GoalCreate, GoalRead, GoalUpdate
from app.schemas.goal_sheet import (
    GoalSheetCreate,
    GoalSheetDetailRead,
    GoalSheetRead,
    GoalSheetSubmit,
    SubmitResponse,
    validate_goal_weightages,
)

router = APIRouter(tags=["goals"])


@router.post("/goal-sheets", response_model=ApiResponse[GoalSheetDetailRead], status_code=201)
async def create_goal_sheet(
    request: Request,
    body: GoalSheetCreate,
    db: DbSession,
    user: EmployeeOnlyUser,
) -> ApiResponse[GoalSheetDetailRead]:
    cycle = await _get_goal_setting_cycle(db, body.cycle_id)

    existing_result = await db.execute(
        select(GoalSheet).where(GoalSheet.user_id == user.id, GoalSheet.cycle_id == cycle.id)
    )
    existing_sheet = existing_result.scalar_one_or_none()
    if existing_sheet is not None:
        raise AppException(ErrorCode.CONFLICT, "A goal sheet already exists for this cycle")

    sheet = GoalSheet(user_id=user.id, cycle_id=cycle.id, status="draft")
    db.add(sheet)
    await db.flush()
    await db.refresh(sheet)
    return ok(request, await _build_sheet_detail(db, sheet.id))


@router.post("/goal-sheets/{sheet_id}/goals", response_model=ApiResponse[GoalSheetDetailRead], status_code=201)
async def add_goal_to_sheet(
    request: Request,
    sheet_id: str,
    body: GoalCreate,
    db: DbSession,
    user: EmployeeOnlyUser,
) -> ApiResponse[GoalSheetDetailRead]:
    sheet = await _get_editable_owned_sheet(db, user.id, sheet_id)

    current_goals = [GoalCreate.model_validate(_goal_to_payload(goal)) for goal in sheet.goals]
    updated_goals = [*current_goals, body]
    validate_goal_weightages(updated_goals, require_total_weightage=False)

    goal = Goal(goal_sheet_id=sheet.id, **body.model_dump())
    db.add(goal)
    await db.flush()
    return ok(request, await _build_sheet_detail(db, sheet.id))


@router.put("/goals/{goal_id}", response_model=ApiResponse[GoalRead])
async def update_goal(
    request: Request,
    goal_id: str,
    body: GoalUpdate,
    db: DbSession,
    user: EmployeeOnlyUser,
) -> ApiResponse[GoalRead]:
    goal = await _get_editable_owned_goal(db, user.id, goal_id)
    update_data = body.model_dump(exclude_unset=True)

    if goal.is_shared and goal.primary_owner_id != user.id:
        allowed_fields = {"weightage"}
        attempted_fields = set(update_data.keys())
        if not attempted_fields.issubset(allowed_fields):
            raise AppException(
                ErrorCode.AUTH_FORBIDDEN,
                "Recipients of shared goals can only adjust weightage",
            )

    merged_payload = {**_goal_to_payload(goal), **update_data}
    validated_goal = GoalCreate.model_validate(merged_payload)

    sibling_goals_result = await db.execute(
        select(Goal).where(Goal.goal_sheet_id == goal.goal_sheet_id).order_by(Goal.created_at.asc())
    )
    sibling_goals = sibling_goals_result.scalars().all()

    updated_goal_payloads: list[GoalCreate] = []
    for sibling_goal in sibling_goals:
        if sibling_goal.id == goal.id:
            updated_goal_payloads.append(validated_goal)
        else:
            updated_goal_payloads.append(GoalCreate.model_validate(_goal_to_payload(sibling_goal)))
    validate_goal_weightages(updated_goal_payloads, require_total_weightage=False)

    for field, value in validated_goal.model_dump().items():
        setattr(goal, field, value)

    await db.flush()
    await db.refresh(goal)
    return ok(request, GoalRead.model_validate(goal))


@router.post("/goal-sheets/{sheet_id}/submit", response_model=ApiResponse[SubmitResponse])
async def submit_goal_sheet(
    request: Request,
    sheet_id: str,
    db: DbSession,
    user: EmployeeOnlyUser,
) -> ApiResponse[SubmitResponse]:
    sheet = await _get_editable_owned_sheet(db, user.id, sheet_id)

    goals = [GoalCreate.model_validate(_goal_to_payload(goal)) for goal in sheet.goals]
    if not goals:
        raise AppException(ErrorCode.VALIDATION_ERROR, "Cannot submit an empty goal sheet")

    GoalSheetSubmit.validate_goals_for_submit(goals)

    submitted_at = datetime.now(timezone.utc)
    sheet.status = "submitted"
    sheet.submitted_at = submitted_at
    await db.flush()
    await db.refresh(sheet)

    return ok(
        request,
        SubmitResponse(
            id=sheet.id,
            status=sheet.status,
            submitted_at=sheet.submitted_at or submitted_at,
        ),
    )


@router.get("/goal-sheets", response_model=ApiResponse[list[GoalSheetRead]])
async def list_goal_sheets(
    request: Request,
    db: DbSession,
    user: CurrentUser,
) -> ApiResponse[list[GoalSheetRead]]:
    statement = select(GoalSheet).order_by(GoalSheet.created_at.desc())

    if user.role == "employee":
        statement = statement.where(GoalSheet.user_id == user.id)
    elif user.role == "manager":
        reportee_ids_result = await db.execute(select(User.id).where(User.manager_id == user.id))
        reportee_ids = list(reportee_ids_result.scalars().all())
        if reportee_ids:
            statement = statement.where(GoalSheet.user_id.in_(reportee_ids))
        else:
            statement = statement.where(GoalSheet.user_id == "__no_team__")

    result = await db.execute(statement)
    sheets = result.scalars().all()
    return ok(request, [GoalSheetRead.model_validate(sheet) for sheet in sheets])


@router.get("/goal-sheets/{sheet_id}", response_model=ApiResponse[GoalSheetDetailRead])
async def get_goal_sheet(
    request: Request,
    sheet_id: str,
    db: DbSession,
    user: CurrentUser,
) -> ApiResponse[GoalSheetDetailRead]:
    sheet = await _get_accessible_sheet(db, user, sheet_id)
    return ok(request, GoalSheetDetailRead.model_validate(sheet))


async def _get_goal_setting_cycle(db: DbSession, cycle_id: str) -> GoalCycle:
    result = await db.execute(select(GoalCycle).where(GoalCycle.id == cycle_id))
    cycle = result.scalar_one_or_none()
    if cycle is None:
        raise AppException(ErrorCode.NOT_FOUND, "Goal cycle not found")
    if cycle.phase != "goal_setting":
        raise AppException(ErrorCode.VALIDATION_ERROR, "Goal sheets can only be created for a goal setting cycle")
    if not cycle.is_active:
        raise AppException(ErrorCode.VALIDATION_ERROR, "Selected goal cycle is inactive")
    return cycle


async def _get_editable_owned_sheet(db: DbSession, user_id: str, sheet_id: str) -> GoalSheet:
    sheet = await _get_owned_sheet(db, user_id, sheet_id)
    if sheet.status not in {"draft", "rework"}:
        raise AppException(ErrorCode.CONFLICT, "Only draft or rework goal sheets can be edited")
    return sheet


async def _get_owned_sheet(db: DbSession, user_id: str, sheet_id: str) -> GoalSheet:
    result = await db.execute(
        select(GoalSheet)
        .options(selectinload(GoalSheet.goals))
        .where(GoalSheet.id == sheet_id, GoalSheet.user_id == user_id)
    )
    sheet = result.scalar_one_or_none()
    if sheet is None:
        raise AppException(ErrorCode.NOT_FOUND, "Goal sheet not found")
    return sheet


async def _get_editable_owned_goal(db: DbSession, user_id: str, goal_id: str) -> Goal:
    result = await db.execute(
        select(Goal)
        .join(GoalSheet, Goal.goal_sheet_id == GoalSheet.id)
        .where(Goal.id == goal_id, GoalSheet.user_id == user_id)
    )
    goal = result.scalar_one_or_none()
    if goal is None:
        raise AppException(ErrorCode.NOT_FOUND, "Goal not found")

    sheet_result = await db.execute(
        select(GoalSheet).where(GoalSheet.id == goal.goal_sheet_id, GoalSheet.user_id == user_id)
    )
    sheet = sheet_result.scalar_one_or_none()
    if sheet is None:
        raise AppException(ErrorCode.NOT_FOUND, "Goal sheet not found")
    if sheet.status not in {"draft", "rework"}:
        raise AppException(ErrorCode.CONFLICT, "Only draft or rework goals can be edited")

    return goal


async def _get_accessible_sheet(db: DbSession, user: User, sheet_id: str) -> GoalSheet:
    result = await db.execute(
        select(GoalSheet)
        .options(selectinload(GoalSheet.goals))
        .where(GoalSheet.id == sheet_id)
    )
    sheet = result.scalar_one_or_none()
    if sheet is None:
        raise AppException(ErrorCode.NOT_FOUND, "Goal sheet not found")

    if user.role == "admin":
        return sheet
    if user.role == "employee" and sheet.user_id == user.id:
        return sheet
    if user.role == "manager":
        owner_result = await db.execute(select(User).where(User.id == sheet.user_id))
        owner = owner_result.scalar_one_or_none()
        if owner is not None and owner.manager_id == user.id:
            return sheet

    raise AppException(ErrorCode.AUTH_FORBIDDEN, "You do not have permission to access this goal sheet")


async def _build_sheet_detail(db: DbSession, sheet_id: str) -> GoalSheetDetailRead:
    result = await db.execute(
        select(GoalSheet)
        .options(selectinload(GoalSheet.goals))
        .where(GoalSheet.id == sheet_id)
    )
    sheet = result.scalar_one_or_none()
    if sheet is None:
        raise AppException(ErrorCode.NOT_FOUND, "Goal sheet not found")
    return GoalSheetDetailRead.model_validate(sheet)


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
