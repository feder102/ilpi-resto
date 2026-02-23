"""T043: Employee Pydantic DTOs."""

import uuid
from datetime import date

from pydantic import BaseModel, EmailStr


class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    dni: str
    address: str | None = None
    birth_date: date | None = None
    marital_status: str | None = None
    gender: str | None = None
    role: str
    department: str
    hire_date: date
    profile_image: str | None = None
    emergency_contact: str | None = None


class EmployeeUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    dni: str | None = None
    address: str | None = None
    birth_date: date | None = None
    marital_status: str | None = None
    gender: str | None = None
    role: str | None = None
    department: str | None = None
    status: str | None = None
    hire_date: date | None = None
    profile_image: str | None = None
    emergency_contact: str | None = None


class EmployeeResponse(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    phone: str | None
    dni: str
    address: str | None
    birth_date: date | None
    marital_status: str | None
    gender: str | None
    role: str
    department: str
    status: str
    hire_date: date
    profile_image: str | None
    emergency_contact: str | None
    is_active: bool
    team_id: uuid.UUID | None
