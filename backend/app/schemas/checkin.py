from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

CheckInStatus = Literal["not_started", "on_track", "completed"]


class CheckInCreate(BaseModel):
    actual_value: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    status: CheckInStatus


class ManagerCommentCreate(BaseModel):
    manager_comment: str = Field(min_length=1, max_length=3000)


class CheckInRead(BaseModel):
    id: str
    goal_id: str
    quarter: int
    year: int
    actual_value: Decimal | None
    status: CheckInStatus
    manager_comment: str | None
    updated_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CheckInGoalRead(BaseModel):
    goal_id: str
    goal_sheet_id: str
    owner_id: str
    goal_title: str
    thrust_area: str
    uom_type: str
    direction: str | None
    target_value: Decimal | None
    target_date: date | None
    current_actual: Decimal | None
    quarter: int
    year: int
    checkin_status: CheckInStatus
    manager_comment: str | None
    progress_score: float | None
    is_shared: bool
    primary_owner_id: str | None
