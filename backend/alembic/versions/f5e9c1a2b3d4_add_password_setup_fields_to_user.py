"""Add password setup fields to user table.

Revision ID: f5e9c1a2b3d4
Revises: 20260306_shift_type_fk
Create Date: 2026-03-09 17:00:00.000000

Feature 005: Employee Workspace Portal
- Add password_reset_token (unique, nullable)
- Add password_reset_expires (nullable)
- Add last_login (nullable)
- Make hashed_password nullable for password setup flow
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f5e9c1a2b3d4'
down_revision = '20260306_shift_type_fk'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns for password setup flow
    op.add_column('user', sa.Column('password_reset_token', sa.String(), nullable=True))
    op.add_column('user', sa.Column('password_reset_expires', sa.DateTime(timezone=True), nullable=True))
    op.add_column('user', sa.Column('last_login', sa.DateTime(timezone=True), nullable=True))

    # Make hashed_password nullable for new accounts without password
    op.alter_column('user', 'hashed_password',
                    existing_type=sa.String(),
                    nullable=True)

    # Create unique constraint on password_reset_token
    op.create_unique_constraint('uq_password_reset_token', 'user', ['password_reset_token'])


def downgrade() -> None:
    op.drop_constraint('uq_password_reset_token', 'user', type_='unique')

    # Revert hashed_password to NOT NULL
    op.alter_column('user', 'hashed_password',
                    existing_type=sa.String(),
                    nullable=False)

    # Remove new columns
    op.drop_column('user', 'last_login')
    op.drop_column('user', 'password_reset_expires')
    op.drop_column('user', 'password_reset_token')
