# Feature Specification: Kitchen Staff Management MVP

**Feature Branch**: `001-kitchen-staff-mgmt`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "SaaS system for kitchen staff management with RBAC, employee CRUD, vacation management, and shift rostering"

## Clarifications

### Session 2026-02-22

- Q: Multi-tenancy model — single-tenant, multi-tenant, or tenant-aware schema? → A: Tenant-aware schema with single tenant deployed. All entities MUST include a tenant_id foreign key. MVP deploys a single tenant (ILPI). Full multi-tenant onboarding deferred to future iteration.
- Q: Vacation day counting method — calendar days or business days? → A: Calendar days (dias naturales). All days in the requested date range are counted, including weekends and holidays.
- Q: Employee uniqueness constraints — which fields enforce uniqueness? → A: Both DNI and email MUST be unique per tenant. The system MUST reject creation or update of an employee if DNI or email already exists for another employee within the same tenant.
- Q: Soft delete or hard delete for employees? → A: Soft delete. Deleting an employee sets status to Inactivo and hides them from active lists. All historical records (shifts, vacations) are preserved for audit and referential integrity.
- Q: Can employees cancel their own vacation requests? → A: Employees can cancel only Pendiente requests. Aprobado requests require an admin or moderator to reject. Cancelled requests are set to a "Cancelado" status and do not affect balance.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Authentication & Role-Based Access (Priority: P1)

An administrator accesses the system and logs in with credentials. The
system authenticates the user and presents a navigation sidebar with
options filtered by role. Admins see all sections (Dashboard, Personal,
Equipos & Rotary, Control Horario, Vacaciones/Bajas, Reportes,
Configuracion). Moderators see everything except Configuracion.
Employees see only their own profile, their shifts, and their vacation
requests.

**Why this priority**: Without authentication and role enforcement, no
other feature can be securely delivered. This is the foundation for
every subsequent user story.

**Independent Test**: Can be fully tested by logging in with each of
the three roles (admin, moderator, employee) and verifying that the
navigation options and accessible data match the role's permissions.

**Acceptance Scenarios**:

1. **Given** a registered admin user, **When** they provide valid
   credentials, **Then** the system authenticates them and displays
   the full sidebar navigation (Panel Principal, Personal, Equipos &
   Rotary, Control Horario, Vacaciones/Bajas, Reportes,
   Configuracion).
2. **Given** a registered moderator user, **When** they log in,
   **Then** they see all sidebar sections except Configuracion.
3. **Given** a registered employee user, **When** they log in,
   **Then** they see only their personal profile, their assigned
   shifts, and their vacation requests.
4. **Given** any user, **When** they provide invalid credentials,
   **Then** the system denies access and shows a generic error message
   without revealing whether the email or password was incorrect.
5. **Given** a logged-in user, **When** they click "Cerrar Sesion",
   **Then** the session is terminated and they are redirected to the
   login screen.

---

### User Story 2 - Employee Management (Priority: P2)

An administrator navigates to the "Personal" section and manages the
full lifecycle of employee records. They can create new employees by
filling out a form with personal information (name, email, phone, DNI,
birth date, address, gender, marital status) and company data
(department, role, status, hire date, emergency contact, profile image).
They can search employees by name or DNI, filter by department, edit
existing records, and delete employees. Each employee card displays
status (Activo, Vacaciones, Ausente, Inactivo) with a color-coded badge.

**Why this priority**: Employee records are the core data entity that
all other features (vacations, shifts, teams) depend on. Without
employee management, no other module can function.

**Independent Test**: Can be fully tested by creating an employee,
verifying it appears in the list, editing their department, searching
by DNI, filtering by department, and deleting the record.

**Acceptance Scenarios**:

1. **Given** an admin on the Personal page, **When** they click "Nuevo
   Empleado" and fill all required fields, **Then** the new employee
   appears in the card grid with correct information and status badge.
2. **Given** a list of employees, **When** an admin types a name or
   DNI in the search field, **Then** only matching employees are
   displayed in real time.
3. **Given** a list of employees, **When** an admin selects a
   department from the filter dropdown, **Then** only employees in
   that department are shown.
4. **Given** an existing employee card, **When** an admin clicks the
   edit icon and modifies fields, **Then** the changes are persisted
   and reflected in the card.
