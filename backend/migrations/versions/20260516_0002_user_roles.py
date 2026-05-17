"""add user roles and manager hierarchy

Revision ID: 20260516_0002
Revises: 20260516_0001
Create Date: 2026-05-16

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260516_0002"
down_revision: Union[str, None] = "20260516_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("role", sa.String(length=20), server_default="employee", nullable=False),
    )
    op.add_column("users", sa.Column("manager_id", sa.String(length=36), nullable=True))
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)
    op.create_index(op.f("ix_users_manager_id"), "users", ["manager_id"], unique=False)
    op.create_foreign_key(
        "fk_users_manager_id_users",
        "users",
        "users",
        ["manager_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_users_manager_id_users", "users", type_="foreignkey")
    op.drop_index(op.f("ix_users_manager_id"), table_name="users")
    op.drop_index(op.f("ix_users_role"), table_name="users")
    op.drop_column("users", "manager_id")
    op.drop_column("users", "role")
