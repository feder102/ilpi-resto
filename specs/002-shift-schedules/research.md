# Research: Shift Schedule Configuration & Auto Calculation

**Feature**: `002-shift-schedules` | **Date**: 2026-02-28 | **Status**: Phase 0 Complete

---

## Research Questions Resolved

### R1: Hour Calculation for Split Shifts & Midnight Spans

**Question**: How to correctly calculate total hours for Cortado (split shift) and Noche (midnight-spanning shift)?

**Research Summary**:
- **Cortado split shift**: Two separate time windows (12:30-16:30, 18:30-22:30)
  - Calculation: (16:30 - 12:30) + (22:30 - 18:30) = 4 hours + 4 hours = 8 hours
  - Approach: Calculate duration for each window, sum totals

- **Noche overnight shift**: 17:00 to Cierre (dynamic close), may span midnight
  - Example: 17:00 to 00:00 (next day) = 7 hours; or 17:00 to 02:00 = 9 hours
  - Approach: Use `expected_hours` (7.7) for display; actual hours tracked via timeclocks
  - Rationale: Close time varies daily; storing expected_hours allows consistent shift definitions while actual times are flexible

- **Python implementation**: Use `datetime.time` objects for window starts/ends
  - For same-day windows: simple subtraction `(end - start).total_seconds() / 3600`
  - For midnight spans: detect when start > end (e.g., 23:00 to 06:00), add 24 hours to end before calculating

**Decision**: Store time_windows as array of {start_time, end_time} objects. Calculate total_hours as sum of all window durations. For overnight shifts, explicitly calculate across day boundary.

**Implementation approach**:
```python
def calculate_hours(time_windows: list[dict]) -> float:
    """Calculate total hours from multiple time windows, handling day boundaries."""
    total_minutes = 0
    for window in time_windows:
        start = datetime.strptime(window['start'], '%H:%M').time()
        end = datetime.strptime(window['end'], '%H:%M').time()

        if end < start:  # Spans midnight
            minutes = (24 * 60) - (start.hour * 60 + start.minute) + (end.hour * 60 + end.minute)
        else:
            minutes = (end.hour * 60 + end.minute) - (start.hour * 60 + start.minute)

        total_minutes += minutes

    return total_minutes / 60
```

**References**: Python `datetime` module, PostgreSQL `time` type support in SQLAlchemy

---

### R2: PostgreSQL Storage for Time Windows

**Question**: Should time windows be stored as PostgreSQL native types (tsrange, time arrays) or as JSON/embedded objects?

**Research Summary**:

| Approach | Pros | Cons |
|----------|------|------|
| **PostgreSQL `time` array** | Native type support, database-level validation, efficient | Limited query flexibility, complex indexes |
| **JSON/JSONB** | Flexible schema, easy to extend for future features, queryable with @> operator | No native validation, slightly larger storage |
| **Separate TimeWindow table (normalized)** | Full normalization, easy queries, but violates "one-time configuration" principle | Over-engineered for 4 shift types |

**Decision**: Use **JSON/JSONB** array within ShiftType table.

**Rationale**:
- ShiftType is low-cardinality data (4-5 shift types per tenant, rarely queried)
- JSON allows flexible window count per shift (Cortado: 2 windows, Mañana: 1 window)
- Queries are simple: `SELECT * FROM shift_type WHERE tenant_id = ? AND name = ?`
- Easy to extend for future features (e.g., per-window color coding, window labels)
- Alembic migration straightforward: just add `time_windows` JSON column

**Schema approach** (SQLModel):
```python
from sqlalchemy import JSON

class ShiftType(SQLModel, table=True):
    time_windows: list[dict] = Field(
        default=[],
        sa_column=Column(JSON, nullable=False),
        description="Array of {start_time: 'HH:MM', end_time: 'HH:MM'}"
    )
```

**References**: SQLAlchemy JSON type, PostgreSQL JSONB documentation, SQLModel Column mapping

---

### R3: API Design for Split Shift Time Windows

**Question**: How should time windows be represented in request/response payloads?

**Research Summary**:

**Request format** (POST /shift-types):
```json
{
  "name": "Cortado",
  "type": "CORTADO",
  "time_windows": [
    {"start": "12:30", "end": "16:30"},
    {"start": "18:30", "end": "22:30"}
  ],
  "uses_dynamic_close": false,
  "expected_hours": 8.0,
  "description": "Split shift with lunch break"
}
```

**Response format**:
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "name": "Cortado",
  "type": "CORTADO",
  "time_windows": [
    {"start": "12:30", "end": "16:30"},
    {"start": "18:30", "end": "22:30"}
  ],
  "uses_dynamic_close": false,
  "expected_hours": 8.0,
  "total_hours": 8.0,
  "is_active": true,
  "created_at": "2026-02-28T10:30:00Z",
  "updated_at": "2026-02-28T10:30:00Z"
}
```

**Validation rules**:
- `time_windows` array required, at least 1 window, max 3 windows
- Each window: start and end required, format "HH:MM" (00:00-23:59)
- Windows must not overlap within same shift type
- Windows must be ordered chronologically (earliest first)
- `expected_hours` must be positive decimal (0.5 to 24.0)
- Exact match to calculated total_hours (with 0.01 tolerance for rounding)

**Decision**: Use ISO 8601 time format (HH:MM), validate window ordering, require expected_hours match as sanity check.

**Pydantic schema**:
```python
from pydantic import BaseModel, field_validator