5. **Given** an existing employee card, **When** an admin clicks the
   delete icon and confirms, **Then** the employee's status is set to
   Inactivo and they are hidden from active lists. All historical
   records (shifts, vacations) are preserved.
6. **Given** a moderator user, **When** they access the Personal
   section, **Then** they can view and edit employees but cannot
   delete them.

---

### User Story 3 - Vacation & Leave Management (Priority: P3)

An employee submits a vacation request specifying start and end dates.
The system calculates the number of requested days and validates that
the employee has enough remaining annual leave days. If the balance is
insufficient, the request is rejected with a clear message indicating
available days. Admins and moderators can review pending requests,
approve or reject them, and see all requests in a card grid with status
badges (Pendiente, Aprobado, Rechazado). The system tracks each
employee's annual vacation allowance and remaining balance.

**Why this priority**: Vacation management with strict day-limit
validation is a core business requirement that directly impacts
operational staffing and legal compliance.

**Independent Test**: Can be fully tested by setting an employee's
annual limit to 30 calendar days, submitting a 10-day request (should
succeed as pending), approving it, then submitting a 25-day request
(should be rejected due to only 20 days remaining).

**Acceptance Scenarios**:

1. **Given** an employee with 30 annual calendar days and 0 used,
   **When** they request 5 days off, **Then** the system creates a
   pending request and shows it with "Pendiente" status.
2. **Given** an employee with 30 annual days and 28 already approved,
   **When** they request 5 days off, **Then** the system rejects the
   request immediately and displays a message: "Saldo insuficiente.
   Dias disponibles: 2".
3. **Given** a pending vacation request, **When** an admin clicks the
   approve button, **Then** the request status changes to "Aprobado"
   and the employee's remaining balance decreases accordingly.
4. **Given** a pending vacation request, **When** an admin clicks the
   reject button, **Then** the request status changes to "Rechazado"
   and no days are deducted from the balance.
5. **Given** multiple vacation requests, **When** an admin views the
   Vacaciones section in "Solicitudes" tab, **Then** all requests are
   displayed as cards showing employee photo, name, department, date
   range, and status badge.

---

### User Story 4 - Shift Rostering & Task Assignment (Priority: P4)

An administrator assigns employees to rotation teams organized by
department (Cocina, Atencion al Publico, Barra, Direccion). Each team
has a defined shift type (Manana 09:00-17:00 or Tarde/Noche
18:00-02:00). Admins can also assign specific tasks to employees within
their shifts (e.g., "Cocina", "Parrilla", "Atencion al publico"). The
system provides a time-tracking mechanism where employees clock in and
out, recording the timestamp and optionally their GPS location. Shift
records are displayed in a recent activity table showing employee name,
date, entry time, exit time, and location.

**Why this priority**: Shift scheduling is essential for daily
operations but depends on having employee records (P2) and benefits
from vacation data (P3) to know who is available.

**Independent Test**: Can be fully tested by creating a team in Cocina
department, assigning two employees to the morning shift, having one
employee clock in via the attendance view, verifying the shift record
appears in the table, and then clocking out.

**Acceptance Scenarios**:

1. **Given** an admin on the Equipos & Rotary page with "Cocina"
   department selected, **When** they assign an employee to Equipo A
   (Manana), **Then** the employee appears as a member chip in that
   team section.
2. **Given** an admin viewing available employees in the right panel,
   **When** they move an employee to a team, **Then** the employee is
   removed from the available pool and appears in the team roster.
3. **Given** an employee on the Control Horario page, **When** they
   initiate a clock-in via the QR/attendance mechanism, **Then** a
   new shift record is created with the current timestamp as entry
   time.
4. **Given** an employee with an active shift (clocked in, no exit
   time), **When** they clock out, **Then** the exit time is recorded
   and the shift record shows both entry and exit times.
5. **Given** shift records exist, **When** an admin views the
   Registros Recientes table, **Then** each row shows employee photo,
   name, date, entry time (green badge), exit time (orange badge or
   "En turno..."), and a "Ver GPS" link.
6. **Given** an admin managing tasks, **When** they assign a task
   label (e.g., "Parrilla") to an employee's shift, **Then** the
   task is associated with that shift record and visible in the
   schedule view.

