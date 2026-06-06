"""Add shift roster calendar fields to shift_record table.

Revision ID: 20260305_roster_fields
Revises: ab0bd6eec523
Create Date: 2026-03-05

Feature 004: Shift Roster Calendar
- Add shift_type field (morning, afternoon, night)
- Add created_by field (audit trail)
- Make entry_time and exit_time nullable (support roster assignments without clock-in/out)
- Add composite index on (tenant_id, date) for roster queries
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260305_roster_fields"
down_revision = "ab0bd6eec523"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade database schema."""
    # Add shift_type column
    op.add_column(
        "shift_record",
        sa.Column("shift_type", sa.String(length=20), nullable=True),
    )

    # Add created_by column
    op.add_column(
        "shift_record",
        sa.Column("created_by", sa.UUID(), nullable=True),
    )

    # Create foreign key for created_by
    op.create_foreign_key(
        "fk_shift_record_created_by",
        "shift_record",
        "user",
        ["created_by"],
        ["id"],
    )

    # Make entry_time nullable (currently it's required, so we'll alter it)
    # Note: For existing data, entry_time will be NULL for roster assignments
    op.alter_column(
        "shift_record",
        "entry_time",
        existing_type=sa.DateTime(),
        nullable=True,
        existing_nullable=False,
    )

    # Add indexes for roster queries
    op.create_index(
        "ix_shift_record_tenant_date",
        "shift_record",
        ["tenant_id", "date"],
        unique=False,
    )

    op.create_index(
        "ix_shift_record_tenant_employee_date",
        "shift_record",
        ["tenant_id", "employee_id", "date"],
        unique=False,
    )

    op.create_index(
        "ix_shift_record_shift_type",
        "shift_record",
        ["shift_type"],
        unique=False,
    )

    # Add unique constraint for roster assignments (one shift per employee per day)
    # This will help prevent duplicate assignments
    op.create_unique_constraint(
        "uq_shift_record_roster",
        "shift_record",
        ["tenant_id", "employee_id", "date"],
    )


def downgrade() -> None:
    """Downgrade database schema."""
    # Drop unique constraint
    op.drop_constraint(
        "uq_shift_record_roster",
        "shift_record",
        type_="unique",
    )

    # Drop indexes
    op.drop_index(
        "ix_shift_record_tenant_date",
        table_name="shift_record",
    )

    op.drop_index(
        "ix_shift_record_tenant_employee_date",
        table_name="shift_record",
    )

    op.drop_index(
        "ix_shift_record_shift_type",
        table_name="shift_record",
    )

    # Restore entry_time as non-nullable
    op.alter_column(
        "shift_record",
        "entry_time",
        existing_type=sa.DateTime(),
        nullable=False,
        existing_nullable=True,
    )

    # Drop foreign key
    op.drop_constraint(
        "fk_shift_record_created_by",
        "shift_record",
        type_="foreignkey",
    )

    # Drop columns
    op.drop_column("shift_record", "created_by")
    op.drop_column("shift_record", "shift_type")
