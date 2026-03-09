# Feature Specification: Employee Workspace Portal

**Feature Branch**: `005-employee-workspace`
**Created**: 2026-03-09
**Status**: Draft
**Input**: User description: "Vamos a trabajar en la vista del empleado, arrancando con el login, debe permitirle crear su contraseña con el email que le cargo el administrador o moderador, una vez que obtenga la contraseña va ingresar al proyecto, la unica vista que puede ver es su calendario de trabajo, el pedido de vacaciones y el control de fichaje, donde solo puede marcar entrada y salida, sin modificar la hora. obviamente que solo puede verse asi mismo y ningun otro empleado"

---

## User Scenarios & Testing

### User Story 1 - Employee Password Setup & First Login (Priority: P1)

**As an** employee who receives a new account from admin/moderador
**I want to** set my own password using my email
**So that** I can securely log in to the employee portal

[Describe this user journey in plain language]

An employee receives notification that a new account has been created with their email. They visit the login page and use their email to initiate a password setup flow. They create a secure password and log in successfully. Upon first login, they see their personalized employee dashboard.

**Why this priority**: This is the foundation - without login and password setup, no employee can access any features. This is blocking for all other functionality.

**Independent Test**: Can be fully tested by verifying that an employee (given their email address) can set a password and successfully authenticate, and then access their dashboard.

**Acceptance Scenarios**:

1. **Given** an employee email in the system with no password set, **When** they visit the password setup page and enter valid email, **Then** they receive a confirmation link or prompt to create password
2. **Given** an employee completes password setup with a valid password, **When** they log in with email + password, **Then** they are authenticated and see their dashboard
3. **Given** an employee logs in successfully, **When** they view the page, **Then** they only see the three allowed modules (Shift Roster, Vacation Requests, Time Tracking)
4. **Given** an employee attempts to access routes/data outside their three modules, **When** they navigate or make requests, **Then** they receive access denied (403) or are redirected

---

### User Story 2 - View Personal Shift Roster Calendar (Priority: P2)

**As an** employee
**I want to** see my assigned shift schedule in a calendar view
**So that** I know what days and times I'm scheduled to work

An employee can view a monthly calendar showing their assigned shifts. Each shift displays the shift type (e.g., "Mañana", "Noche") and date. They can navigate between months. They see only their own shifts, not other employees'.

**Why this priority**: Core feature - employees must know their work schedule. This enables them to plan and manage their time. High business value and frequently accessed.

**Independent Test**: Can be fully tested by verifying that an employee can view a calendar display of their assigned shifts for a given month and navigate months without seeing other employees' data.

**Acceptance Scenarios**:

1. **Given** an employee with assigned shifts, **When** they navigate to Shift Roster, **Then** they see a calendar view of the current month with their shifts displayed
2. **Given** an employee views the calendar, **When** they click next/previous month, **Then** the calendar updates to show shifts for the selected month
3. **Given** an employee views the calendar, **When** they look at shift details, **Then** they see date, shift type, and start/end times (no modification option)
4. **Given** an employee without assigned shifts for a month, **When** they view that month, **Then** they see an empty calendar (no error, just informational)
5. **Given** an employee from another tenant, **When** they try to access this employee's shift data, **Then** they see only their own data (tenant isolation)

---

### User Story 3 - Request Vacation (Priority: P3)

**As an** employee
**I want to** submit a vacation request with date range and view status
**So that** I can plan my time off and track approvals

An employee can create a vacation request by selecting start and end dates. They see their current vacation balance. After submitting, they see the request status (Pending/Approved/Rejected). They can view all their past and current vacation requests.

**Why this priority**: Important for work-life balance and planning. Employees need clear visibility into their vacation status. Reasonable second priority after authentication and schedule visibility.

**Independent Test**: Can be fully tested by verifying that an employee can create a vacation request, view its status, and see their vacation balance without affecting other employees' vacation data.

**Acceptance Scenarios**:

1. **Given** an employee navigates to Vacation Requests, **When** they view the page, **Then** they see current vacation balance (days available) and a list of their past requests
2. **Given** an employee initiates a new request, **When** they select date range and submit, **Then** the request is created with "Pending" status
3. **Given** a vacation request is created, **When** they view it, **Then** they see the dates, days requested, and current status (Pending/Approved/Rejected)
4. **Given** an approved vacation overlaps with a shift, **When** the system processes it, **Then** the shift is marked as conflicting (informational display only - no auto-deletion)
5. **Given** a pending vacation request, **When** the employee views it, **Then** they can cancel it if still in Pending status
6. **Given** an approved or rejected vacation, **When** the employee views it, **Then** they cannot modify or cancel (read-only display)

---

### User Story 4 - Clock In & Clock Out (Priority: P4)

**As an** employee
**I want to** record my arrival and departure times for attendance tracking
**So that** the company has accurate time records and I have evidence of my work hours

An employee can mark their arrival (clock in) and departure (clock out) with a timestamp. They cannot manually edit the time - the system records the exact moment they click the button. They see a list of their recent clock-in/out records with timestamps.

**Why this priority**: Important for accurate time tracking and payroll, but secondary to schedule visibility. Employees need simple, foolproof time tracking with no ability to manipulate hours.

**Independent Test**: Can be fully tested by verifying that an employee can clock in, clock out, and view their time records without being able to modify timestamps, and without seeing other employees' records.

**Acceptance Scenarios**:

