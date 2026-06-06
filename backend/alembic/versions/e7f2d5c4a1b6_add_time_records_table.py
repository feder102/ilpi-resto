"""Add time_record table for Feature 005.

Revision ID: e7f2d5c4a1b6
Revises: f5e9c1a2b3d4
Create Date: 2026-03-09 17:05:00.000000

Feature 005: Employee Workspace Portal - Time Tracking
- Create time_record table
- Add unique constraint for single active clock-in per employee per day
- Add indexes for query optimization
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = 'e7f2d5c4a1b6'
down_revision = 'f5e9c1a2b3d4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'time_record',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('clock_in_timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('clock_out_timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('location_lat', sa.Float(), nullable=True),
        sa.Column('location_lng', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['employee.id'], ),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('idx_time_record_employee_date',
                    'time_record',
                    ['tenant_id', 'employee_id', sa.text('date DESC')],
                    unique=False)

    op.create_index('ix_time_record_date',
                    'time_record',
                    ['date'],
                    unique=False)

    op.create_index('ix_time_record_tenant_id',
                    'time_record',
                    ['tenant_id'],
                    unique=False)

    op.create_index('ix_time_record_employee_id',
                    'time_record',
                    ['employee_id'],
                    unique=False)

    # Create unique constraint for single active clock-in per employee per day
    # Note: PostgreSQL allows this with "WHERE clock_out_timestamp IS NULL"
    op.execute(
        "CREATE UNIQUE INDEX uq_active_clock_in ON time_record "
        "(tenant_id, employee_id, date) "
        "WHERE clock_out_timestamp IS NULL"
    )


def downgrade() -> None:
    op.drop_index('uq_active_clock_in', table_name='time_record')
    op.drop_index('ix_time_record_employee_id', table_name='time_record')
    op.drop_index('ix_time_record_tenant_id', table_name='time_record')
    op.drop_index('ix_time_record_date', table_name='time_record')
    op.drop_index('idx_time_record_employee_date', table_name='time_record')
    op.drop_table('time_record')
