"""Replace shift_type string with shift_type_id foreign key.

Revision ID: 20260306_shift_type_fk
Revises: 20260305_roster_fields
Create Date: 2026-03-06

Feature 004: Shift Roster Calendar (continued)
- Replace shift_type string column with shift_type_id foreign key
- References shift_type table for predefined shift configurations
- Allows roster assignments to use actual shift types (Mañana, Noche, etc)
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260306_shift_type_fk"
down_revision = "20260305_roster_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade database schema."""
    # Drop the old shift_type index
    op.drop_index(
        "ix_shift_record_shift_type",
        table_name="shift_record",
    )

    # Drop the old shift_type column
    op.drop_column("shift_record", "shift_type")

    # Add shift_type_id column as UUID foreign key
    op.add_column(
        "shift_record",
        sa.Column("shift_type_id", sa.UUID(), nullable=True),
    )

    # Create foreign key constraint to shift_type table
    op.create_foreign_key(
        "fk_shift_record_shift_type",
        "shift_record",
        "shift_type",
        ["shift_type_id"],
        ["id"],
    )

    # Add index for shift_type_id queries
    op.create_index(
        "ix_shift_record_shift_type_id",
        "shift_record",
        ["shift_type_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade database schema."""
    # Drop the new index
    op.drop_index(
        "ix_shift_record_shift_type_id",
        table_name="shift_record",
    )

    # Drop foreign key
    op.drop_constraint(
        "fk_shift_record_shift_type",
        "shift_record",
        type_="foreignkey",
    )

    # Drop shift_type_id column
    op.drop_column("shift_record", "shift_type_id")

    # Restore old shift_type string column
    op.add_column(
        "shift_record",
        sa.Column("shift_type", sa.String(length=20), nullable=True),
    )

    # Restore old index
    op.create_index(
        "ix_shift_record_shift_type",
        "shift_record",
        ["shift_type"],
        unique=False,
    )
