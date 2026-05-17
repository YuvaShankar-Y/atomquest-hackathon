import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    goal_sheet_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("goal_sheets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    thrust_area: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    uom_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    direction: Mapped[str | None] = mapped_column(String(10), nullable=True)
    target_value: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    weightage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    actual_value: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    is_shared: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    shared_group_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    primary_owner_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    goal_sheet: Mapped["GoalSheet"] = relationship(back_populates="goals")
    check_ins: Mapped[list["CheckIn"]] = relationship(back_populates="goal", cascade="all, delete-orphan")