1. **Given** an employee on a scheduled shift day, **When** they view Time Tracking, **Then** they see a "Clock In" button
2. **Given** an employee clicks Clock In, **When** the action completes, **Then** the system records the exact timestamp and shows "Clock Out" button
3. **Given** an employee is clocked in, **When** they click Clock Out, **Then** the system records the departure timestamp
4. **Given** an employee clicks clock in/out, **When** they view their records, **Then** the time is shown read-only (no edit option)
5. **Given** an employee tries to modify a timestamp, **When** they attempt to edit, **Then** the system prevents any changes (no timestamp field editable)
6. **Given** an employee views their time records, **When** they look at the list, **Then** they see only their own records, grouped by date or week
7. **Given** an employee views a clock record, **When** they look at details, **Then** they see date, clock-in time, clock-out time (if completed)

---

### Edge Cases

- What happens if an employee tries to clock in before their shift start time?
- What happens if an employee forgets to clock out at end of day?
- What happens if system receives duplicate clock-in requests within seconds?
- How does the system handle time zone differences (if multi-region)?
- What happens if an employee is assigned a shift in the past?
- What happens if an employee views the app offline - can they clock in/out? What syncs?
- What if vacation dates conflict with already-assigned shifts?
- What if employee's password expires or is reset by admin while they're logged in?

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a password setup/reset flow accessible via employee email
- **FR-002**: System MUST authenticate employees via email + password (after setup)
- **FR-003**: Employees MUST only see their own data (shifts, vacations, time records) - never other employees'
- **FR-004**: System MUST display a calendar view of employee's assigned shifts with shift type and dates
- **FR-005**: Employees MUST be able to navigate between months in the shift roster calendar
- **FR-006**: System MUST allow employees to request vacation with date range and show current balance
- **FR-007**: Employees MUST be able to view status of all their vacation requests (Pending/Approved/Rejected)
- **FR-008**: Employees with pending vacation MUST be able to cancel their request
- **FR-009**: System MUST prevent employees from modifying approved/rejected vacation requests
- **FR-010**: System MUST provide Clock In button when employee is on a scheduled shift
- **FR-011**: System MUST record exact timestamp (second-level precision) for clock-in/out actions
- **FR-012**: Employees MUST NOT be able to manually edit or modify any clock-in/out timestamps
- **FR-013**: System MUST display employee's recent time records in read-only format
- **FR-014**: Employees MUST be restricted to accessing only three views: Shift Roster, Vacation Requests, Time Tracking
- **FR-015**: System MUST prevent employees from accessing admin/moderador features or other employees' data
- **FR-016**: System MUST enforce role-based access control at the API level (not just frontend)

### Key Entities

- **Employee User Account**: Email, hashed password, role (Empleado), associated employee record, created_at, last_login
- **Shift Record**: Employee, date, shift type, entry time (when clocked in), exit time (when clocked out), status (scheduled/completed), created timestamps
- **Vacation Request**: Employee, start_date, end_date, requested_days, status (Pendiente/Aprobado/Rechazado/Cancelado), created_at, reviewed timestamps
- **Vacation Balance**: Employee, year, total_days, used_days, remaining_days
- **Time Record**: Employee, date, clock_in_timestamp, clock_out_timestamp (nullable if not clocked out), location (optional)

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Employees can complete password setup and first login in under 2 minutes
- **SC-002**: Shift roster calendar loads and renders in under 1 second
- **SC-003**: 95% of employees can navigate the three features without errors on first use
- **SC-004**: Clock in/out operations complete and confirm in under 500ms
- **SC-005**: No employee can view another employee's shifts, vacations, or time records (100% enforcement)
- **SC-006**: Vacation request submission completes within 2 seconds
- **SC-007**: All timestamps are captured with 100% accuracy (no timezone drift or loss of precision)
- **SC-008**: System supports 1000+ concurrent employees clocking in/out without performance degradation
- **SC-009**: 100% of clock-in/out times are immutable after creation (no retroactive edits)
- **SC-010**: Dashboard page load time is under 3 seconds on standard internet connection

---

## Assumptions

1. **Password Reset**: Admin/Moderador creates employee accounts with email, employee uses password reset flow on first login (standard pattern)
2. **Time Zone**: All timestamps use the tenant's configured timezone (Europe/Madrid for ILPI) - no user-selection
3. **Clock In/Out Availability**: Clock buttons are only available on days when employee has assigned shifts
4. **Vacation Approval**: Vacations are approved by Admin/Moderador (outside scope of employee portal)
5. **Offline Capability**: Employee app requires internet connection (no offline mode for v1)
6. **Notification**: Email notifications for vacation status changes are handled in separate feature (not in scope)
7. **Mobile**: Initial implementation is web browser only (mobile app is future feature)
8. **Data Retention**: Employee time records and vacation requests retained for 3 years (standard payroll retention)
9. **Session Management**: Standard HTTP session with 30-minute inactivity timeout for security
10. **Tenant Isolation**: All data is tenant-scoped (single tenant in MVP, but architecture supports multi-tenant)

---

## Dependencies

- Existing authentication system (JWT, session management)
- Existing employee database and role system
- Existing shift assignment system (shifts must be pre-assigned by admin/moderador)
- Existing vacation request system (approval workflow)
- Calendar UI component library (for month view)

---

## Out of Scope

- Push notifications
- Mobile app (web only for v1)
- Email notifications
- Payroll integration
- Shift swapping between employees
- Overtime calculations
- Geolocation for clock in/out
- Biometric authentication
- Admin/Moderador features (already covered in separate features)
- Integration with external HR systems
