from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import PaginationParams

ItemStatus = Literal["draft", "active", "archived"]


class ItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    status: ItemStatus = "draft"


class ItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    status: ItemStatus | None = None


class ItemRead(BaseModel):
    id: str
    title: str
    description: str | None
    status: ItemStatus
    owner_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ItemListParams(PaginationParams):
    status: ItemStatus | None = None
