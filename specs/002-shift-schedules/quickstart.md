# Quick Start: Shift Schedule Configuration

**Feature**: `002-shift-schedules` | **Date**: 2026-02-28 | **Target**: Developers implementing this feature

---

## Overview

This guide shows how to configure shift types and assign teams to them using the new ShiftType entity.

---

## Part 1: Backend Setup

### 1.1 Create ShiftType Model

**File**: `backend/app/models/shift_type.py`

```python
"""Shift type model."""

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, CheckConstraint, Index, UniqueConstraint
from sqlmodel import Field, SQLModel


class ShiftType(SQLModel, table=True):
    """Predefined shift configuration (Mañana, Noche, Cortado, Corrido)."""

    __tablename__ = "shift_type"
    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_shift_type_tenant_name"),
        Index("idx_shift_type_tenant_active", "tenant_id", "is_active"),
        Index("idx_shift_type_tenant_name", "tenant_id", "name"),
        CheckConstraint("expected_hours >= 0.5 AND expected_hours <= 24.0"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    name: str = Field(max_length=100)
    type: str = Field(max_length=20)  # MAÑANA, NOCHE, CORTADO, CORRIDO
    time_windows: list[dict[str, str]] = Field(sa_column_kwargs={"type": JSON})
    uses_dynamic_close: bool = Field(default=False)
    expected_hours: float
    description: str | None = Field(None, max_length=500)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def total_hours(self) -> float:
        """Calculate total hours from time windows."""
        total_minutes = 0
        for window in self.time_windows:
            start_h, start_m = map(int, window["start"].split(":"))
            end_h, end_m = map(int, window["end"].split(":"))

            start_total_m = start_h * 60 + start_m
            end_total_m = end_h * 60 + end_m

            # Handle midnight spans
            if end_total_m < start_total_m:
                end_total_m += 24 * 60

            total_minutes += end_total_m - start_total_m

        return round(total_minutes / 60, 2)
```

### 1.2 Update Models __init__.py

**File**: `backend/app/models/__init__.py`

Add ShiftType export for Alembic:
```python
from .shift_type import ShiftType  # NEW

__all__ = ["Tenant", "User", "Employee", "Team", "ShiftType", ...]
```

### 1.3 Create Pydantic Schemas

**File**: `backend/app/schemas/shift_type.py`

```python
"""Shift type Pydantic DTOs."""

import uuid
from pydantic import BaseModel, field_validator


class TimeWindow(BaseModel):
    """Single time window in a shift."""
    start: str  # HH:MM
    end: str    # HH:MM

    @field_validator("start", "end")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        """Validate time format HH:MM."""
        if not isinstance(v, str) or len(v) != 5 or v[2] != ":":
            raise ValueError("Time must be in HH:MM format")
        try:
            h, m = map(int, v.split(":"))
            if not (0 <= h < 24 and 0 <= m < 60):
                raise ValueError()
        except (ValueError, IndexError):
            raise ValueError("Invalid time values")
        return v


class ShiftTypeCreate(BaseModel):
    """Create shift type request."""
    name: str
    type: str  # MAÑANA, NOCHE, CORTADO, CORRIDO
    time_windows: list[TimeWindow]
    uses_dynamic_close: bool = False
    expected_hours: float
    description: str | None = None


class ShiftTypeUpdate(BaseModel):
    """Update shift type request."""
    name: str | None = None
    type: str | None = None
    time_windows: list[TimeWindow] | None = None
    uses_dynamic_close: bool | None = None
    expected_hours: float | None = None
    description: str | None = None


class ShiftTypeResponse(BaseModel):
    """Shift type response."""
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    type: str
    time_windows: list[dict[str, str]]
    uses_dynamic_close: bool
    expected_hours: float
    total_hours: float
    description: str | None
    is_active: bool
    created_at: str
    updated_at: str
```

### 1.4 Create Service Layer

**File**: `backend/app/services/shift_type_service.py`

