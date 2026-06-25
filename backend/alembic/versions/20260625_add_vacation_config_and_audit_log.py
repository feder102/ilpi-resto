"""Add vacation config fields and audit_log table.

Revision ID: 20260625_vacation_config
Revises: 20260616_add_absence
Create Date: 2026-06-25
"""

import sqlalchemy as sa

from alembic import op

revision: str = "20260625_vacation_config"
down_revision: str | None = "20260616_add_absence"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Add default_vacation_days to tenant (NOT NULL, server default 30)
    op.add_column(
        "tenant",
        sa.Column(
            "default_vacation_days",
            sa.Integer(),
            nullable=False,
            server_default="30",
        ),
    )

    # Add custom_vacation_days to employee (NULLABLE override per employee)
    op.add_column(
        "employee",
        sa.Column("custom_vacation_days", sa.Integer(), nullable=True),
    )

    # Create audit_log table
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.String(length=100), nullable=False),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("changed_by", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.ForeignKeyConstraint(["changed_by"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_audit_log_tenant_id", "audit_log", ["tenant_id"])
    op.create_index(
        "idx_audit_log_entity",
        "audit_log",
        ["tenant_id", "entity_type", "entity_id"],
    )
    op.create_index(
        "idx_audit_log_created_at",
        "audit_log",
        ["tenant_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_audit_log_created_at", table_name="audit_log")
    op.drop_index("idx_audit_log_entity", table_name="audit_log")
    op.drop_index("idx_audit_log_tenant_id", table_name="audit_log")
    op.drop_table("audit_log")
    op.drop_column("employee", "custom_vacation_days")
    op.drop_column("tenant", "default_vacation_days")
