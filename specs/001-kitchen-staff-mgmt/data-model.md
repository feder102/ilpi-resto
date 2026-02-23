# Data Model: Kitchen Staff Management MVP

**Branch**: `001-kitchen-staff-mgmt` | **Date**: 2026-02-22

## Entity Relationship Diagram (Textual)

```text
Tenant 1──* User
Tenant 1──* Employee
Tenant 1──* Team

User *──0..1 Employee        (optional link)

Employee *──1 Team           (belongs to 0..1 team)
Employee 1──* ShiftRecord
Employee 1──* VacationRequest
Employee 1──* VacationBalance (one per year)

Team *──1 Department         (enum, not a table)
```

## Entities

### Tenant

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| name | str | NOT NULL, max 100 | Organization name |
| slug | str | UNIQUE, NOT NULL, max 50 | URL-safe identifier |
| timezone | str | NOT NULL, default "Europe/Madrid" | IANA timezone |
| locale | str | NOT NULL, default "es" | UI locale |
| is_active | bool | NOT NULL, default True | Tenant status |
| created_at | datetime | NOT NULL, auto | Creation timestamp |
| updated_at | datetime | NOT NULL, auto-update | Last modification |

### User

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| tenant_id | UUID | FK→Tenant, NOT NULL, indexed | Tenant scope |
| email | str | NOT NULL, max 255 | Login email |
| hashed_password | str | NOT NULL | bcrypt hash |
| role | Role enum | NOT NULL | Admin/Moderador/Empleado |
| employee_id | UUID | FK→Employee, NULLABLE, UNIQUE | Linked profile |
| is_active | bool | NOT NULL, default True | Account status |
| created_at | datetime | NOT NULL, auto | Creation timestamp |
| updated_at | datetime | NOT NULL, auto-update | Last modification |

**Unique constraints**: `(tenant_id, email)`

### Employee

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| tenant_id | UUID | FK→Tenant, NOT NULL, indexed | Tenant scope |
| first_name | str | NOT NULL, max 100 | Given name |
| last_name | str | NOT NULL, max 100 | Family name |
| email | str | NOT NULL, max 255 | Contact email |
| phone | str | NULLABLE, max 20 | Phone number |
| dni | str | NOT NULL, max 20 | Spanish ID document |
| address | str | NULLABLE, max 500 | Home address |
| birth_date | date | NULLABLE | Date of birth |
| marital_status | MaritalStatus enum | NULLABLE | Personal status |
| gender | Gender enum | NULLABLE | Gender identity |
| role | Role enum | NOT NULL | Organizational role |
| department | Department enum | NOT NULL | Work department |
| status | StaffStatus enum | NOT NULL, default ACTIVE | Employment status |
| hire_date | date | NOT NULL | Employment start |
| profile_image | str | NULLABLE, max 500 | Image URL |
| emergency_contact | str | NULLABLE, max 255 | Emergency phone/name |
| is_active | bool | NOT NULL, default True | Soft delete flag |
| team_id | UUID | FK→Team, NULLABLE | Assigned team |
| created_at | datetime | NOT NULL, auto | Creation timestamp |
| updated_at | datetime | NOT NULL, auto-update | Last modification |

**Unique constraints**: `(tenant_id, dni)`, `(tenant_id, email)`

### Team

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| tenant_id | UUID | FK→Tenant, NOT NULL, indexed | Tenant scope |
| name | str | NOT NULL, max 100 | Team name (e.g., "Equipo A") |
| department | Department enum | NOT NULL | Department assignment |
| shift_type | str | NOT NULL, max 50 | Shift label (Mañana/Tarde-Noche) |
| shift_start | time | NOT NULL | Shift start time |
| shift_end | time | NOT NULL | Shift end time |
| is_active | bool | NOT NULL, default True | Soft delete flag |
| created_at | datetime | NOT NULL, auto | Creation timestamp |
| updated_at | datetime | NOT NULL, auto-update | Last modification |

**Unique constraints**: `(tenant_id, name, department)`

### ShiftRecord

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| tenant_id | UUID | FK→Tenant, NOT NULL, indexed | Tenant scope |
| employee_id | UUID | FK→Employee, NOT NULL, indexed | Clock-in employee |
| date | date | NOT NULL | Shift date |
| entry_time | datetime | NOT NULL | Clock-in timestamp |
| exit_time | datetime | NULLABLE | Clock-out timestamp |
| location_lat | float | NULLABLE | GPS latitude |
| location_lng | float | NULLABLE | GPS longitude |
| task_label | str | NULLABLE, max 100 | Assigned task |
| created_at | datetime | NOT NULL, auto | Creation timestamp |
| updated_at | datetime | NOT NULL, auto-update | Last modification |

**Business rules**:
- Only one active shift (exit_time IS NULL) per employee at any time.
- entry_time MUST be before exit_time when exit_time is set.

