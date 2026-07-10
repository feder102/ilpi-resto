"""Add optional passport field to employee.

Revision ID: 20260709_passport
Revises: 20260626_departments
Create Date: 2026-07-09

- Adds nullable `passport` column to `employee` (identity document is optional,
  captured only when the employee indicates they have one).
"""

import sqlalchemy as sa

from alembic import op

revision: str = "20260709_passport"
down_revision: str | None = "20260626_departments"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("employee", sa.Column("passport", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("employee", "passport")
