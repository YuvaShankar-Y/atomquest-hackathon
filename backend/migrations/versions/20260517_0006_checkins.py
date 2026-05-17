"""add check ins

Revision ID: 20260517_0006
Revises: 20260516_0005
Create Date: 2026-05-17

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260517_0006"
down_revision: Union[str, None] = "20260516_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "check_ins",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("goal_id", sa.String(length=36), nullable=False),
        sa.Column("quarter", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("actual_value", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("manager_comment", sa.Text(), nullable=True),
        sa.Column("updated_by", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_check_ins_goal_id"), "check_ins", ["goal_id"], unique=False)
    op.create_index(op.f("ix_check_ins_quarter"), "check_ins", ["quarter"], unique=False)
    op.create_index(op.f("ix_check_ins_status"), "check_ins", ["status"], unique=False)
    op.create_index(op.f("ix_check_ins_updated_by"), "check_ins", ["updated_by"], unique=False)
    op.create_index(op.f("ix_check_ins_year"), "check_ins", ["year"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_check_ins_year"), table_name="check_ins")
    op.drop_index(op.f("ix_check_ins_updated_by"), table_name="check_ins")
    op.drop_index(op.f("ix_check_ins_status"), table_name="check_ins")
    op.drop_index(op.f("ix_check_ins_quarter"), table_name="check_ins")
    op.drop_index(op.f("ix_check_ins_goal_id"), table_name="check_ins")
    op.drop_table("check_ins")
