import re
from datetime import date

from fastapi import APIRouter, Query, Request
from sqlalchemy import select

from app.api.helpers import ok
from app.core.deps import AdminUser, DbSession
from app.core.errors import ErrorCode
from app.core.exceptions import AppException
from app.db.models import AuditLog, CheckIn, Goal, GoalCycle, GoalSheet, User
from app.schemas.admin import AuditLogRead, CompletionDashboardRow
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/completion-dashboard", response_model=ApiResponse[list[CompletionDashboardRow]])
async def get_completion_dashboard(
    request: Request,
    db: DbSession,
    _user: AdminUser,
) -> ApiResponse[list[CompletionDashboardRow]]:
    period = await _get_current_checkin_period(db)
    if period is None:
        return ok(request, [])
    quarter, year = period

    employees_result = await db.execute(select(User).where(User.role == "employee", User.is_active.is_(True)))
    employees = employees_result.scalars().all()

    rows: list[CompletionDashboardRow] = []
    for employee in employees:
        manager = None
        if employee.manager_id:
            manager_result = await db.execute(select(User).where(User.id == employee.manager_id))
            manager = manager_result.scalar_one_or_none()

        goals_result = await db.execute(
            select(Goal)
            .join(GoalSheet, Goal.goal_sheet_id == GoalSheet.id)
            .where(GoalSheet.user_id == employee.id, GoalSheet.status == "approved")
        )
        goals = goals_result.scalars().all()
        goal_ids = [goal.id for goal in goals]

        checked_in_goals = 0
        if goal_ids:
            checkins_result = await db.execute(
                select(CheckIn.goal_id)
                .where(CheckIn.goal_id.in_(goal_ids), CheckIn.quarter == quarter, CheckIn.year == year)
                .distinct()
            )
            checked_in_goals = len(list(checkins_result.scalars().all()))

        total_goals = len(goals)
        pending_goals = max(total_goals - checked_in_goals, 0)
        rows.append(
            CompletionDashboardRow(
                employee_id=employee.id,
                employee_name=employee.full_name,
                manager_id=manager.id if manager else None,
                manager_name=manager.full_name if manager else None,
                quarter=quarter,
                year=year,
                total_goals=total_goals,
                checked_in_goals=checked_in_goals,
                pending_goals=pending_goals,
                is_complete=total_goals > 0 and pending_goals == 0,
            )
        )

    return ok(request, rows)


@router.post("/unlock-goal/{goal_sheet_id}", response_model=ApiResponse[dict[str, str]])
async def unlock_goal_sheet(
    request: Request,
    goal_sheet_id: str,
    db: DbSession,
    _user: AdminUser,
) -> ApiResponse[dict[str, str]]:
    result = await db.execute(select(GoalSheet).where(GoalSheet.id == goal_sheet_id))
    sheet = result.scalar_one_or_none()
    if sheet is None:
        raise AppException(ErrorCode.NOT_FOUND, "Goal sheet not found")
    if sheet.status != "approved":
        raise AppException(ErrorCode.CONFLICT, "Only approved goal sheets can be unlocked")

    sheet.status = "rework"
    sheet.locked_at = None
    sheet.approved_at = None
    await db.flush()
    return ok(request, {"goal_sheet_id": sheet.id, "status": sheet.status})


@router.get("/audit-logs", response_model=ApiResponse[list[AuditLogRead]])
async def list_audit_logs(
    request: Request,
    db: DbSession,
    _user: AdminUser,
    entity_type: str | None = Query(default=None),
) -> ApiResponse[list[AuditLogRead]]:
    statement = select(AuditLog).order_by(AuditLog.changed_at.desc())
    if entity_type:
        statement = statement.where(AuditLog.entity_type == entity_type)
    result = await db.execute(statement)
    logs = result.scalars().all()
    return ok(request, [AuditLogRead.model_validate(log) for log in logs])


async def _get_current_checkin_period(db: DbSession) -> tuple[int, int] | None:
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
        return None
    quarter_map = {"q1_checkin": 1, "q2_checkin": 2, "q3_checkin": 3, "q4_checkin": 4}
    quarter = quarter_map[cycle.phase]
    year_match = re.search(r"(20\d{2})", cycle.name)
    year = int(year_match.group(1)) if year_match else cycle.start_date.year
    return quarter, year
