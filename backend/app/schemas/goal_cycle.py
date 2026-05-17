from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

GoalCyclePhase = Literal["goal_setting", "q1_checkin", "q2_checkin", "q3_checkin", "q4_checkin"]


class GoalCycleRead(BaseModel):
    id: str
    name: str
    phase: GoalCyclePhase
    start_date: date
    end_date: date
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
