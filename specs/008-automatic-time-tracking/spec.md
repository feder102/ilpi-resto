# Feature Specification: Automatic Shift-Based Time Tracking

**Feature Branch**: `008-automatic-time-tracking`
**Created**: 2026-03-13
**Status**: Draft
**Input**: User description: "Automatic clock in/out based on assigned shifts, count shift hours for work statistics, manual tracking on hold for future phase"

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

### User Story 1 - System Auto-Marks Employees Working During Assigned Shifts (Priority: P1)

As a system administrator, I want employees to be automatically marked as working during their assigned shift hours so that we can track work statistics without requiring manual clock in/out actions.

**Why this priority**: This is the core functionality enabling work hour statistics and removes the burden of manual time entry during this phase. It's the MVP that makes the feature viable.

**Independent Test**: Can be tested by assigning a shift to an employee and verifying that the system automatically creates a work record for the shift duration (e.g., night shift 22:00-06:00 = 8 hours recorded).

**Acceptance Scenarios**:

1. **Given** an employee with an assigned night shift (22:00-06:00), **When** the shift date arrives, **Then** the system automatically creates a time entry marking 8 hours worked
2. **Given** an employee with no shifts assigned on a date, **When** that date passes, **Then** no automatic time entry is created
3. **Given** an employee with a morning shift (06:00-14:00) and afternoon shift (14:00-22:00) on the same day, **When** the day ends, **Then** the system records 16 hours total worked (two separate entries or combined)
4. **Given** an employee with overlapping shifts on the same day, **When** the day ends, **Then** the system handles the overlap appropriately (prevents double-counting or records separately per shift)

---

### User Story 2 - Work Statistics Calculated from Shift Hours (Priority: P1)

As an admin viewing employee reports, I want work statistics (total hours, days worked, hours per department) to be calculated from assigned shift hours so that we have accurate metrics regardless of manual vs. automatic tracking.

**Why this priority**: Statistics are the business value of this feature. Without them, automatic tracking has no purpose. P1 parity with US1.

**Independent Test**: Can be tested by assigning shifts to an employee over a month and verifying that the statistics dashboard shows correct total hours, average hours per day, and departmental breakdown.

**Acceptance Scenarios**:

1. **Given** an employee worked 5 shifts of 8 hours each in a month, **When** I view their monthly report, **Then** total hours = 40, average = 8/day, days worked = 5
2. **Given** employees in multiple departments (Kitchen, Bar, Management), **When** I view departmental statistics, **Then** hours are correctly grouped by department
3. **Given** an employee with shifts in two different months, **When** I view monthly statistics, **Then** hours are correctly filtered by the selected month
4. **Given** an employee whose shift definition changes mid-month (e.g., 8-hour shift → 10-hour shift), **When** statistics are calculated, **Then** shifts use the correct duration based on their date

---

### User Story 3 - Manual Tracking Integration Point (Priority: P2)

As a developer preparing for future manual tracking, I want the system to distinguish between automatic (shift-based) and manual (user-clocked) time entries so that we can easily transition to manual tracking without breaking existing statistics.

**Why this priority**: This is a future-proofing requirement. We need the data model to support switching to manual tracking later without data migration. P2 because it's not required for MVP but prevents rework.

**Independent Test**: Can be tested by confirming the data model has a field indicating whether an entry is auto-generated or manually created, and that statistics calculation works correctly when both types coexist.

**Acceptance Scenarios**:

1. **Given** a time entry created automatically from a shift, **When** I inspect its data, **Then** it has a flag/field indicating `source: "shift"` or similar
2. **Given** mixed automatic and manual time entries in a period, **When** I calculate statistics, **Then** both types are included correctly in totals
3. **Given** a manual entry exists for a time period that also has an automatic shift entry, **When** statistics are calculated, **Then** no double-counting occurs (either merge, override, or document conflict resolution)

### Edge Cases

- What happens if an employee has multiple shifts on the same day? (See US1, Scenario 3-4)
- How are shifts handled in timezone transitions or DST changes? (Document assumption on timezone handling)
- What if a shift is deleted/cancelled after automatic time entry is created?
- What if an employee's shift type changes mid-day?
- How are shifts with variable duration handled (e.g., shifts defined by start/end time vs. duration)?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST automatically create a time entry for each employee on their assigned shift date, recording the shift duration as hours worked
- **FR-002**: System MUST support shifts of varying durations (8h, 10h, 12h, etc.) and correctly calculate hours for each shift type
- **FR-003**: System MUST prevent duplicate time entries for the same employee on the same date (idempotent operation if called multiple times)
- **FR-004**: System MUST include shift date, start time, end time, and total hours in each automatic time entry
- **FR-005**: System MUST mark automatic time entries with metadata indicating they are shift-based (not manual)
- **FR-006**: System MUST handle multi-shift days (employee working morning and night shift same day) without data loss or double-counting
- **FR-007**: Shift statistics (total hours, days worked, hours per department) MUST be calculated from automatic time entries
- **FR-008**: System MUST support filtering statistics by time period (day, week, month, custom range)
- **FR-009**: System MUST support querying statistics grouped by department, employee, shift type, or any combination
- **FR-010**: System MUST NOT expose automatic time tracking to employees (read-only view of generated entries, no manual edit in this phase)

### Key Entities *(include if feature involves data)*

- **TimeEntry**: Auto-generated record representing hours worked during a shift
  - `employee_id`: Reference to employee
  - `shift_date`: Date when shift occurred
  - `start_time`: Shift start time
  - `end_time`: Shift end time
  - `hours_worked`: Duration (calculated from start/end time)
  - `shift_id` or `shift_type`: Reference to the shift definition
  - `source`: Indicates "shift" (automatic) vs. future "manual" entries
  - `created_at`: Timestamp of record creation

- **ShiftRecord**: (Existing) Assignment of an employee to a shift on a specific date

- **ShiftType**: (Existing) Definition of a shift template (e.g., "Noche" 22:00-06:00, "Mañana" 06:00-14:00)

- **Employee**: (Existing) Must link to assigned shifts to enable automatic entry generation

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Automatic time entries are created within 24 hours of shift date (or at a scheduled batch time) for all employees with assigned shifts
- **SC-002**: 100% accuracy of hours recorded matches the shift duration (e.g., 8-hour shift = 8.0 hours recorded, no variance)
- **SC-003**: Statistics calculations execute in under 2 seconds for a department with 50+ employees over a 1-month period
- **SC-004**: No duplicate time entries are created for the same employee-shift combination (idempotency verified over 100+ test runs)
- **SC-005**: Departmental statistics reports display correct totals and averages (validated against manual calculation of sample data)
- **SC-006**: System handles timezone-aware shift times correctly (shifts defined in tenant timezone are recorded accurately regardless of server timezone)

---

## Assumptions

- Shifts are pre-configured in ShiftType (e.g., "Mañana", "Noche") before automatic tracking begins
- Shift dates are based on the shift assignment (ShiftRecord), not daily re-computation
- "On hold" status means: No frontend UI for employees; system tracks internally; statistics used by admin only in this phase
- Future manual tracking will use the same TimeEntry table with `source: "manual"`, enabling parallel operation
- Timezone handling: All shifts stored in employee's tenant timezone; statistics reported in tenant timezone
- Performance: Automatic entry generation runs nightly (batch job) rather than real-time

---

## Out of Scope (Phase 2+)

- Manual clock in/out by employees (future phase when we resume the feature)
- Mobile app notifications for shift reminders
- Shift swaps or trades between employees
- Overtime tracking or automatic wage calculations
- Integration with payroll systems
