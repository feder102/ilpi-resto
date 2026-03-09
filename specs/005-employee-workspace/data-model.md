# Data Model: Employee Workspace Portal

**Feature**: 005-employee-workspace | **Date**: 2026-03-09

---

## Entity Relationships Diagram

```
User (existing)
├── id (UUID, PK)
├── email (str, unique per tenant)
├── hashed_password (str) [UPDATED: password_setup flow]
├── role (enum: Admin, Moderador, Empleado)
├── employee_id (FK → Employee.id, nullable)
├── tenant_id (FK → Tenant.id)
└── [status, created_at, updated_at, last_login]

Employee (existing)
├── id (UUID, PK)
├── tenant_id (FK → Tenant.id)
├── first_name, last_name, email, dni
└── [other fields: department, hire_date, status, etc]

TimeRecord [NEW - Feature 005]
├── id (UUID, PK)
├── tenant_id (FK → Tenant.id)
├── employee_id (FK → Employee.id)
├── date (date)
├── clock_in_timestamp (datetime, immutable)
├── clock_out_timestamp (datetime | NULL, nullable)
├── location_lat, location_lng (optional for future)
└── created_at (datetime, immutable)

ShiftRecord (existing, from Feature 004)
├── id (UUID, PK)
├── tenant_id (FK → Tenant.id)
├── employee_id (FK → Employee.id)
├── date (date)
├── shift_type_id (FK → ShiftType.id)
└── [entry_time, exit_time, task_label, etc]

VacationRequest (existing, from Feature 001)
├── id (UUID, PK)
├── tenant_id (FK → Tenant.id)
├── employee_id (FK → Employee.id)
├── start_date (date)
├── end_date (date)
├── status (enum: Pendiente, Aprobado, Rechazado, Cancelado)
└── [requested_days, reviewed_by, reviewed_at, version]

VacationBalance (existing, from Feature 001)
├── id (UUID, PK)
├── tenant_id (FK → Tenant.id)
├── employee_id (FK → Employee.id)
├── year (int)
├── total_days (int)
├── used_days (int)
└── remaining_days (computed: total_days - used_days)

ShiftType (existing, from Feature 004)
├── id (UUID, PK)
├── tenant_id (FK → Tenant.id)
├── name (str: "Mañana", "Noche", etc)
├── type (str: "MANANA", "NOCHE", etc)
└── [time_windows, expected_hours, is_active, etc]
```

---

## New Entity: TimeRecord

### Definition

Immutable clock-in/out records for time tracking. Each entry captures when an employee clocked in and clocked out on a specific date.

### Attributes

| Attribute | Type | Constraints | Notes |
|-----------|------|-------------|-------|
| `id` | UUID | PK | Generated on creation |
| `tenant_id` | UUID | FK(Tenant), NOT NULL, indexed | Multi-tenant isolation |
| `employee_id` | UUID | FK(Employee), NOT NULL, indexed | Who clocked in |
| `date` | date | NOT NULL, indexed | Date of the clock-in (not timestamp) |
| `clock_in_timestamp` | datetime(UTC) | NOT NULL, immutable | When employee clicked "Clock In" (server time) |
| `clock_out_timestamp` | datetime(UTC) | NULL, immutable | When employee clicked "Clock Out" (if clocked out) |
| `location_lat` | float | NULL | Future: geolocation (v2) |
| `location_lng` | float | NULL | Future: geolocation (v2) |
| `created_at` | datetime(UTC) | NOT NULL, immutable | Record creation time |
| `updated_at` | datetime(UTC) | NOT NULL | Last update (only when clock_out) |

### Unique Constraints

```sql
-- Only one active clock-in per employee per day
UNIQUE (tenant_id, employee_id, date, clock_out_timestamp IS NULL)
-- Explanation: Allows multiple records per day ONLY if previous one was clocked out
-- Prevents: Employee clock-in twice on same day without clocking out first
```

### Indexes

```sql
-- Query optimization
CREATE INDEX idx_time_record_employee_date
  ON time_record(tenant_id, employee_id, date DESC);

CREATE INDEX idx_time_record_date_range
  ON time_record(tenant_id, employee_id, date DESC)
  WHERE clock_out_timestamp IS NOT NULL;  -- For "completed records" queries
```

### State Transitions

```
[No clock-in on this date]
    ↓ (Employee clicks "Clock In")
[Clock In @ 08:30] (clock_in_timestamp = 08:30:00, clock_out_timestamp = NULL)
    ↓ (Employee clicks "Clock Out")
[Clock In @ 08:30, Clock Out @ 17:30] (both timestamps set)
    ↓
[Read-only] (cannot edit, cannot clock in again without clocking out)
```

---

## Modified Entities

### User (Password Setup)

**New/Updated Fields**:

| Field | Type | Change | Notes |
|-------|------|--------|-------|
| `hashed_password` | str | NULL → Optional | Allow NULL for initial account creation |
| `password_reset_token` | str | NEW | Token for password-setup email |
| `password_reset_expires` | datetime | NEW | Token expiration (15 minutes) |
| `is_active` | bool | NEW or UPDATE | False until password set; True after setup |
| `last_login` | datetime | UPDATE | Track login time for audit |

