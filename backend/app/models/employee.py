"""T042: Employee model."""

import uuid
from datetime import UTC, date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.time_entry import TimeEntry


class Employee(SQLModel, table=True):
    __tablename__ = "employee"
    __table_args__ = (
        UniqueConstraint("tenant_id", "dni", name="uq_employee_tenant_dni"),
        UniqueConstraint("tenant_id", "email", name="uq_employee_tenant_email"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    email: str = Field(max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    dni: str = Field(max_length=20)
    address: str | None = Field(default=None, max_length=500)
    birth_date: date | None = Field(default=None)
    marital_status: str | None = Field(default=None)
    gender: str | None = Field(default=None)
    role: str  # Admin, Moderador, Empleado
    department: str  # Cocina, Atención al Público, Barra, Dirección
    status: str = Field(default="Activo")
    hire_date: date = Field()
    profile_image: str | None = Field(default=None, max_length=500)
    emergency_contact: str | None = Field(default=None, max_length=255)
    is_active: bool = Field(default=True)
    team_id: uuid.UUID | None = Field(default=None, foreign_key="team.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Relationships
    time_entries: list["TimeEntry"] = Relationship(back_populates="employee")