### VacationRequest

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| tenant_id | UUID | FK→Tenant, NOT NULL, indexed | Tenant scope |
| employee_id | UUID | FK→Employee, NOT NULL, indexed | Requesting employee |
| start_date | date | NOT NULL | Vacation start |
| end_date | date | NOT NULL | Vacation end (inclusive) |
| requested_days | int | NOT NULL | Calendar days count |
| status | VacationStatus enum | NOT NULL, default PENDING | Request status |
| reviewed_by | UUID | FK→User, NULLABLE | Admin/mod who reviewed |
| reviewed_at | datetime | NULLABLE | Review timestamp |
| version | int | NOT NULL, default 1 | Optimistic concurrency |
| created_at | datetime | NOT NULL, auto | Creation timestamp |
| updated_at | datetime | NOT NULL, auto-update | Last modification |

**Business rules**:
- `requested_days = (end_date - start_date).days + 1` (calendar days,
  inclusive).
- start_date MUST be before or equal to end_date.
- start_date MUST be in the future (or today).
- `version` field incremented on each status change for optimistic
  concurrency control.

### VacationBalance

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| tenant_id | UUID | FK→Tenant, NOT NULL, indexed | Tenant scope |
| employee_id | UUID | FK→Employee, NOT NULL, indexed | Employee reference |
| year | int | NOT NULL | Calendar year |
| total_days | int | NOT NULL, default 30 | Annual allowance |
| used_days | int | NOT NULL, default 0 | Days consumed |
| created_at | datetime | NOT NULL, auto | Creation timestamp |
| updated_at | datetime | NOT NULL, auto-update | Last modification |

**Unique constraints**: `(tenant_id, employee_id, year)`

**Business rules**:
- `remaining_days = total_days - used_days` (computed, not stored).
- `used_days` incremented only when VacationRequest status transitions
  to Aprobado.
- `used_days` decremented when an Aprobado request is later Rechazado
  by admin.

## Enums

### Role
```
ADMIN = "Admin"
MODERADOR = "Moderador"
EMPLEADO = "Empleado"
```

### Department
```
COCINA = "Cocina"
ATENCION_AL_PUBLICO = "Atención al Público"
BARRA = "Barra"
DIRECCION = "Dirección"
```

### StaffStatus
```
ACTIVO = "Activo"
VACACIONES = "Vacaciones"
AUSENTE = "Ausente"
INACTIVO = "Inactivo"
```

### MaritalStatus
```
SOLTERO = "Soltero/a"
CASADO = "Casado/a"
DIVORCIADO = "Divorciado/a"
VIUDO = "Viudo/a"
PAREJA_DE_HECHO = "Pareja de hecho"
```

### Gender
```
MASCULINO = "Masculino"
FEMENINO = "Femenino"
OTRO = "Otro"
```

### VacationStatus
```
PENDIENTE = "Pendiente"
APROBADO = "Aprobado"
RECHAZADO = "Rechazado"
CANCELADO = "Cancelado"
```

## State Transitions

### Employee Status
```
ACTIVO → VACACIONES    (auto: when approved vacation starts)
ACTIVO → AUSENTE       (manual: admin marks absence)
ACTIVO → INACTIVO      (soft delete)
VACACIONES → ACTIVO    (auto: when vacation ends)
AUSENTE → ACTIVO       (manual: admin restores)
INACTIVO → ACTIVO      (manual: admin reactivates)
```

### VacationRequest Status
```
PENDIENTE → APROBADO   (admin/moderator approves; balance deducted)
PENDIENTE → RECHAZADO  (admin/moderator rejects; no balance change)
PENDIENTE → CANCELADO  (employee self-cancels; no balance change)
APROBADO → RECHAZADO   (admin/moderator revokes; balance restored)
```

## Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| user | idx_user_tenant_email | tenant_id, email | Login lookup |
| employee | idx_employee_tenant_dni | tenant_id, dni | DNI uniqueness |
| employee | idx_employee_tenant_email | tenant_id, email | Email uniqueness |
| employee | idx_employee_tenant_dept | tenant_id, department | Dept filter |
| employee | idx_employee_is_active | tenant_id, is_active | Active list |
| shift_record | idx_shift_employee_date | employee_id, date | Shift lookup |
| shift_record | idx_shift_active | employee_id, exit_time | Active shift check |
| vacation_request | idx_vacation_employee | employee_id, status | Request list |
| vacation_balance | idx_balance_employee_year | employee_id, year | Balance lookup |

## Seed Data (MVP)

One tenant:
- name: "ILPI", slug: "ilpi", timezone: "Europe/Madrid", locale: "es"

One admin user:
- email: "admin@ilpi.es", role: Admin, linked to employee record

One employee (admin's profile):
- Juan García, DNI: "12345678A", department: Dirección, status: Activo
