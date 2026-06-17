"""Stub migration: revision applied to the DB from a dev branch, no schema changes.

Revision ID: 20260616_add_absence
Revises: 20260605_extra_hours
Create Date: 2026-06-16

This file exists solely to allow Alembic to resolve the revision chain.
The DB was stamped with this revision ID from a development branch before
the corresponding feature was ready to merge; the actual schema is identical
to the previous revision.
"""

from alembic import op  # noqa: F401

revision = "20260616_add_absence"
down_revision = "20260605_extra_hours"
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
