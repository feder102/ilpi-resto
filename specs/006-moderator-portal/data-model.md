# Data Model: Moderator Portal (Feature 006)

**Date**: 2026-03-09
**Phase**: 1 - Design & Contracts
**Status**: Complete

## Overview

Feature 006 does not introduce new database entities. Instead, it extends existing models from Features 004 (Shift Roster) and 005 (Vacations) with new relationships and constraints. This document outlines the data model, relationships, and validation rules needed to support moderator functionality.

---

## Core Entities (Reused)

### 1. User
**Purpose**: Authentication and authorization
**Relationships**: 1 User → 1 Employee (optional), 1 User → 1 Tenant

```python
class User(SQLModel, table=True):
    __tablename__ = "user"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    tenant_id: str = Field(foreign_key="tenant.id")
    email: str
    hashed_password: str  # Bcrypt hash
    role: str  # Admin, Moderador, Empleado
    employee_id: str = Field(foreign_key="employee.id", nullable=True)
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Unique per tenant
    __table_args__ = (UniqueConstraint('tenant_id', 'email'),)
```

**Validation**:
- Role MUST be one of: 'Admin', 'Moderador', 'Empleado'
- If role is 'Moderador' or 'Empleado', employee_id MUST be set
- Email MUST be unique per tenant

### 2. Employee
**Purpose**: Personnel record
**Relationships**: 1 Employee → 1 User (optional), 1 Employee → many ShiftRecords, 1 Employee → many VacationRequests, 1 Employee → 1 VacationBalance (per year)

```python
class Employee(SQLModel, table=True):
    __tablename__ = "employee"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    tenant_id: str = Field(foreign_key="tenant.id")
    first_name: str
    last_name: str
    email: str
    phone: str = None
    dni: str
    department: str  # Enum: Cocina, Atención al Público, Barra, Dirección
    role: str  # Job title: e.g., "Cocinero", "Jefe de Cocina"
    status: str  # Enum: Activo, Vacaciones, Ausente, Inactivo
    hire_date: str  # YYYY-MM-DD
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Unique per tenant
    __table_args__ = (
        UniqueConstraint('tenant_id', 'email'),
        UniqueConstraint('tenant_id', 'dni'),
    )
```

**Validation**:
- Department MUST be one of enum values
- Status MUST be one of: Activo, Vacaciones, Ausente, Inactivo
- DNI MUST be unique per tenant
- Email MUST be unique per tenant
- Hire date MUST be in past (validation at service layer)

### 3. Tenant
**Purpose**: Multi-tenant organization container
**Relationships**: 1 Tenant → many Employees, Users, ShiftRecords, VacationRequests

```python
class Tenant(SQLModel, table=True):
    __tablename__ = "tenant"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    name: str
    slug: str = Field(unique=True)
    timezone: str = "Europe/Madrid"
    locale: str = "es"
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

---

## Extended Entities (Feature 006 Specific)

### 4. VacationRequest
**Purpose**: Track vacation submissions and approvals
**Relationships**: 1 VacationRequest → 1 Employee, 1 VacationRequest → 1 Moderator (optional, reviewed_by)

```python
class VacationRequest(SQLModel, table=True):
    __tablename__ = "vacation_request"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    tenant_id: str = Field(foreign_key="tenant.id")
    employee_id: str = Field(foreign_key="employee.id")
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    requested_days: int  # Natural days (dias naturales), includes weekends
    status: str  # Enum: Pendiente, Aprobado, Rechazado, Cancelado
    reviewed_by: str = None  # user_id of moderador who approved/rejected
    reviewed_at: datetime = None
    rejection_reason: str = None  # Optional reason text
    version: int = 0  # Optimistic lock
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