**State Machine**:
```
[Account created by admin]
  is_active = False
  hashed_password = NULL
  password_reset_token = xyz (unique, time-limited)
    ↓ (Employee clicks email link, enters password)
[Password set]
  is_active = True
  hashed_password = bcrypt(password)
  password_reset_token = NULL
  last_login = now
    ↓ (Normal login)
[Authenticated]
  JWT issued, employee accesses dashboard
```

---

## Existing Entities (No Changes)

### ShiftRecord

Used by employee to view schedule. **No new fields**. Employee sees read-only view via existing GET endpoint (scoped to own shifts).

### VacationRequest, VacationBalance

Used by employee to request time off. **No new fields**. Employee sees read-only view of requests + balance via existing endpoints (scoped to own).

### ShiftType

Used by employee to see shift names in calendar. **No new fields**. Readonly from employee perspective.

---

## Validation Rules

### TimeRecord Validation

| Rule | Validation | Error |
|------|-----------|-------|
| **Clock-in only on scheduled shift day** | `ShiftRecord exists for (employee_id, date)` | "You have no shift scheduled today" |
| **No double clock-in** | `No active clock-in for (employee_id, date) where clock_out = NULL` | "Already clocked in today" |
| **Clock-out only when clocked in** | `Existing record with clock_in_timestamp != NULL and clock_out_timestamp = NULL` | "Not clocked in" |
| **Clock-out after clock-in** | `clock_out_timestamp > clock_in_timestamp` | "System error: invalid timestamps" (should not happen) |
| **No future timestamps** | `clock_in_timestamp, clock_out_timestamp <= now()` | "Cannot use future time" |
| **Immutable after clock-out** | `No updates allowed` | "Time records cannot be edited" (at API level) |

### User Validation (Password Setup)

| Rule | Validation | Error |
|------|-----------|-------|
| **Valid email** | `Email format valid` | "Invalid email address" |
| **Email exists in system** | `User.email matches admin-created account` | "Email not found in system" |
| **Token not expired** | `password_reset_expires > now()` | "Link has expired. Request new password reset." |
| **Strong password** | `Password length >= 8, mixed case, numbers` | "Password too weak" |
| **Token one-time use** | `Token consumed after password set` | "This link has already been used" |

---

## Data Retention & Archival

### TimeRecord

- **Retention**: 3 years (per payroll/labor law)
- **Archival**: Move to historical table after 3 years
- **Deletion**: After archive period, permanent deletion (no customer-accessible recovery)

### User (Password Setup)

- **password_reset_token**: Deleted after use or expiration
- **password_reset_expires**: Field retained for audit trail

### Audit Logging

All security-relevant events logged (separate from business tables):

```json
{
  "timestamp": "2026-03-09T14:30:00Z",
  "event_type": "TIME_RECORD_CLOCK_IN",
  "actor_id": "emp-123",
  "actor_role": "Empleado",
  "target_resource": "TimeRecord",
  "action": "CREATE",
  "result": "SUCCESS",
  "tenant_id": "tenant-1",
  "details": {
    "employee_id": "emp-123",
    "date": "2026-03-09",
    "clock_in_timestamp": "2026-03-09T14:30:00Z"
  }
}
```

---

## Migration Strategy (Alembic)

### Phase 1: Create TimeRecord Table

```python
# migration: add_time_records_table

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    op.create_table(
        'time_record',
        sa.Column('id', sa.UUID, primary_key=True),
        sa.Column('tenant_id', sa.UUID, sa.ForeignKey('tenant.id'), nullable=False, index=True),
        sa.Column('employee_id', sa.UUID, sa.ForeignKey('employee.id'), nullable=False, index=True),
        sa.Column('date', sa.Date, nullable=False),
        sa.Column('clock_in_timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('clock_out_timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('location_lat', sa.Float, nullable=True),
        sa.Column('location_lng', sa.Float, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('tenant_id', 'employee_id', 'date', 'clock_out_timestamp', name='uq_active_clock_in'),
        sa.Index('idx_time_record_employee_date', 'tenant_id', 'employee_id', postgresql_using='btree'),
    )

def downgrade():
    op.drop_table('time_record')
```

### Phase 2: Update User Table

```python
# migration: add_password_setup_fields

def upgrade():
    op.add_column('user', sa.Column('password_reset_token', sa.String, nullable=True, unique=True))
    op.add_column('user', sa.Column('password_reset_expires', sa.DateTime(timezone=True), nullable=True))
    op.add_column('user', sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'))
    op.add_column('user', sa.Column('last_login', sa.DateTime(timezone=True), nullable=True))
    # Make hashed_password nullable for new accounts without password
    op.alter_column('user', 'hashed_password', existing_type=sa.String, nullable=True)

def downgrade():
    op.alter_column('user', 'hashed_password', existing_type=sa.String, nullable=False)
    op.drop_column('user', 'is_active')
    op.drop_column('user', 'last_login')
    op.drop_column('user', 'password_reset_expires')
    op.drop_column('user', 'password_reset_token')
```

