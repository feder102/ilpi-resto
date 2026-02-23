"""T052: VacationBalance model."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class VacationBalance(SQLModel, table=True):
    __tablename__ = "vacation_balance"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "employee_id", "year", name="uq_balance_tenant_employee_year"
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    employee_id: uuid.UUID = Field(foreign_key="employee.id", index=True)
    year: int
    total_days: int = Field(default=30)
    used_days: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
