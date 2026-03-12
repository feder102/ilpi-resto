# Feature Specification: Moderator Portal

**Feature Branch**: `006-moderator-portal`
**Created**: 2026-03-09
**Status**: Draft
**Input**: Vista del moderador que pueda ver los turnos de su equipo, aprobar o rechazar solicitudes de vacaciones, gestionar los miembros del equipo y asignar turnos. El moderador solo puede ver los datos de su departamento y aprobar vacaciones de sus empleados. Puede crear horarios para su equipo, ver el estado de los turnos y un resumen de vacaciones tomadas. Tiene acceso a reportes básicos de asistencia.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - View Team Shift Roster (Priority: P1)

The Moderator needs to see a visual calendar of their team's shift assignments for the current and upcoming months. This is the primary dashboard that shows who is working when, enabling them to manage team workload and identify gaps.

**Why this priority**: This is the core functionality that enables a moderator to manage their team. Without visibility into shift assignments, they cannot make informed decisions about team management.

**Independent Test**: Can be fully tested by verifying that a moderator (with Moderador role) can log in and view a calendar display of shift assignments for only their department members. The dashboard should display shift information without allowing modifications in this view.

**Acceptance Scenarios**:

1. **Given** a Moderador is logged in, **When** they access the dashboard, **Then** they see a calendar showing all shifts assigned to employees in their department
2. **Given** a Moderador views the roster, **When** they select a date, **Then** they see detailed information about which employees are working and their shift types (Mañana, Noche, Cortado, Corrido)
3. **Given** a Moderador from Cocina department views the roster, **When** they navigate the calendar, **Then** they only see employees assigned to Cocina department
4. **Given** a Moderador views the calendar, **When** they navigate to next/previous months, **Then** the display updates to show shifts for those months
5. **Given** a Moderador views an employee's shift, **When** that employee has a pending vacation, **Then** the calendar shows both the shift assignment and vacation status indicator

---

### User Story 2 - Approve/Reject Vacation Requests (Priority: P1)

The Moderator needs to review vacation requests submitted by their team members and approve or reject them. They can see pending requests, review request details, and make decisions. Approved vacations should block the employee from being assigned shifts during those dates.

**Why this priority**: Vacation approval is critical for team management and scheduling. Without this, the team lacks control over time-off requests.

**Independent Test**: Can be fully tested by having a moderator view a list of pending vacation requests from their team, approve one request, and reject another. The system should update the vacation status and notify affected parties.

**Acceptance Scenarios**:

1. **Given** a Moderador accesses the vacation management view, **When** they load it, **Then** they see a list of pending vacation requests from their team members
2. **Given** a Moderador views pending requests, **When** they select a request, **Then** they see details including employee name, department, requested dates, and number of days
3. **Given** a Moderador reviews a request, **When** they click "Aprobar", **Then** the request status changes to "Aprobado" and the moderador's name is recorded as the reviewer
4. **Given** a Moderador reviews a request, **When** they click "Rechazar", **Then** the request status changes to "Rechazado" and they can optionally add a rejection reason
5. **Given** a Moderador approves a vacation, **When** those dates are in the shift roster, **Then** the calendar shows the employee unavailable for those dates
6. **Given** a Moderador views the list, **When** they filter by employee or date range, **Then** the list updates to show only matching requests

---

### User Story 3 - Manage Team Shift Assignments (Priority: P2)

The Moderator can create and modify shift assignments for their team members. They assign specific shift types to employees on specific dates, respecting approved vacations and shift constraints.

**Why this priority**: While roster visibility is essential, the ability to assign shifts is important for team planning. This allows moderators to create schedules proactively rather than just reacting to requests.

**Independent Test**: Can be fully tested by having a moderator assign a shift to an employee, verify the assignment appears in the roster, and attempt to assign a conflicting shift to verify error handling.

**Acceptance Scenarios**:

1. **Given** a Moderador accesses shift assignment, **When** they select an employee and date, **Then** they see available shift types (Mañana, Noche, Cortado, Corrido)
2. **Given** a Moderador attempts to assign a shift, **When** the employee has an approved vacation that day, **Then** the system prevents the assignment and shows a clear error message
3. **Given** a Moderador assigns a shift, **When** they select the shift type and date, **Then** the system records the assignment and updates the roster calendar
4. **Given** a Moderador attempts to assign a shift, **When** the employee already has a shift on that date, **Then** the system offers to replace the existing shift with confirmation
5. **Given** a Moderador assigns a shift, **When** the assignment is complete, **Then** the shift appears immediately in the calendar view
6. **Given** a Moderador wants to manage assignments, **When** they view the shift calendar, **Then** they can bulk-assign shifts for multiple employees on the same date

---

### User Story 4 - View Attendance Summary and Reports (Priority: P2)

The Moderator can access basic reports showing vacation usage, attendance summary, and team performance metrics. This gives visibility into team patterns and helps with planning.

**Why this priority**: Reports provide actionable insights for team management. This enables moderators to identify patterns (high vacation usage, low attendance) and plan accordingly.