---

### Edge Cases

- What happens when an employee requests vacation days that span across
  two calendar years? **Assumption**: Days are deducted from the year in
  which the vacation start date falls. Cross-year requests consume only
  from the starting year's balance.
- What happens when an admin tries to deactivate an employee who has
  pending vacation requests? The system MUST warn the admin and require
  explicit confirmation. Pending requests MUST be automatically rejected
  upon deactivation.
- What happens when two admins approve/reject the same vacation request
  simultaneously? The system MUST use optimistic concurrency control;
  the second action MUST fail with a conflict message.
- What happens when an employee is assigned to a shift but is on
  approved vacation for that date? The system MUST prevent the
  assignment and display a warning indicating the employee is
  unavailable.
- What happens when an employee tries to clock in twice without
  clocking out? The system MUST prevent duplicate active shifts and
  prompt the employee to clock out first.
- What happens when a department has no available employees for a
  shift? The system MUST display a clear warning to the admin rather
  than allowing an empty team assignment.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Authorization**

- **FR-001**: System MUST support user authentication with email and
  password. Admin users MUST be able to create (register) new user
  accounts for moderators and employees. Self-registration is not
  supported; only admins can provision new users.
- **FR-002**: System MUST enforce role-based access control (RBAC) with
  three roles: Admin, Moderador, Empleado.
- **FR-003**: Admin role MUST have full access to all system sections
  and operations.
- **FR-004**: Moderador role MUST have access to all sections except
  Configuracion, and MUST NOT be able to delete employees.
- **FR-005**: Empleado role MUST only access their own profile, their
  assigned shifts, and their vacation requests.
- **FR-006**: System MUST enforce session expiration and provide a
  logout mechanism.

**Employee Management**

- **FR-007**: System MUST provide full CRUD operations for employee
  records. Deletion MUST be implemented as soft delete (setting status
  to Inactivo). Soft-deleted employees MUST be hidden from active lists
  but their historical records (shifts, vacations) MUST be preserved.
- **FR-008**: Employee records MUST include: first name, last name,
  email, phone, DNI, address, birth date, marital status, gender,
  role, department, status, hire date, profile image, and optional
  emergency contact.
- **FR-009**: System MUST support four employee statuses: Activo,
  Vacaciones, Ausente, Inactivo.
- **FR-010**: System MUST support four departments: Cocina, Atencion
  al Publico, Barra, Direccion.
- **FR-011**: System MUST provide search functionality by employee name
  and DNI.
- **FR-012**: System MUST provide filtering by department.
- **FR-012b**: System MUST enforce uniqueness of DNI and email per
  tenant. Creating or updating an employee with a duplicate DNI or email
  within the same tenant MUST be rejected with a specific error message.

**Vacation Management**

- **FR-013**: Each employee MUST have a configurable annual vacation day
  limit. Days are counted as calendar days (dias naturales), including
  weekends and holidays.
- **FR-014**: System MUST validate that a vacation request does not
  exceed the employee's remaining available days. If exceeded, the
  request MUST be rejected immediately with the remaining balance
  displayed.
- **FR-015**: Vacation requests MUST have four possible statuses:
  Pendiente, Aprobado, Rechazado, Cancelado.
- **FR-015b**: Employees MUST be able to cancel their own requests
  only when status is Pendiente. Cancellation sets status to Cancelado
  and does not affect the vacation balance.
- **FR-016**: Only Admin and Moderador roles MUST be able to approve
  or reject vacation requests. Employees MUST NOT be able to cancel
  Aprobado requests; only an admin or moderator can reject them.
- **FR-017**: Approving a vacation request MUST deduct the corresponding
  days from the employee's annual balance.
- **FR-018**: Rejecting a vacation request MUST NOT affect the
  employee's balance.

**Shift Rostering & Tasks**

- **FR-019**: System MUST support creating rotation teams organized by
  department.
- **FR-020**: Each team MUST have a defined shift type with start and
  end times (e.g., Manana 09:00-17:00, Tarde/Noche 18:00-02:00).
- **FR-021**: System MUST allow assigning employees to teams within
  their department.
- **FR-022**: System MUST support assigning specific task labels to
  employee shifts (e.g., "Cocina", "Parrilla", "Atencion al publico").
