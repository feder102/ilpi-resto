"""Drop old team shift columns

Revision ID: ab0bd6eec523
Revises: 4ca5a273db07
Create Date: 2026-02-28 09:33:56.696514

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'ab0bd6eec523'
down_revision: Union[str, None] = '4ca5a273db07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop old team shift columns (shift_type, shift_start, shift_end)."""
    # Drop the old columns that were replaced by shift_type_id FK
    op.drop_column('team', 'shift_end')
    op.drop_column('team', 'shift_start')
    op.drop_column('team', 'shift_type')


def downgrade() -> None:
    """Restore old team shift columns for downgrade."""
    op.add_column('team', sa.Column('shift_type', sa.VARCHAR(length=50), autoincrement=False, nullable=False))
    op.add_column('team', sa.Column('shift_start', postgresql.TIME(), autoincrement=False, nullable=False))
    op.add_column('team', sa.Column('shift_end', postgresql.TIME(), autoincrement=False, nullable=False))
