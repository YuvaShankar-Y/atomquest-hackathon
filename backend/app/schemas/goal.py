from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator

GoalUomType = Literal["numeric", "percentage", "timeline", "zero"]
GoalDirection = Literal["min", "max"]


class GoalBase(BaseModel):
    thrust_area: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    uom_type: GoalUomType
    direction: GoalDirection | None = None
    target_value: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    target_date: date | None = None
    weightage: Decimal = Field(ge=10, le=100, max_digits=5, decimal_places=2)

    @model_validator(mode="after")
    def validate_uom_fields(self) -> "GoalBase":
        if self.uom_type in {"numeric", "percentage"}:
            if self.target_value is None:
                raise ValueError("target_value is required for numeric and percentage goals")
            if self.direction is None:
                raise ValueError("direction is required for numeric and percentage goals")
            if self.target_date is not None:
                raise ValueError("target_date is not allowed for numeric and percentage goals")

        if self.uom_type == "timeline":
            if self.target_date is None:
                raise ValueError("target_date is required for timeline goals")
            if self.direction is not None:
                raise ValueError("direction is not allowed for timeline goals")

        if self.uom_type == "zero":
            if self.direction is not None:
                raise ValueError("direction is not allowed for zero-based goals")
            if self.target_date is not None:
                raise ValueError("target_date is not allowed for zero-based goals")

        return self


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    thrust_area: str | None = Field(default=None, min_length=1, max_length=120)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    uom_type: GoalUomType | None = None
    direction: GoalDirection | None = None
    target_value: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    target_date: date | None = None
    weightage: Decimal | None = Field(default=None, ge=10, le=100, max_digits=5, decimal_places=2)


class GoalRead(GoalBase):
    id: str
    goal_sheet_id: str
    actual_value: Decimal | None = None
    is_shared: bool = False
    shared_group_id: str | None = None
    primary_owner_id: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


GoalResponse = GoalRead


class ApprovalGoalEditRequest(BaseModel):
    target_value: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    target_date: date | None = None
    weightage: Decimal | None = Field(default=None, ge=10, le=100, max_digits=5, decimal_places=2)


class SharedGoalData(BaseModel):
    thrust_area: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    uom_type: GoalUomType
    direction: GoalDirection | None = None
    target_value: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    target_date: date | None = None
    weightage: Decimal = Field(ge=10, le=100, max_digits=5, decimal_places=2)

    @model_validator(mode="after")
    def validate_shared_goal_fields(self) -> "SharedGoalData":
        if self.uom_type in {"numeric", "percentage"}:
            if self.target_value is None:
                raise ValueError("target_value is required for numeric and percentage shared goals")
            if self.direction is None:
                raise ValueError("direction is required for numeric and percentage shared goals")
            if self.target_date is not None:
                raise ValueError("target_date is not allowed for numeric and percentage shared goals")

        if self.uom_type == "timeline":
            if self.target_date is None:
                raise ValueError("target_date is required for timeline shared goals")
            if self.direction is not None:
                raise ValueError("direction is not allowed for timeline shared goals")

        if self.uom_type == "zero":
            if self.direction is not None:
                raise ValueError("direction is not allowed for zero-based shared goals")
            if self.target_date is not None:
                raise ValueError("target_date is not allowed for zero-based shared goals")

        return self


class SharedGoalPushRequest(BaseModel):
    goal_data: SharedGoalData
    employee_ids: list[str] = Field(min_length=1)
    primary_owner_id: str | None = None


class SharedGoalWeightageAdjustRequest(BaseModel):
    weightage: Decimal = Field(ge=10, le=100, max_digits=5, decimal_places=2)


class SharedGoalAchievementUpdateRequest(BaseModel):
    actual_value: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