```python
"""Shift type service — business logic for shift type CRUD."""

import uuid
from sqlalchemy import select
from sqlmodel import Session

from app.common.exceptions import (
    DuplicateError,
    NotFoundError,
    InvalidDataError,
)
from app.models.shift_type import ShiftType
from app.schemas.shift_type import ShiftTypeCreate, ShiftTypeUpdate


def create_shift_type(
    data: ShiftTypeCreate,
    tenant_id: uuid.UUID,
    session: Session,
) -> ShiftType:
    """Create new shift type with validation."""

    # Check for duplicate name
    existing = session.exec(
        select(ShiftType).where(
            ShiftType.tenant_id == tenant_id,
            ShiftType.name == data.name,
        )
    ).first()

    if existing:
        raise DuplicateError(f"Shift type '{data.name}' already exists")

    # Validate expected_hours matches calculated hours
    shift_type = ShiftType(
        tenant_id=tenant_id,
        name=data.name,
        type=data.type,
        time_windows=[w.model_dump() for w in data.time_windows],
        uses_dynamic_close=data.uses_dynamic_close,
        expected_hours=data.expected_hours,
        description=data.description,
    )

    # Check expected_hours accuracy
    calculated = shift_type.total_hours
    if abs(calculated - data.expected_hours) > 0.01:
        raise InvalidDataError(
            f"Expected hours ({data.expected_hours}) doesn't match "
            f"calculated hours ({calculated})"
        )

    session.add(shift_type)
    session.commit()
    session.refresh(shift_type)
    return shift_type


def get_shift_types(
    tenant_id: uuid.UUID,
    session: Session,
    active_only: bool = True,
    page: int = 1,
    size: int = 20,
):
    """List shift types for tenant."""
    query = select(ShiftType).where(ShiftType.tenant_id == tenant_id)

    if active_only:
        query = query.where(ShiftType.is_active == True)

    offset = (page - 1) * size
    items = session.exec(query.offset(offset).limit(size)).all()
    total = session.exec(select(ShiftType).where(ShiftType.tenant_id == tenant_id)).all()

    return {
        "items": items,
        "page": page,
        "size": size,
        "total": len(total),
    }


def get_shift_type(
    shift_type_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
) -> ShiftType:
    """Get single shift type."""
    shift_type = session.exec(
        select(ShiftType).where(
            ShiftType.id == shift_type_id,
            ShiftType.tenant_id == tenant_id,
        )
    ).first()

    if not shift_type:
        raise NotFoundError("Shift type not found")

    return shift_type


def delete_shift_type(
    shift_type_id: uuid.UUID,
    tenant_id: uuid.UUID,
    session: Session,
) -> None:
    """Soft-delete shift type (checks for team assignments)."""
    shift_type = get_shift_type(shift_type_id, tenant_id, session)

    # Check if teams are using this shift type
    from app.models.team import Team
    teams_count = session.exec(
        select(Team).where(
            Team.shift_type_id == shift_type_id,
            Team.is_active == True,
        )
    ).all()

    if teams_count:
        raise InvalidDataError(
            f"Cannot delete shift type — {len(teams_count)} teams are using it"
        )

    shift_type.is_active = False
    session.add(shift_type)
    session.commit()
```

### 1.5 Create Router

**File**: `backend/app/routers/shift_types.py`

```python
"""Shift types router."""

import uuid
from fastapi import APIRouter, Depends, Query

from app.dependencies import DbSession, TenantId, require_role
from app.schemas.shift_type import ShiftTypeCreate, ShiftTypeUpdate, ShiftTypeResponse
from app.services import shift_type_service

router = APIRouter(tags=["shift-types"])

AdminOrMod = Depends(require_role("Admin", "Moderador"))
AdminOnly = Depends(require_role("Admin"))


@router.get("/shift-types")
def list_shift_types(
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """List shift types for tenant."""
    return shift_type_service.get_shift_types(tenant_id, session, page=page, size=size)


@router.post("/shift-types", status_code=201)
def create_shift_type(
    body: ShiftTypeCreate,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
):
    """Create new shift type."""
    return shift_type_service.create_shift_type(body, tenant_id, session)


@router.get("/shift-types/{shift_type_id}")
def get_shift_type(
    shift_type_id: uuid.UUID,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
):
    """Get single shift type."""
    return shift_type_service.get_shift_type(shift_type_id, tenant_id, session)


@router.delete("/shift-types/{shift_type_id}")
def delete_shift_type(
    shift_type_id: uuid.UUID,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOnly,
):
    """Delete shift type (soft)."""
    shift_type_service.delete_shift_type(shift_type_id, tenant_id, session)
    return {"status": "deleted"}
```

### 1.6 Alembic Migration