**Independent Test**: Can be fully tested by accessing the reports section and verifying that data shown is limited to the moderador's department and is accurate based on recorded shifts and approvals.

**Acceptance Scenarios**:

1. **Given** a Moderador accesses the reports section, **When** they load the dashboard, **Then** they see summary statistics for their team (vacation days used, average attendance, etc.)
2. **Given** a Moderador views the reports, **When** they select "Vacaciones", **Then** they see a list of vacation requests by status (Aprobado, Rechazado, Pendiente) with days used per employee
3. **Given** a Moderador views vacation data, **When** they filter by date range, **Then** the report updates to show only vacations in that period
4. **Given** a Moderador accesses attendance reports, **When** they view the data, **Then** they see clock in/out records for their team, aggregated by employee and date range
5. **Given** a Moderador views any report, **When** they export or print it, **Then** the format is clear and suitable for sharing with upper management

### Edge Cases

- What happens when a moderator tries to assign a shift to an employee outside their department?
- How does the system handle when an employee submits a vacation request that overlaps with assigned shifts?
- What happens if a moderator approves a vacation request for dates that already have shift assignments?
- How does the system prevent a moderator from viewing or managing other departments' data?
- What happens when two moderators try to assign the same employee to conflicting shifts simultaneously?
- How does the system handle deletion of shift assignments that have already been worked?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST authenticate Moderador users and verify they have the "Moderador" role before allowing access to moderator-specific features
- **FR-002**: System MUST restrict Moderador view to only employees in their assigned department
- **FR-003**: System MUST display an interactive calendar showing shift assignments for the Moderador's team (current and next 2 months)
- **FR-004**: System MUST allow Moderador to view all pending vacation requests from their department employees
- **FR-005**: System MUST allow Moderador to approve vacation requests, recording their name and timestamp as reviewer
- **FR-006**: System MUST allow Moderador to reject vacation requests with optional reason entry
- **FR-007**: System MUST prevent shift assignment when an employee has an approved vacation during that date
- **FR-008**: System MUST allow Moderador to assign shift types to team members for specific dates
- **FR-009**: System MUST prevent Moderador from assigning shifts to employees outside their department
- **FR-010**: System MUST allow Moderador to modify or delete shift assignments (if not yet worked)
- **FR-011**: System MUST display approval status of shift assignments (pending, confirmed, worked)
- **FR-012**: System MUST provide vacation summary reports showing days used by employee and status
- **FR-013**: System MUST provide attendance summary showing clock-in/clock-out records by employee
- **FR-014**: System MUST allow filtering/searching of requests and assignments by employee, date range, or status
- **FR-015**: System MUST prevent Moderador from viewing vacation requests or shift assignments outside their department
- **FR-016**: System MUST provide audit trail showing who approved/rejected requests and when
- **FR-017**: System MUST handle timezone-aware date comparisons (using tenant's configured timezone)

### Key Entities

- **Moderador User**: Authenticated user with "Moderador" role, linked to a specific department and tenant
- **Shift Assignment**: Association between an employee, a date, and a shift type, with status (pending/confirmed/worked)
- **Vacation Request**: Request for time off with status (Pendiente/Aprobado/Rechazado/Cancelado), tracked with approval/rejection by moderador
- **Department**: Organizational unit that Moderador is assigned to (Cocina, Atención al Público, Barra, Dirección)
- **Shift Type**: Pre-configured shift definitions (Mañana, Noche, Cortado, Corrido) with time windows and expected hours
- **Attendance Record**: Clock-in/clock-out timestamps for verification of actual work

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Moderador can view their team's shift roster and filter by date within 2 seconds of page load
- **SC-002**: Moderador can approve or reject a vacation request in under 30 seconds (including review)
- **SC-003**: Moderador can assign a shift to an employee in under 45 seconds
- **SC-004**: 100% of shift assignments are restricted to the Moderador's department (no cross-department visibility)
- **SC-005**: System prevents invalid shift assignments (conflicting with vacations) with clear error messages in 100% of cases
- **SC-006**: Moderador can generate an attendance report in under 5 seconds
- **SC-007**: 95% of moderador-initiated actions complete without errors
- **SC-008**: All vacation approvals/rejections are permanently recorded with moderador identity and timestamp
- **SC-009**: Reports accurately reflect approved vacations and their impact on shift availability

## Assumptions

1. **Department-based Access Control**: Each Moderador manages one specific department and can only see/manage employees in that department
2. **Shift Types Pre-configured**: Shift types (Mañana, Noche, Cortado, Corrido) are created by Admins and available for all moderators
3. **Vacation Balance**: Employees have annual vacation balance managed by the system; moderators approve usage but don't manage balance accrual
4. **Date Formats**: All dates are handled in the tenant's configured timezone (Madrid timezone for MVP)
5. **Role Hierarchy**: Moderador has authority to approve/reject requests and assign shifts; Admin can override or manage across all departments
6. **Data Ownership**: All data is tenant-scoped; moderators cannot see data from other organizations
7. **No Manual Payroll**: This feature is for shift management only; payroll and attendance validation happen separately
8. **Notification**: Notifications to employees about approvals/rejections are sent automatically but not covered in this feature scope
