import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="employee", nullable=False, index=True)
    manager_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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

    manager: Mapped["User | None"] = relationship(
        "User",
        remote_side=lambda: [User.id],
        back_populates="reportees",
        foreign_keys=[manager_id],
    )
    reportees: Mapped[list["User"]] = relationship(
        "User",
        back_populates="manager",
        foreign_keys=[manager_id],
    )
    goal_sheets: Mapped[list["GoalSheet"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    items: Mapped[list["Item"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    ai_logs: Mapped[list["AILog"]] = relationship(back_populates="user", cascade="all, delete-orphan")