**File**: `backend/alembic/versions/[NEXT]_add_shift_types_table.py`

```python
"""Add shift_type table."""

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    """Create shift_type table."""
    op.create_table(
        'shift_type',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.VARCHAR(100), nullable=False),
        sa.Column('type', sa.VARCHAR(20), nullable=False),
        sa.Column('time_windows', sa.JSON(), nullable=False),
        sa.Column('uses_dynamic_close', sa.BOOLEAN(), nullable=False, server_default=sa.false()),
        sa.Column('expected_hours', sa.DECIMAL(5,2), nullable=False),
        sa.Column('description', sa.VARCHAR(500)),
        sa.Column('is_active', sa.BOOLEAN(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'name'),
    )
    op.create_index('idx_shift_type_tenant_active', 'shift_type', ['tenant_id', 'is_active'])
    op.create_index('idx_shift_type_tenant_name', 'shift_type', ['tenant_id', 'name'])


def downgrade() -> None:
    """Drop shift_type table."""
    op.drop_table('shift_type')
```

---

## Part 2: Using the API

### 2.1 Create a Shift Type (cURL)

```bash
curl -X POST http://localhost:8000/shift-types \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cortado",
    "type": "CORTADO",
    "time_windows": [
      {"start": "12:30", "end": "16:30"},
      {"start": "18:30", "end": "22:30"}
    ],
    "uses_dynamic_close": false,
    "expected_hours": 8.0,
    "description": "Split shift with lunch break"
  }'
```

### 2.2 List Shift Types

```bash
curl http://localhost:8000/shift-types \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 2.3 Create a Team with ShiftType

```bash
curl -X POST http://localhost:8000/teams \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cocina Cortado A",
    "department": "Cocina",
    "shift_type": "CORTADO"
  }'
```

**Response** (includes shift details and calculated total_hours):
```json
{
  "id": "...",
  "name": "Cocina Cortado A",
  "shift_type": "CORTADO",
  "time_windows": [
    {"start": "12:30", "end": "16:30"},
    {"start": "18:30", "end": "22:30"}
  ],
  "total_hours": 8.0,
  "is_active": true,
  ...
}
```

---

## Part 3: Testing

### 3.1 Unit Test Example

**File**: `backend/tests/test_shift_types.py`

```python
"""Tests for shift type service."""

import pytest
from sqlmodel import Session
from app.models.shift_type import ShiftType
from app.schemas.shift_type import ShiftTypeCreate
from app.services import shift_type_service
from app.common.exceptions import DuplicateError


def test_create_shift_type_cortado(session: Session, tenant_id):
    """Test creating Cortado split shift."""
    data = ShiftTypeCreate(
        name="Cortado",
        type="CORTADO",
        time_windows=[
            {"start": "12:30", "end": "16:30"},
            {"start": "18:30", "end": "22:30"},
        ],
        uses_dynamic_close=False,
        expected_hours=8.0,
    )

    shift_type = shift_type_service.create_shift_type(data, tenant_id, session)

    assert shift_type.name == "Cortado"
    assert shift_type.total_hours == 8.0
    assert len(shift_type.time_windows) == 2


def test_duplicate_shift_type_name(session: Session, tenant_id):
    """Test that duplicate names are rejected."""
    data = ShiftTypeCreate(
        name="Mañana",
        type="MAÑANA",
        time_windows=[{"start": "10:30", "end": "18:00"}],
        uses_dynamic_close=False,
        expected_hours=7.5,
    )

    shift_type_service.create_shift_type(data, tenant_id, session)

    with pytest.raises(DuplicateError):
        shift_type_service.create_shift_type(data, tenant_id, session)
```

---

## Part 4: Key Implementation Notes

### Time Calculation
- Use `total_hours` property on ShiftType model
- Handles midnight spans: if end < start, add 24 hours
- Result rounded to 2 decimal places

### Validation
- Window times must be HH:MM format
- Expected hours must match calculated hours (±0.01 tolerance)
- No overlapping windows within same shift type
- Windows must be chronologically ordered

### Soft Delete
- Set `is_active=False` instead of deleting
- LIST endpoints exclude inactive by default
- Existing teams can still reference inactive shift types

### Multi-Tenant
- All queries filtered by tenant_id from JWT
- Unique constraint scoped to (tenant_id, name)

---

## Status

✅ **READY FOR IMPLEMENTATION**

