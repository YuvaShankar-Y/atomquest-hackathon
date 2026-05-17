from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.goal import GoalCreate, GoalRead

GoalSheetStatus = Literal["draft", "submitted", "approved", "rework"]

MAX_GOALS_PER_SHEET = 8
MIN_GOAL_WEIGHTAGE = Decimal("10")
TOTAL_GOAL_WEIGHTAGE = Decimal("100")


def validate_goal_weightages(
    goals: list[GoalCreate],
    *,
    require_total_weightage: bool,
) -> list[GoalCreate]:
    if len(goals) > MAX_GOALS_PER_SHEET:
        raise ValueError(f"A goal sheet can have at most {MAX_GOALS_PER_SHEET} goals")

    total_weightage = Decimal("0")
    for goal in goals:
        if goal.weightage < MIN_GOAL_WEIGHTAGE:
            raise ValueError(f"Each goal must have a weightage of at least {MIN_GOAL_WEIGHTAGE}%")
        total_weightage += goal.weightage

    if require_total_weightage and total_weightage != TOTAL_GOAL_WEIGHTAGE:
        raise ValueError(f"Total goal weightage must equal {TOTAL_GOAL_WEIGHTAGE}%")
    if not require_total_weightage and total_weightage > TOTAL_GOAL_WEIGHTAGE:
        raise ValueError(f"Total goal weightage cannot exceed {TOTAL_GOAL_WEIGHTAGE}%")

    return goals


class GoalSheetCreate(BaseModel):
    cycle_id: str


class GoalSheetUpdate(BaseModel):
    cycle_id: str | None = None
    goals: list[GoalCreate] = Field(default_factory=list, max_length=MAX_GOALS_PER_SHEET)

    @model_validator(mode="after")
    def validate_goals(self) -> "GoalSheetUpdate":
        if self.goals:
            validate_goal_weightages(self.goals, require_total_weightage=False)
        return self


class GoalSheetSubmit(BaseModel):
    @classmethod
    def validate_goals_for_submit(cls, goals: list[GoalCreate]) -> list[GoalCreate]:
        return validate_goal_weightages(goals, require_total_weightage=True)


class GoalSheetRead(BaseModel):
    id: str
    user_id: str
    cycle_id: str
    status: GoalSheetStatus
    submitted_at: datetime | None
    approved_at: datetime | None
    locked_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GoalSheetDetailRead(GoalSheetRead):
    goals: list[GoalRead] = Field(default_factory=list)


GoalSheetResponse = GoalSheetDetailRead


class SubmitResponse(BaseModel):
    id: str
    status: GoalSheetStatus
    submitted_at: datetime


class ApprovalActionResponse(BaseModel):
    id: str
    status: GoalSheetStatus
    approved_at: datetime | None = None
    locked_at: datetime | None = None
