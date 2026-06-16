"""Add absence table.

Revision ID: 20260616_add_absence
Revises: 20260605_extra_hours
Create Date: 2026-06-16
"""

from alembic import op
import sqlalchemy as sa
import sqlmodel

revision: str = "20260616_add_absence"
down_revision: str | None = "20260605_extra_hours"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "absence",
        sa.Column("id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("tenant_id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("employee_id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("shift_record_id", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("justified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("created_by", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.ForeignKeyConstraint(["employee_id"], ["employee.id"]),
        sa.ForeignKeyConstraint(["shift_record_id"], ["shift_record.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "employee_id", "date", name="uq_absence_employee_date"),
    )
    op.create_index("ix_absence_tenant_id", "absence", ["tenant_id"])
    op.create_index("ix_absence_employee_id", "absence", ["employee_id"])
    op.create_index("ix_absence_date", "absence", ["date"])
    op.create_index(
        "ix_absence_tenant_employee_date",
        "absence",
        ["tenant_id", "employee_id", "date"],
    )


def downgrade() -> None:
    op.drop_index("ix_absence_tenant_employee_date", table_name="absence")
    op.drop_index("ix_absence_date", table_name="absence")
    op.drop_index("ix_absence_employee_id", table_name="absence")
    op.drop_index("ix_absence_tenant_id", table_name="absence")
    op.drop_table("absence")
