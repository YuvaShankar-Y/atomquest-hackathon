from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr

UserRole = Literal["employee", "manager", "admin"]


class UserRead(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    manager_id: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