---

## Performance Considerations

### Query Patterns

**Most Common Queries** (order by frequency):

1. **Get employee's today's clock status** (100x/day)
   - Query: `SELECT * FROM time_record WHERE employee_id=? AND date=today() AND clock_out_timestamp IS NULL`
   - Index: `idx_time_record_employee_date` ✅

2. **Get employee's time records for range** (10x/day)
   - Query: `SELECT * FROM time_record WHERE employee_id=? AND date BETWEEN ? AND ? ORDER BY date DESC`
   - Index: `idx_time_record_employee_date` ✅

3. **Check if employee has shift today** (5x/day, to enable clock-in)
   - Query: `SELECT * FROM shift_record WHERE employee_id=? AND date=today()`
   - Index: Existing on ShiftRecord ✅

4. **Get vacation balance** (2x/day)
   - Query: `SELECT * FROM vacation_balance WHERE employee_id=? AND year=now().year`
   - Index: Existing ✅

### Load Testing Scenarios

- **50 employees clock in within 1 minute**: All records created successfully, <500ms response time
- **Calendar render with 1000 shifts**: Page loads <3s, smooth scrolling
- **Vacation balance query**: <100ms response, no N+1 queries

---

## Data Privacy & Security

### PII Handling

- **Employee personal data**: Stored unencrypted (post-MVP: column encryption)
- **Passwords**: Hashed with bcrypt (cost ≥10)
- **Tokens**: Time-limited, one-time use
- **Logs**: No employee names, emails, DNI in plaintext logs (post-MVP: hash PII in logs)

### Access Control

- **Rows**: Employee can access only own records (enforced at service layer)
- **Columns**: All fields visible to employee (no sensitive column hiding)
- **Admin**: Can see all employee records for payroll/auditing

---

## Example Data Scenarios

### Scenario 1: New Employee First Login

```
1. Admin creates employee account (email: juan@ilpi.es)
   User { email: juan@ilpi.es, hashed_password: NULL, is_active: false, password_reset_token: "xyz", password_reset_expires: 2026-03-09 10:15 }

2. Juan receives email with link: /auth/password-setup?token=xyz

3. Juan clicks link, enters password "SecurePass123"
   API POST /auth/password-setup { token: "xyz", password: "SecurePass123" }
   Updates: User { hashed_password: bcrypt(...), is_active: true, password_reset_token: NULL, last_login: 2026-03-09 10:10 }

4. Juan logs in with email + password
   API POST /auth/login { email: "juan@ilpi.es", password: "SecurePass123" }
   Returns: JWT { sub: user-123, employee_id: emp-456, role: "Empleado", exp: 2026-03-09 11:10 }

5. Juan accesses /dashboard → sees Shifts, Vacations, Time Tracking
```

### Scenario 2: Clock In/Out Workflow

```
1. Juan navigates to Time Tracking view
   GET /employee/time-tracking?date=2026-03-09
   Returns: No active time record, show "Clock In" button (because shift exists for today)

2. Juan clicks "Clock In" at 8:30 AM
   POST /employee/time-tracking/clock-in
   Creates: TimeRecord { employee_id: emp-456, date: 2026-03-09, clock_in_timestamp: 2026-03-09 08:30:15, clock_out_timestamp: NULL, created_at: now() }
   Response: { status: "clocked-in", elapsed_time: "0m", clock_out_button: visible }

3. Juan clicks "Clock Out" at 5:30 PM
   POST /employee/time-tracking/clock-out
   Updates: TimeRecord { clock_out_timestamp: 2026-03-09 17:30:42 }
   Response: { status: "clocked-out", total_time: "9h 0m", summary: "Clock In: 8:30 AM, Clock Out: 5:30 PM" }

4. Juan tries to edit the clock-in time
   PUT /employee/time-tracking/records/record-123 { clock_in_timestamp: "08:20" }
   Returns: 403 Forbidden - "Time records cannot be edited"
```

### Scenario 3: Vacation Overlap with Shifts

```
1. Juan has shifts on: 2026-03-10, 2026-03-11, 2026-03-12 (ShiftRecords exist)

2. Juan requests vacation: 2026-03-11 to 2026-03-12
   POST /vacations/requests { start_date: "2026-03-11", end_date: "2026-03-12" }
   Creates: VacationRequest { status: "Pendiente", ... }

3. Admin approves: PATCH /vacations/requests/req-789 { status: "Aprobado" }
   Updates: VacationRequest { status: "Aprobado" }
   VacationBalance { used_days: += 2 }

4. Juan views dashboard:
   - Vacation view: Shows "Approved: Mar 11-12" ✅
   - Shift view: Shows "Mar 11-12" shifts (marked as "On Vacation" or with icon)
   - No auto-deletion of shifts (admin may reassign)
```
