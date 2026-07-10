"""T013: Employee Pydantic DTOs — department string → FK (Feature 014)."""

import uuid
from datetime import date

from pydantic import BaseModel, EmailStr, field_validator

from app.schemas.department import DepartmentNestedResponse


class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    dni: str
    passport: str | None = None
    address: str | None = None
    birth_date: date | None = None
    marital_status: str | None = None
    gender: str | None = None
    role: str
    department_id: uuid.UUID
    hire_date: date
    profile_image: str | None = None
    emergency_contact: str | None = None


class EmployeeUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    dni: str | None = None
    passport: str | None = None
    address: str | None = None
    birth_date: date | None = None
    marital_status: str | None = None
    gender: str | None = None
    role: str | None = None
    department_id: uuid.UUID | None = None
    status: str | None = None
    hire_date: date | None = None
    profile_image: str | None = None
    emergency_contact: str | None = None
    custom_vacation_days: int | None = None

    @field_validator("custom_vacation_days")
    @classmethod
    def validate_custom_vacation_days(cls, v: int | None) -> int | None:
        if v is not None and not (1 <= v <= 365):
            raise ValueError("El número de días personalizados debe estar entre 1 y 365")
        return v


class EmployeeResponse(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    phone: str | None
    dni: str
    passport: str | None
    address: str | None
    birth_date: date | None
    marital_status: str | None
    gender: str | None
    role: str
    department: DepartmentNestedResponse
    status: str
    hire_date: date
    profile_image: str | None
    emergency_contact: str | None
    is_active: bool
    team_id: uuid.UUID | None
    custom_vacation_days: int | None = None