class TimeWindow(BaseModel):
    start: str  # HH:MM format
    end: str    # HH:MM format

    @field_validator('start', 'end')
    def validate_time_format(cls, v):
        try:
            datetime.strptime(v, '%H:%M')
            return v
        except ValueError:
            raise ValueError("Time must be in HH:MM format")

class ShiftTypeCreate(BaseModel):
    name: str
    type: str  # ShiftTypeEnum
    time_windows: list[TimeWindow]
    uses_dynamic_close: bool = False
    expected_hours: float
    description: str | None = None
```

**References**: Pydantic v2 field validators, ISO 8601 time format, REST API design best practices

---

## Dependency Analysis

### Resolved Clarifications (from spec)

| Clarification | Resolution | Impact |
|---------------|-----------|--------|
| Midnight spanning support | ✅ CONFIRMED — Noche & Corrido span midnight | Calculate hours across day boundary in logic |
| Split shift support | ✅ CONFIRMED — Cortado has 2 windows | time_windows as JSON array |
| Dynamic close time | ✅ CONFIRMED — Use expected_hours + timeclocks | Store expected_hours, actual on shift records |
| Shift type names | ✅ CONFIRMED — Use enum (Mañana, Noche, Cortado, Corrido) | Add ShiftTypeEnum to common/enums.py |

### Tech Stack Dependencies

| Dependency | Version | Rationale | Already Available |
|------------|---------|-----------|-------------------|
| FastAPI | 0.100+ | REST framework, ASGI | ✅ (backend/requirements.txt) |
| SQLModel | 0.0.14+ | ORM + Pydantic integration | ✅ (backend/requirements.txt) |
| Pydantic v2 | 2.0+ | Data validation, JSON schema | ✅ (backend/requirements.txt) |
| PostgreSQL JSON | 9.3+ | JSONB type support | ✅ (PostgreSQL 16) |
| Alembic | 1.12+ | Database migrations | ✅ (backend/alembic) |
| pytest | 7.0+ | Testing framework | ✅ (backend/requirements.txt) |
| Python datetime | stdlib | Time calculations | ✅ (Python 3.12) |

**Conclusion**: All dependencies already available. No new packages required.

---

## Architecture Decisions

### AD-001: Shift Type Configuration Scope

**Decision**: Shift types are organization-wide (tenant-level), not per-team. All teams within a tenant share the same shift type definitions.

**Rationale**: Organizational standard for shift schedules (Mañana, Noche, Cortado, Corrido). All kitchen teams follow the same schedule definitions. Reduces duplication, simplifies maintenance.

**Alternative**: Per-team custom shift definitions (rejected — over-engineered for MVP scope).

---

### AD-002: Expected Hours vs Actual Hours

**Decision**: `expected_hours` field on ShiftType contains the standard hours for that shift. Actual hours worked tracked separately via timesheets/shift records.

**Rationale**: For Noche and Corrido shifts that end at variable "Cierre" time, the actual hours vary daily. But employees expect consistent shift definitions (e.g., "Noche = 7.7 hours"). `expected_hours` provides consistency for scheduling; actual hours reconciled during timekeeping.

**Implementation**:
- ShiftType.expected_hours: Constant (e.g., 7.7)
- Team.total_hours: Calculated from time_windows (for display)
- ShiftRecord.actual_hours: Tracked via clock-in/clock-out (timekeeping feature)

---

### AD-003: Soft Delete for Shift Types

**Decision**: Shift types use soft delete via `is_active` flag. Deletion sets `is_active=False` instead of removing records.

**Rationale**: Preserves audit trail. Historical teams may reference deleted shift types. Soft delete allows "re-enabling" if needed.

**Implementation**:
- DELETE /shift-types/{id} → sets is_active=False (soft delete)
- GET /shift-types → lists only is_active=True (filter default)
- Query for active teams → exclude inactive shift types

---

## Research Completion Checklist

- ✅ Hour calculation strategy documented (split shifts, midnight spans)
- ✅ PostgreSQL storage approach selected (JSON for time_windows)
- ✅ API request/response format designed and validated
- ✅ Pydantic schemas outlined
- ✅ All dependencies verified (no new packages)
- ✅ Architecture decisions documented (3 key decisions)
- ✅ Validation rules comprehensive
- ✅ Alternative approaches considered and justified

**Phase 0 Status**: ✅ **COMPLETE** — Ready for Phase 1 design (data-model.md, contracts/)

