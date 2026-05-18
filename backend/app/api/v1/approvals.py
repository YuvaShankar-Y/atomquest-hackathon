from datetime import datetime, timezone

from fastapi import APIRouter, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.helpers import ok
from app.core.deps import CurrentUser, DbSession, ManagerOrAdminUser
from app.core.errors import ErrorCode
from app.core.exceptions import AppException
from app.db.models import Goal, GoalSheet, User
from app.schemas.common import ApiResponse
from app.schemas.goal import ApprovalGoalEditRequest, GoalCreate, GoalRead
from app.schemas.goal_sheet import (
    ApprovalActionResponse,
    GoalSheetDetailRead,
    validate_goal_weightages,
)

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("/team/goal-sheets", response_model=ApiResponse[list[GoalSheetDetailRead]])
async def list_team_goal_sheets(
    request: Request,
    db: DbSession,
    user: ManagerOrAdminUser,
) -> ApiResponse[list[GoalSheetDetailRead]]:
    statement = (
        select(GoalSheet)
        .options(selectinload(GoalSheet.goals))
        .where(GoalSheet.status.in_(["submitted", "approved", "rework"]))
        .order_by(GoalSheet.updated_at.desc())
    )

    if user.role == "manager":
        reportee_ids_result = await db.execute(select(User.id).where(User.manager_id == user.id))
        reportee_ids = list(reportee_ids_result.scalars().all())
        if reportee_ids:
            statement = statement.where(GoalSheet.user_id.in_(reportee_ids))
        else:
            statement = statement.where(GoalSheet.user_id == "__no_team__")

    result = await db.execute(statement)
    sheets = result.scalars().all()
    return ok(request, [GoalSheetDetailRead.model_validate(sheet) for sheet in sheets])


@router.post("/goal-sheets/{sheet_id}/approve", response_model=ApiResponse[ApprovalActionResponse])
async def approve_goal_sheet(
    request: Request,
    sheet_id: str,
    db: DbSession,
    user: ManagerOrAdminUser,
) -> ApiResponse[ApprovalActionResponse]:
    sheet = await _get_actionable_sheet(db, user, sheet_id)
    if sheet.status != "submitted":
        raise AppException(ErrorCode.CONFLICT, "Only submitted goal sheets can be approved")

    now = datetime.now(timezone.utc)
    sheet.status = "approved"
    sheet.approved_at = now
    sheet.locked_at = now
    await db.flush()
    await db.refresh(sheet)

    return ok(
        request,
        ApprovalActionResponse(
            id=sheet.id,
            status=sheet.status,
            approved_at=sheet.approved_at,
            locked_at=sheet.locked_at,
        ),
    )


@router.post("/goal-sheets/{sheet_id}/rework", response_model=ApiResponse[ApprovalActionResponse])
async def return_goal_sheet_for_rework(
    request: Request,
    sheet_id: str,
    db: DbSession,
    user: ManagerOrAdminUser,
) -> ApiResponse[ApprovalActionResponse]:
    sheet = await _get_actionable_sheet(db, user, sheet_id)
    if sheet.status != "submitted":
        raise AppException(ErrorCode.CONFLICT, "Only submitted goal sheets can be returned for rework")

    sheet.status = "rework"
    sheet.approved_at = None
    sheet.locked_at = None
    await db.flush()
    await db.refresh(sheet)

    return ok(
        request,
        ApprovalActionResponse(
            id=sheet.id,
            status=sheet.status,
            approved_at=sheet.approved_at,
            locked_at=sheet.locked_at,
        ),
    )


@router.post("/goal-sheets/{sheet_id}/edit-goal/{goal_id}", response_model=ApiResponse[GoalRead])
async def manager_edit_goal_before_approval(
    request: Request,
    sheet_id: str,
    goal_id: str,
    body: ApprovalGoalEditRequest,
    db: DbSession,
    user: ManagerOrAdminUser,
) -> ApiResponse[GoalRead]:
    sheet = await _get_actionable_sheet(db, user, sheet_id)
    if sheet.status != "submitted":
        raise AppException(ErrorCode.CONFLICT, "Goals can only be edited while the sheet is submitted")

    goal = next((sheet_goal for sheet_goal in sheet.goals if sheet_goal.id == goal_id), None)
    if goal is None:
        raise AppException(ErrorCode.NOT_FOUND, "Goal not found")

    merged_payload = {**_goal_to_payload(goal)}
    if body.weightage is not None:
        merged_payload["weightage"] = body.weightage
    if body.target_value is not None:
        merged_payload["target_value"] = body.target_value
    if body.target_date is not None:
        merged_payload["target_date"] = body.target_date

    validated_goal = GoalCreate.model_validate(merged_payload)

    updated_goal_payloads: list[GoalCreate] = []
    for sibling_goal in sheet.goals:
        if sibling_goal.id == goal.id:
            updated_goal_payloads.append(validated_goal)
        else:
            updated_goal_payloads.append(GoalCreate.model_validate(_goal_to_payload(sibling_goal)))
    validate_goal_weightages(updated_goal_payloads, require_total_weightage=True)

    for field, value in validated_goal.model_dump().items():
        setattr(goal, field, value)

    await db.flush()
    await db.refresh(goal)
    return ok(request, GoalRead.model_validate(goal))


async def _get_actionable_sheet(db: DbSession, user: User, sheet_id: str) -> GoalSheet:
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

    owner_result = await db.execute(select(User).where(User.id == sheet.user_id))
    owner = owner_result.scalar_one_or_none()
    if owner is not None and owner.manager_id == user.id:
        return sheet

    raise AppException(ErrorCode.AUTH_FORBIDDEN, "You do not have permission to act on this goal sheet")


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
