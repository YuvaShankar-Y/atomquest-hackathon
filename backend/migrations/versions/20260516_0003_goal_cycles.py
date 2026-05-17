"""add goal cycles

Revision ID: 20260516_0003
Revises: 20260516_0002
Create Date: 2026-05-16

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260516_0003"
down_revision: Union[str, None] = "20260516_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "goal_cycles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("phase", sa.String(length=30), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_goal_cycles_end_date"), "goal_cycles", ["end_date"], unique=False)
    op.create_index(op.f("ix_goal_cycles_is_active"), "goal_cycles", ["is_active"], unique=False)
    op.create_index(op.f("ix_goal_cycles_name"), "goal_cycles", ["name"], unique=False)
    op.create_index(op.f("ix_goal_cycles_phase"), "goal_cycles", ["phase"], unique=False)
    op.create_index(op.f("ix_goal_cycles_start_date"), "goal_cycles", ["start_date"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_goal_cycles_start_date"), table_name="goal_cycles")
    op.drop_index(op.f("ix_goal_cycles_phase"), table_name="goal_cycles")
    op.drop_index(op.f("ix_goal_cycles_name"), table_name="goal_cycles")
    op.drop_index(op.f("ix_goal_cycles_is_active"), table_name="goal_cycles")
    op.drop_index(op.f("ix_goal_cycles_end_date"), table_name="goal_cycles")
    op.drop_table("goal_cycles")
