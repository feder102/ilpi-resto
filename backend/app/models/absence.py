import uuid
from datetime import UTC, datetime
from datetime import date as date_type

from sqlmodel import Field, SQLModel, UniqueConstraint


class Absence(SQLModel, table=True):
    __tablename__ = "absence"
    __table_args__ = (
        UniqueConstraint("tenant_id", "employee_id", "date", name="uq_absence_employee_date"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    employee_id: uuid.UUID = Field(foreign_key="employee.id", index=True)
    date: date_type = Field(index=True)
    shift_record_id: uuid.UUID | None = Field(default=None, foreign_key="shift_record.id")
    justified: bool = Field(default=False)
    reason: str | None = Field(default=None, max_length=255)
    created_by: uuid.UUID | None = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
