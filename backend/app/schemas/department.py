"""T006: Department Pydantic DTOs — ABM de Departamentos (Feature 014)."""

import re
import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

from app.common.department_icons import ALLOWED_DEPARTMENT_ICONS

COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


class DepartmentBase(BaseModel):
    name: str
    description: str | None = None
    color: str = "#6b7280"
    icon: str = "Building2"

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El nombre no puede estar vacío")
        if len(v) > 60:
            raise ValueError("El nombre no puede superar los 60 caracteres")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 255:
            raise ValueError("La descripción no puede superar los 255 caracteres")
        return v

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        if not COLOR_RE.match(v):
            raise ValueError("El color debe ser un valor hexadecimal #RRGGBB")
        return v

    @field_validator("icon")
    @classmethod
    def validate_icon(cls, v: str) -> str:
        if v not in ALLOWED_DEPARTMENT_ICONS:
            raise ValueError(
                f"Icono no permitido. Opciones: {', '.join(ALLOWED_DEPARTMENT_ICONS)}"
            )
        return v


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    icon: str | None = None
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("El nombre no puede estar vacío")
            if len(v) > 60:
                raise ValueError("El nombre no puede superar los 60 caracteres")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 255:
            raise ValueError("La descripción no puede superar los 255 caracteres")
        return v

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str | None) -> str | None:
        if v is not None and not COLOR_RE.match(v):
            raise ValueError("El color debe ser un valor hexadecimal #RRGGBB")
        return v

    @field_validator("icon")
    @classmethod
    def validate_icon(cls, v: str | None) -> str | None:
        if v is not None and v not in ALLOWED_DEPARTMENT_ICONS:
            raise ValueError(
                f"Icono no permitido. Opciones: {', '.join(ALLOWED_DEPARTMENT_ICONS)}"
            )
        return v


class DepartmentNestedResponse(BaseModel):
    """Embedded in EmployeeResponse / TeamResponse."""

    id: uuid.UUID
    name: str
    color: str
    icon: str
    is_system: bool


class DepartmentResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    color: str
    icon: str
    is_system: bool
    is_active: bool
    employee_count: int | None = None
    team_count: int | None = None
    created_at: datetime
    updated_at: datetime


class DepartmentListResponse(BaseModel):
    items: list[DepartmentResponse]
    total: int


class DepartmentDeletePreview(BaseModel):
    department: DepartmentNestedResponse
    target_department: DepartmentNestedResponse
    employees_to_reassign: int
    teams_to_reassign: int


class DepartmentDeleteResult(BaseModel):
    id: uuid.UUID
    employees_reassigned: int
    teams_reassigned: int
    target_department: DepartmentNestedResponse