**Validation**:
- Start_date MUST be < end_date
- Status MUST be one of: Pendiente, Aprobado, Rechazado, Cancelado
- requested_days MUST be > 0
- If status = 'Aprobado' or 'Rechazado':
  - reviewed_by MUST be set (moderator's user_id)
  - reviewed_at MUST be set
- If status = 'Rechazado':
  - rejection_reason SHOULD be populated (optional but recommended)
- Dates MUST NOT be in past (validation at service layer)

**State Transitions**:
- Pendiente → Aprobado (Moderador or Admin)
- Pendiente → Rechazado (Moderador or Admin)
- Pendiente → Cancelado (Employee only, if not yet approved)
- No other transitions allowed

**Business Rules**:
- Employee MUST have sufficient vacation balance (checked at service layer)
- Approved vacation blocks shift assignment (checked in ShiftService)

### 5. ShiftRecord
**Purpose**: Shift assignments and time tracking
**Relationships**: 1 ShiftRecord → 1 Employee, 1 ShiftRecord → 1 ShiftType

```python
class ShiftRecord(SQLModel, table=True):
    __tablename__ = "shift_record"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    tenant_id: str = Field(foreign_key="tenant.id")
    employee_id: str = Field(foreign_key="employee.id")
    date: str  # YYYY-MM-DD
    shift_type_id: str = Field(foreign_key="shift_type.id")
    entry_time: datetime = None  # Clock-in (can be None for roster-only shifts)
    exit_time: datetime = None   # Clock-out (can be None for roster-only shifts)
    location_lat: float = None
    location_lng: float = None
    task_label: str = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

**Validation**:
- date MUST be valid YYYY-MM-DD
- shift_type_id MUST reference valid ShiftType
- If entry_time is set, exit_time MUST be set (and > entry_time)
- Location coordinates MUST be valid (both lat/lng or both None)
- Unique constraint: (tenant_id, employee_id, date) - one shift per employee per day
- MUST NOT overlap with approved vacation (checked at service layer)

**Business Rules**:
- Moderator MUST NOT assign shift if employee has approved vacation on that date
- Unique (employee_id, date) per tenant

### 6. ShiftType
**Purpose**: Pre-configured shift definitions
**Relationships**: 1 ShiftType → many ShiftRecords

```python
class ShiftType(SQLModel, table=True):
    __tablename__ = "shift_type"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    tenant_id: str = Field(foreign_key="tenant.id")
    name: str  # E.g., "Mañana", "Noche", "Cortado", "Corrido"
    type: str  # Enum code: MAÑANA, NOCHE, CORTADO, CORRIDO
    time_windows: list  # JSON: [{start: "10:30", end: "18:00"}, ...]
    expected_hours: float  # E.g., 7.5, 8.0, 10.0
    uses_dynamic_close: bool  # If true, close time is flexible (e.g., "until close")
    description: str = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

**Validation**:
- name MUST be unique per tenant
- type MUST be one of: MAÑANA, NOCHE, CORTADO, CORRIDO
- expected_hours MUST be > 0
- time_windows MUST be non-empty list with valid times (HH:MM format)
- is_active MUST be boolean

---

## VacationBalance
**Purpose**: Track annual vacation accrual per employee
**Relationships**: 1 VacationBalance → 1 Employee

```python
class VacationBalance(SQLModel, table=True):
    __tablename__ = "vacation_balance"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    tenant_id: str = Field(foreign_key="tenant.id")
    employee_id: str = Field(foreign_key="employee.id")
    year: int  # E.g., 2024, 2025
    total_days: int  # E.g., 30
    used_days: int  # Count of approved vacation days
    remaining_days: int  # total_days - used_days
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Unique per employee per year
    __table_args__ = (UniqueConstraint('tenant_id', 'employee_id', 'year'),)
```

**Validation**:
- used_days MUST be <= total_days
- remaining_days MUST equal total_days - used_days
- year MUST be 4-digit number

**Business Rules**:
- updated_at MUST be refreshed when vacation request is approved/rejected
- Moderator CANNOT assign shifts if employee has insufficient balance

---

## Data Consistency Rules

### Referential Integrity
- All foreign keys enforced at database level
- Cascade delete: Tenant deletion cascades to all related records
- No employee deletion; instead set status = "Inactivo"

### Temporal Constraints
- VacationRequest dates MUST NOT overlap (implicit; checked at service layer)
- ShiftRecord dates MUST NOT conflict with approved VacationRequests
- All timestamps in UTC; dates in YYYY-MM-DD (tenant timezone applied at service layer)

### Tenant Isolation
- Every table has tenant_id foreign key
- Every query filters by tenant_id from JWT
- Cross-tenant queries impossible (schema constraint + service layer validation)

### Audit Trail
- Every modification tracked via created_at, updated_at timestamps
- Vacation approvals/rejections recorded with reviewed_by (moderator's user_id)
- Future enhancement: Full audit log table for compliance

---

## ER Diagram

```
Tenant (1) ──────── (∞) User
                     │
                     └─── (1) Employee
                           │
                           ├─── (∞) ShiftRecord ────── (1) ShiftType
                           │
                           └─── (∞) VacationRequest
                                     │
                                     └─── (1) Moderator (reviewed_by → User)

VacationBalance ──── (1) Employee ──── (1) Employee per year
```

---

## Migration Strategy

### Existing Tables (No Changes)
- `user` (already has employee_id, role)
- `employee` (already has department, status)
- `tenant` (no changes)
- `shift_type` (already has time_windows JSON)

### Existing Tables (Additions)
- `vacation_request`: Add `reviewed_by` (string, nullable), `reviewed_at` (datetime, nullable), `rejection_reason` (string, nullable)
  - Migration: `ALTER TABLE vacation_request ADD COLUMN reviewed_by VARCHAR, ADD COLUMN reviewed_at TIMESTAMP, ADD COLUMN rejection_reason TEXT;`
- `shift_record`: No changes (already has employee_id, shift_type_id, date)

### New Views (Optional, Post-MVP)
- `v_department_roster`: View showing employees and their shifts per department
- `v_vacation_summary`: Aggregated vacation by employee, status, date range

---

## Summary

Feature 006 leverages existing entities (User, Employee, Tenant, VacationRequest, ShiftRecord) without schema changes. Business logic is enforced at the service layer:

1. **Department Scoping**: Service queries filter by moderator's department
2. **Conflict Detection**: Service checks vacation approval before shift assignment
3. **Audit Trail**: Service records moderator_id and timestamp on approvals
4. **Temporal Constraints**: Service validates date ranges and prevents overlaps

The model is production-ready and supports multi-tenant expansion post-MVP.