- **FR-023**: System MUST provide a clock-in/clock-out mechanism that
  records timestamps.
- **FR-024**: Shift records MUST capture: employee, date, entry time,
  exit time, and optional GPS location.
- **FR-025**: System MUST prevent an employee from clocking in if they
  already have an active (unclosed) shift.

**Dashboard & Reporting**

- **FR-026**: System MUST display a dashboard with summary statistics:
  total staff count, employees currently on shift, employees on
  vacation, and pending vacation requests.
- **FR-027**: System MUST provide a reports view with hours-per-day
  charts and department distribution visualizations.

**UI Reference**

- **FR-028**: The frontend MUST follow the UI design and component
  structure defined in the design reference (views, components, layout,
  and navigation patterns as specified in the design artifacts).

### Key Entities

- **Tenant**: Represents an organization (restaurant) in the system.
  Attributes: name, slug (unique identifier), timezone, locale, status
  (active/suspended). All other entities reference a Tenant. MVP deploys
  with a single tenant (ILPI, Villa Joyosa).
- **User**: Represents an authenticated system user. Attributes: email,
  hashed password, role (Admin/Moderador/Empleado), tenant reference,
  linked employee profile (optional for admin-only users). A User
  belongs to one Tenant and may or may not be linked to an Employee
  record.
- **Employee**: Represents a staff member. Attributes: tenant reference,
  first name, last name, email (unique per tenant), phone, DNI (unique
  per tenant), address, birth date, marital status, gender, role,
  department, status, hire date, profile image, emergency contact. An
  Employee belongs to one Tenant, has many ShiftRecords, many
  VacationRequests, and belongs to zero or one Team.
- **Team**: Represents a rotation group within a department. Attributes:
  tenant reference, name, department, shift type (with start/end times),
  member list. A Team belongs to one Tenant, one Department, and has
  many Employees.
- **ShiftRecord**: Represents a single clock-in/clock-out event.
  Attributes: employee reference, date, entry time, exit time, GPS
  location, optional task label. A ShiftRecord belongs to one Employee.
- **VacationRequest**: Represents a leave request. Attributes: employee
  reference, start date, end date, status (Pendiente/Aprobado/
  Rechazado/Cancelado), requested days count. A VacationRequest belongs
  to one Employee.
- **VacationBalance**: Tracks annual vacation allowance per employee.
  Attributes: employee reference, year, total annual days, used days,
  remaining days. One per Employee per calendar year.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can create a new employee record and
  verify it appears in the staff list within 3 seconds.
- **SC-002**: An employee can submit a vacation request and receive
  immediate validation feedback (approval or balance rejection) within
  2 seconds.
- **SC-003**: The vacation balance validation MUST correctly reject
  100% of requests that exceed available days, with zero false
  approvals.
- **SC-004**: An administrator can assign an employee to a team and
  see the updated roster within 2 seconds.
- **SC-005**: An employee can clock in and out, with the shift record
  appearing in the activity table within 3 seconds.
- **SC-006**: Role-based access control MUST correctly restrict
  navigation and operations for all three roles with zero unauthorized
  access paths.
- **SC-007**: The system MUST support at least 50 concurrent users
  without degradation in response times.
- **SC-008**: 90% of first-time admin users can complete the employee
  creation flow without external assistance.

### Assumptions

- The default annual vacation allowance is 30 calendar days (dias
  naturales) per employee (Spanish labor standard, Art. 38 Estatuto de
  los Trabajadores), configurable per employee by an admin.
- The system operates in Spanish (es) locale for all UI text.
- The restaurant is located in Villa Joyosa, Alicante, Spain — timezone
  is Europe/Madrid (CET/CEST).
- Profile images use placeholder URLs during MVP; a file upload feature
  is deferred to a future iteration.
- GPS location capture during clock-in is optional and depends on device
  capabilities; the system MUST function without it.
- The QR-based clock-in mechanism in MVP is simulated via an employee
  selector dropdown; real QR camera scanning is deferred to a future
  iteration.
- The "Calendario Anual" view in vacations and the "Exportar PDF/Excel"
  feature in reports are deferred to a future iteration.
- The Gemini AI integration (Staff Insights, Autogenerate Rotary) is
  deferred to a future iteration.
