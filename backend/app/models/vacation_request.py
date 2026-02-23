"""T051: VacationRequest model."""

import uuid
from datetime import date, datetime, timezone

from sqlmodel import Field, SQLModel


class VacationRequest(SQLModel, table=True):
    __tablename__ = "vacation_request"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    employee_id: uuid.UUID = Field(foreign_key="employee.id", index=True)
    start_date: date
    end_date: date
    requested_days: int
    status: str = Field(default="Pendiente")
    reviewed_by: uuid.UUID | None = Field(default=None, foreign_key="user.id")
    reviewed_at: datetime | None = Field(default=None)
    version: int = Field(default=1)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
