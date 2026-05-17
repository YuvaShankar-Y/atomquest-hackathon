from datetime import datetime

from pydantic import BaseModel


class CompletionDashboardRow(BaseModel):
    employee_id: str
    employee_name: str
    manager_id: str | None
    manager_name: str | None
    quarter: int
    year: int
    total_goals: int
    checked_in_goals: int
    pending_goals: int
    is_complete: bool


class AuditLogRead(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    action: str
    old_value: dict | None
    new_value: dict | None
    changed_by: str | None
    changed_at: datetime

    model_config = {"from_attributes": True}
