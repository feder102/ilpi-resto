"""T006: Add shift_type table

Revision ID: 2aca5d9f21d0
Revises: 82db0c2710d3
Create Date: 2026-02-28 09:15:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2aca5d9f21d0"
down_revision: str | None = "82db0c2710d3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create shift_type table."""
    op.create_table(
        "shift_type",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column("type", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("time_windows", sa.JSON(), nullable=False),
        sa.Column("uses_dynamic_close", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("expected_hours", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("expected_hours >= 0.5 AND expected_hours <= 24.0"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "name", name="uq_shift_type_tenant_name"),
    )
    op.create_index(
        "idx_shift_type_tenant_active",
        "shift_type",
        ["tenant_id", "is_active"],
    )
    op.create_index(
        "idx_shift_type_tenant_name",
        "shift_type",
        ["tenant_id", "name"],
    )


def downgrade() -> None:
    """Drop shift_type table."""
    op.drop_index("idx_shift_type_tenant_name", table_name="shift_type")
    op.drop_index("idx_shift_type_tenant_active", table_name="shift_type")
    op.drop_table("shift_type")
