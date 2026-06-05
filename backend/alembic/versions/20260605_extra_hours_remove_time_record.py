"""Feature 010: remove manual time_record table, add extra-hours support to time_entries

Revision ID: 20260605_extra_hours
Revises: 79ad9726ce5e
Create Date: 2026-06-05

Changes:
- Drop the `time_record` table (manual employee clock-in/out removed).
- `time_entries.start_time` / `end_time` become nullable (extra-hours entries have no schedule).
- Add `time_entries.note` (reason for extra-hours entries).
- Add the `EXTRA` value to the `timeentrysource` enum.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260605_extra_hours"
down_revision = "79ad9726ce5e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- time_entries: support extra hours ---
    # Add the new enum value. ALTER TYPE ... ADD VALUE must run outside a transaction
    # block on some PostgreSQL versions, so use an autocommit block.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE timeentrysource ADD VALUE IF NOT EXISTS 'EXTRA'")

    op.alter_column("time_entries", "start_time", existing_type=sa.Time(), nullable=True)
    op.alter_column("time_entries", "end_time", existing_type=sa.Time(), nullable=True)
    op.add_column("time_entries", sa.Column("note", sa.String(length=255), nullable=True))

    # --- drop manual time tracking table ---
    op.drop_index("uq_active_clock_in", table_name="time_record")
    op.drop_index("ix_time_record_employee_id", table_name="time_record")
    op.drop_index("ix_time_record_tenant_id", table_name="time_record")
    op.drop_index("ix_time_record_date", table_name="time_record")
    op.drop_index("idx_time_record_employee_date", table_name="time_record")
    op.drop_table("time_record")


def downgrade() -> None:
    # --- recreate time_record table ---
    op.create_table(
        "time_record",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("clock_in_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("clock_out_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("location_lat", sa.Float(), nullable=True),
        sa.Column("location_lng", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["employee_id"], ["employee.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_time_record_employee_date", "time_record",
                    ["tenant_id", "employee_id", sa.text("date DESC")], unique=False)
    op.create_index("ix_time_record_date", "time_record", ["date"], unique=False)
    op.create_index("ix_time_record_tenant_id", "time_record", ["tenant_id"], unique=False)
    op.create_index("ix_time_record_employee_id", "time_record", ["employee_id"], unique=False)
    op.execute(
        "CREATE UNIQUE INDEX uq_active_clock_in ON time_record "
        "(tenant_id, employee_id, date) "
        "WHERE clock_out_timestamp IS NULL"
    )

    # --- revert time_entries changes ---
    op.drop_column("time_entries", "note")
    op.alter_column("time_entries", "end_time", existing_type=sa.Time(), nullable=False)
    op.alter_column("time_entries", "start_time", existing_type=sa.Time(), nullable=False)
    # Note: the 'EXTRA' enum value is intentionally left in place; removing a value
    # from a PostgreSQL enum requires recreating the type and is not reversible here.
