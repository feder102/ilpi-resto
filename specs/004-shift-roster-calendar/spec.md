# Feature Specification: Shift Roster Calendar View

**Feature Branch**: `004-shift-roster-calendar`
**Created**: 2026-03-05
**Status**: Draft
**Input**: User description: "Create a large calendar view to load rosters, allowing users to assign people to specific days with their assigned shifts"

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

### User Story 1 - View Monthly Shift Roster (Priority: P1)

As a scheduling administrator or moderator, I need to see all employees and their assigned shifts for a given month displayed in a large calendar format, so I can quickly identify coverage gaps and plan staffing needs.

**Why this priority**: This is the foundation of the feature. Without a visual overview, shift planning is impossible. This directly supports the core business need of rostering.

**Independent Test**: Can be fully tested by navigating to the roster calendar view and verifying that all employees' shifts for the selected month are displayed in a calendar grid. Delivers core value of having a visual shift overview.

**Acceptance Scenarios**:

1. **Given** I am a moderator logged in, **When** I navigate to the Shift Roster Calendar page, **Then** I see a calendar with the current month and all shift records displayed
2. **Given** shifts are assigned in the system, **When** I view the calendar, **Then** each day shows which employees are scheduled and their shift types (morning/afternoon/night, if applicable)
3. **Given** I view the calendar, **When** I navigate to a different month using prev/next controls, **Then** the calendar updates to display shifts for that month
4. **Given** I am an empleado user, **When** I navigate to the Shift Roster Calendar, **Then** I only see my own assigned shifts (not others')

---

### User Story 2 - Assign Employee to Shift (Priority: P1)

As a scheduling administrator or moderator, I need to drag/select an employee and assign them to a specific day with a specific shift type, so I can schedule the team efficiently.

**Why this priority**: This is the core interaction for roster creation. Without assignment functionality, the calendar is read-only. This directly delivers the rostering value.

**Independent Test**: Can be fully tested by assigning an employee to a day with a shift, then verifying the assignment persists and is visible in the calendar. Delivers the critical "create shift schedule" value.

**Acceptance Scenarios**:

1. **Given** the calendar is open and I click on a date, **When** I select an employee from a dropdown/panel, **Then** a shift assignment dialog opens
2. **Given** the shift assignment dialog is open, **When** I select a shift type (e.g., morning, afternoon, night) and confirm, **Then** the employee is assigned to that day with that shift
3. **Given** I assign an employee to a day, **When** the assignment is saved, **Then** the calendar immediately reflects the new assignment
4. **Given** an employee is assigned to a shift, **When** I click on that assignment, **Then** I see the employee name, shift type, and can edit or delete it

---

### User Story 3 - Manage Shift Conflicts (Priority: P2)

As a scheduling administrator, I need the system to warn me of potential conflicts (e.g., an employee assigned to multiple shifts on the same day), so I don't create invalid schedules.

**Why this priority**: Prevents invalid data and improves schedule quality. Important for correctness, but can be handled after basic assignment works.

**Independent Test**: Can be tested by attempting to assign an employee to multiple shifts on the same day and verifying a warning/error is shown.

**Acceptance Scenarios**:

1. **Given** an employee already has a shift on a day, **When** I attempt to assign them another shift on the same day, **Then** the system shows a conflict warning
2. **Given** a conflict warning is shown, **When** I proceed anyway, **Then** I receive confirmation that I'm overriding the previous assignment (or the system rejects it, depending on business rule)
3. **Given** multiple employees are assigned, **When** I view the calendar, **Then** understaffed days are visually highlighted (if applicable)

---

### User Story 4 - Bulk Operations & Filters (Priority: P2)

As a scheduling administrator managing many employees, I need to filter the roster by department or shift type, and potentially do bulk assignments, so I can organize large schedules efficiently.

**Why this priority**: Improves usability for large teams. Valuable for efficiency, but not required for MVP.

**Independent Test**: Can be tested by applying a department filter, seeing only those employees, and assigning them to shifts.

**Acceptance Scenarios**:

1. **Given** the calendar is displayed, **When** I filter by department, **Then** only employees in that department are shown
2. **Given** multiple employees are filtered, **When** I select multiple dates and a shift type, **Then** I can assign that shift to all visible employees for those dates
3. **Given** I perform a bulk assignment, **When** the operation completes, **Then** all assignments appear in the calendar

### Edge Cases

- What happens when no employees are assigned to a day? → The day displays empty or with a "no staff" indicator
- What if an employee has a vacation request approved for a day? → The system shows vacation status and may prevent shift assignment
- How does the system handle employees with no department assigned? → They can still be assigned shifts but may not appear in department-filtered views
- What if user tries to assign a shift when no shift types are defined in the system? → The system shows an error and prompts the user to configure shift types first

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a calendar view with the current or selected month, with each date as a clickable/interactive cell
- **FR-002**: System MUST show all employees assigned to shifts for each day in the calendar (display employee name + shift type)
- **FR-003**: Users with Moderador or Admin role MUST be able to open an assignment dialog by clicking a date
- **FR-004**: System MUST allow selection of an employee and shift type in the assignment dialog
- **FR-005**: System MUST save shift assignments and persist them to the database (creates or updates ShiftRecord entities)
- **FR-006**: System MUST prevent duplicate shift assignments for the same employee on the same day (conflict detection)
- **FR-007**: System MUST display assigned shifts in the calendar with employee names and shift type indicators
- **FR-008**: Users MUST be able to navigate between months using previous/next buttons
- **FR-009**: Empleado users MUST only see their own shifts; Admin/Moderador MUST see all shifts
- **FR-010**: System MUST provide visual feedback when a shift is created, updated, or deleted
- **FR-011**: System MUST support filtering by department (optional for MVP, recommended for future)
- **FR-012**: System MUST handle vacation status: if an employee has an approved vacation request for a day, the system MUST warn the user before assigning a shift

### Key Entities

- **Employee**: Represents a staff member. Attributes include name, department, status (active/inactive), and hire date
- **ShiftRecord**: Represents an assignment of an employee to a specific day with a shift type. Attributes: employee_id, date, shift_type, created_at, updated_at, tenant_id
- **Shift Type**: Categorical values (morning, afternoon, night) or similar, depending on business. Used to label assignments
- **VacationRequest**: Related entity. If status is "Aprobado" (approved) for a date, the UI warns before assigning shifts

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Scheduling administrators can view the full month roster and identify staffing patterns in under 30 seconds from page load
- **SC-002**: Users can assign an employee to a shift in under 2 minutes (click date → select employee → select shift type → confirm)
- **SC-003**: The calendar displays assignments without lag or visual glitches when scrolling or navigating months
- **SC-004**: System correctly prevents or warns of duplicate shift assignments (100% conflict detection coverage)
- **SC-005**: Shift assignments persist across page reloads and are immediately visible to other users viewing the roster
- **SC-006**: Mobile responsiveness: calendar displays on tablets (iPad-size screens) in a readable format with touch-friendly controls
- **SC-007**: 95% of scheduling operations complete without database errors
- **SC-008**: User satisfaction: 90% of moderators report the calendar view is easier to use than previous text-based or spreadsheet-based scheduling

---

## Assumptions

- **Shift Types**: The system has predefined shift types (morning, afternoon, night) or similar. If not, this feature assumes at least one shift type exists; additional configuration is a separate feature.
- **Employee List**: Employees are already created in the system; this feature does not include employee creation.
- **Vacation Integration**: VacationRequest entities already exist and are accessible; warning is UI-level only.
- **Timezone Handling**: All dates are in the tenant's configured timezone (default Europe/Madrid); no explicit timezone selection per shift.
- **Responsive Design**: Uses project's Tailwind CSS for responsive layout; works on desktop and tablet screens (mobile secondary priority).
- **Library Choice**: Uses `react-big-calendar` as suggested, or equivalent calendar library (e.g., react-calendar, day.js + custom grid).
- **Multi-tenant**: Shifts are tenant-scoped; no cross-tenant visibility.
- **No Approval Workflow**: Shift assignments are immediate (no pending/approval step for MVP); can be added in future.

---

## Out of Scope (MVP)

- Employee creation/management (assumes employees already exist)
- Shift type definition/configuration (assumes shift types are preconfigured)
- Shift approval workflow (shifts are created immediately)
- Automatic conflict resolution (system warns, user resolves manually)
- Advanced reporting/export (e.g., PDF roster, shift statistics)
- Mobile-first native app (responsive web only)
- Real-time collaboration notifications (updates visible on refresh)
- Recurring shift patterns (e.g., repeating weekly schedules)

---

## Notes

- This feature heavily depends on the existing Employee, ShiftRecord, and VacationRequest models. Ensure these are fully implemented and tested before starting.
- The calendar UI is a significant visual component; consider creating a dedicated calendar service/hook for managing calendar state and logic.
- Conflict detection can be implemented at the service layer (prevents invalid writes) or UI layer (warns before submission). Recommended: both for good UX.
