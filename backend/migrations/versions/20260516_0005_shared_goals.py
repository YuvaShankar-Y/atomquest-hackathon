"""add shared goal fields

Revision ID: 20260516_0005
Revises: 20260516_0004
Create Date: 2026-05-16

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260516_0005"
down_revision: Union[str, None] = "20260516_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("goals", sa.Column("actual_value", sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column(
        "goals",
        sa.Column("is_shared", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column("goals", sa.Column("shared_group_id", sa.String(length=36), nullable=True))
    op.add_column("goals", sa.Column("primary_owner_id", sa.String(length=36), nullable=True))
    op.create_index(op.f("ix_goals_is_shared"), "goals", ["is_shared"], unique=False)
    op.create_index(op.f("ix_goals_shared_group_id"), "goals", ["shared_group_id"], unique=False)
    op.create_index(op.f("ix_goals_primary_owner_id"), "goals", ["primary_owner_id"], unique=False)
    op.create_foreign_key(
        "fk_goals_primary_owner_id_users",
        "goals",
        "users",
        ["primary_owner_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_goals_primary_owner_id_users", "goals", type_="foreignkey")
    op.drop_index(op.f("ix_goals_primary_owner_id"), table_name="goals")
    op.drop_index(op.f("ix_goals_shared_group_id"), table_name="goals")
    op.drop_index(op.f("ix_goals_is_shared"), table_name="goals")
    op.drop_column("goals", "primary_owner_id")
    op.drop_column("goals", "shared_group_id")
    op.drop_column("goals", "is_shared")
    op.drop_column("goals", "actual_value")
