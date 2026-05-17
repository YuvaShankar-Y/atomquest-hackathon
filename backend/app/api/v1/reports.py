import csv
import io
import re
from datetime import date
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.core.deps import AdminUser, DbSession
from app.core.errors import ErrorCode
from app.core.exceptions import AppException
from app.db.models import CheckIn, Goal, GoalCycle, GoalSheet, User

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/achievement/export")
async def export_achievement_report(
    db: DbSession,
    _user: AdminUser,
) -> StreamingResponse:
    quarter, year = await _get_current_checkin_period(db)

    result = await db.execute(
        select(CheckIn, Goal, GoalSheet, User)
        .join(Goal, CheckIn.goal_id == Goal.id)
        .join(GoalSheet, Goal.goal_sheet_id == GoalSheet.id)
        .join(User, GoalSheet.user_id == User.id)
        .where(CheckIn.quarter == quarter, CheckIn.year == year)
        .order_by(User.full_name.asc(), Goal.title.asc(), CheckIn.created_at.desc())
    )
    rows = result.all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Employee", "Goal", "Planned Target", "Actual Achievement", "Quarter", "Progress %"])

    for checkin, goal, _sheet, user in rows:
        writer.writerow(
            [
                user.full_name,
                goal.title,
                _format_planned_target(goal),
                _format_decimal(checkin.actual_value),
                f"Q{checkin.quarter} {checkin.year}",
                _format_progress(_calculate_progress_score(goal, checkin.actual_value, checkin.status, checkin.updated_at.date())),
            ]
        )

    buffer.seek(0)
    filename = f"achievement-report-q{quarter}-{year}.csv"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(iter([buffer.getvalue()]), media_type="text/csv", headers=headers)


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
    quarter_map = {"q1_checkin": 1, "q2_checkin": 2, "q3_checkin": 3, "q4_checkin": 4}
    quarter = quarter_map[cycle.phase]
    year_match = re.search(r"(20\d{2})", cycle.name)
    year = int(year_match.group(1)) if year_match else cycle.start_date.year
    return quarter, year


def _format_planned_target(goal: Goal) -> str:
    if goal.uom_type == "timeline":
        return goal.target_date.isoformat() if goal.target_date else ""
    return _format_decimal(goal.target_value)


def _format_decimal(value: Decimal | None) -> str:
    if value is None:
        return ""
    return str(value)


def _format_progress(value: float | None) -> str:
    if value is None:
        return ""
    return f"{value:.2f}"


def _calculate_progress_score(goal: Goal, actual_value: Decimal | None, status: str, completed_on: date | None) -> float | None:
    if actual_value is None and goal.uom_type != "timeline":
        return None
    try:
        if goal.uom_type in {"numeric", "percentage"}:
            if goal.direction == "min":
                if goal.target_value in (None, Decimal("0")) or actual_value is None:
                    return None
                return round(float((actual_value / goal.target_value) * Decimal("100")), 2)
            if goal.direction == "max":
                if goal.target_value is None:
                    return None
                if actual_value in (None, Decimal("0")):
                    return 100.0
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
