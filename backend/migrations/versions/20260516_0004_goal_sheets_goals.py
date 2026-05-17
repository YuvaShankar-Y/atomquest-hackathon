"""add goal sheets and goals

Revision ID: 20260516_0004
Revises: 20260516_0003
Create Date: 2026-05-16

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260516_0004"
down_revision: Union[str, None] = "20260516_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "goal_sheets",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("cycle_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["cycle_id"], ["goal_cycles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_goal_sheets_cycle_id"), "goal_sheets", ["cycle_id"], unique=False)
    op.create_index(op.f("ix_goal_sheets_status"), "goal_sheets", ["status"], unique=False)
    op.create_index(op.f("ix_goal_sheets_user_id"), "goal_sheets", ["user_id"], unique=False)

    op.create_table(
        "goals",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("goal_sheet_id", sa.String(length=36), nullable=False),
        sa.Column("thrust_area", sa.String(length=120), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("uom_type", sa.String(length=20), nullable=False),
        sa.Column("direction", sa.String(length=10), nullable=True),
        sa.Column("target_value", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("weightage", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["goal_sheet_id"], ["goal_sheets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_goals_goal_sheet_id"), "goals", ["goal_sheet_id"], unique=False)
    op.create_index(op.f("ix_goals_thrust_area"), "goals", ["thrust_area"], unique=False)
    op.create_index(op.f("ix_goals_uom_type"), "goals", ["uom_type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_goals_uom_type"), table_name="goals")
    op.drop_index(op.f("ix_goals_thrust_area"), table_name="goals")
    op.drop_index(op.f("ix_goals_goal_sheet_id"), table_name="goals")
    op.drop_table("goals")
    op.drop_index(op.f("ix_goal_sheets_user_id"), table_name="goal_sheets")
    op.drop_index(op.f("ix_goal_sheets_status"), table_name="goal_sheets")
    op.drop_index(op.f("ix_goal_sheets_cycle_id"), table_name="goal_sheets")
    op.drop_table("goal_sheets")
