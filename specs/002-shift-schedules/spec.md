# Feature Specification: Shift Schedule Configuration & Auto Calculation

**Feature Branch**: `002-shift-schedules`
**Created**: 2026-02-28
**Status**: Draft
**Input**: User description: "Configurar los horarios de los turnos (Mañana, Tarde, Cortado, Corrido) para que el sistema calcule automáticamente las horas totales"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Configures Predefined Shift Types (Priority: P1)

An admin needs to configure the standard shift types that their organization uses (Mañana, Noche, Cortado, Corrido). This is a one-time setup that applies organization-wide. Some shifts have single time windows (Mañana: 10:30-18:00), while others are split shifts (Cortado: 12:30-16:30 and 18:30-22:30) or end at dynamic close time (Noche, Corrido).

**Why this priority**: Without shift type definitions, teams cannot be created or assigned to shifts. This is the foundational configuration for the entire shift rostering system.

**Independent Test**: An admin can navigate to shift configuration, define the 4 standard shift types with their time windows and expected hours, and verify the system stores them and makes them available for team creation.

**Acceptance Scenarios**:

1. **Given** admin is in the shift configuration section, **When** admin creates "Mañana" with single window 10:30-18:00 and expected hours 7.5, **Then** system stores it and displays it in the shift type list
2. **Given** admin is configuring shift types, **When** admin creates "Cortado" with two time windows (12:30-16:30 and 18:30-22:30) totaling 8 hours, **Then** system correctly stores both windows and calculates total as 8.0
3. **Given** admin configures "Noche" shift with start 17:00 and "uses_dynamic_close=true", **When** admin sets expected hours to 7.7, **Then** system stores this as a variable-end shift
4. **Given** shift type "Mañana" is configured, **When** admin tries to create another shift type with the same name, **Then** system rejects the duplicate with error message
5. **Given** shift types are defined, **When** admin updates "Mañana" end time to 18:30, **Then** system saves the change and expected hours update to 8.0

---

### User Story 2 - System Automatically Calculates Total Hours (Priority: P1)

When a team is assigned a shift type, the system must automatically calculate and display the total hours for that shift, including for complex cases: split shifts, overnight shifts, and dynamic close times. Admins and moderators should see this information clearly without manual calculation.

**Why this priority**: Automatic calculation eliminates manual errors and provides instant feedback on shift duration, which is critical for payroll and scheduling, especially for split and overnight shifts.

**Independent Test**: An admin creates a team with Cortado shift type, and the system correctly displays "8.0 horas" (calculated from 12:30-16:30 [4 hrs] + 18:30-22:30 [4 hrs]) without requiring manual entry.

**Acceptance Scenarios**:

1. **Given** shift type "Mañana" with single window 10:30-18:00, **When** system displays this shift, **Then** it shows total "7.5 horas"
2. **Given** shift type "Cortado" with two windows (12:30-16:30 and 18:30-22:30), **When** system calculates total hours, **Then** it displays "8.0 horas" (4 + 4 hours)
3. **Given** shift type "Noche" starts 17:00 with uses_dynamic_close=true and expected_hours=7.7, **When** team is created with this shift, **Then** response shows "7.7 horas"
4. **Given** a team is assigned to "Corrido" shift, **When** the shift spans midnight (14:00 to ~00:00 close), **Then** system correctly calculates total hours across the day boundary
5. **Given** admin updates shift type times, **When** teams using that shift are queried, **Then** they reflect the new calculated hours immediately

---

### User Story 3 - Team CRUD Integration with Shift Types (Priority: P1)

The existing team CRUD endpoints must be enhanced to work with predefined shift types instead of freeform text. Teams should reference shift type names (Mañana, Noche, Cortado, Corrido) or IDs, making the system consistent and preventing invalid shift configurations.

**Why this priority**: Ensures data consistency and prevents teams from having invalid or misconfigured shift times. Critical for data integrity and accurate payroll calculations.

**Independent Test**: When creating a team via POST /teams with shift_type="Cortado", the system validates that this is configured, returns the full shift definition (2 time windows, 8 hours), and rejects invalid types like shift_type="Almuerzo" with a validation error listing valid options.

**Acceptance Scenarios**:

1. **Given** shift types "Mañana", "Noche", "Cortado", "Corrido" are configured, **When** admin creates team with shift_type="Cortado", **Then** system accepts it and stores reference, response includes split window details and 8.0 hours
2. **Given** admin attempts to create team with shift_type="AlmuerzoRápido", **When** this is not configured, **Then** system returns validation error: "Invalid shift_type. Valid options: Mañana, Noche, Cortado, Corrido"
3. **Given** team exists with Mañana shift type, **When** shift type configuration updates Mañana end time from 18:00 to 18:30, **Then** same team on next query reflects new 8.0 hours
4. **Given** team update endpoint receives request to change from Mañana to Noche, **When** Noche is valid, **Then** system updates team, response shows new shift details (17:00 start, uses_dynamic_close, 7.7 hours)

---

### Edge Cases

- What happens when an admin tries to delete a shift type that is actively assigned to multiple teams? (System prevents and explains which teams are using it)
- How does the system calculate total hours when a shift spans midnight (e.g., Noche: 17:00 to 06:00 next day)?
- What if admin configures overlapping shift times for different shift types (e.g., Tarde: 14:00-22:00 and Corrido: 14:00 to close)? (Should be allowed; teams choose explicitly)
- How are split shift windows ordered? Can they be defined in any order, or must earliest window come first? (Should require chronological order for clarity)
- When "Cierre" (close time) varies by day, how does the system display and calculate hours for Noche and Corrido shifts? (Use expected_hours as default display; actual hours calculated on shift records/timeclocks)
- Can admin disable/archive a shift type without deleting it? (Should support soft-delete via is_active flag to preserve historical records)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support four standard shift type categories: Mañana (morning), Noche (evening/night), Cortado (split), Corrido (continuous)
- **FR-002**: Each shift type MUST have: name (unique per tenant), shift time definition (supporting single or split time windows), and optional description
- **FR-003**: System MUST support split shifts (e.g., Cortado with two separate time windows: 12:30-16:30 and 18:30-22:30)
- **FR-004**: System MUST support shifts that end at dynamic "Cierre" (close time) for Noche and Corrido shifts
- **FR-005**: System MUST handle shifts that span across midnight (e.g., 17:00 start to next day's 06:00)
- **FR-006**: System MUST automatically calculate total hours correctly for all shift types: single-window, split-window, and dynamic close times
- **FR-007**: System MUST provide an admin endpoint (GET /shift-types) to list all configured shift types for the tenant
- **FR-008**: System MUST provide an admin endpoint (POST /shift-types) to create new shift types with validation
- **FR-009**: System MUST provide an admin endpoint (PUT /shift-types/{id}) to update shift type configuration
- **FR-010**: System MUST provide an admin endpoint (DELETE /shift-types/{id}) to delete shift types with checks for active team assignments
- **FR-011**: Team creation/update endpoints MUST accept shift_type as a reference to a configured shift type ID or enum name (Mañana, Noche, Cortado, Corrido)
- **FR-012**: Team response endpoints MUST include a calculated `total_hours` field as a decimal (e.g., "7.5", "8.0")
- **FR-013**: System MUST validate that shift_type references exist before allowing team creation/update
- **FR-014**: System MUST prevent deletion of shift types that are assigned to active teams
- **FR-015**: System MUST enforce uniqueness of shift type names per tenant

### Key Entities *(include if feature involves data)*

- **ShiftType**: Represents a predefined shift configuration (Mañana, Noche, Cortado, Corrido). Attributes: id, tenant_id, name (unique per tenant), type (enum: Mañana|Noche|Cortado|Corrido), time_windows (array of {start_time, end_time}, e.g., Cortado has 2 windows), uses_dynamic_close (boolean, true for Noche & Corrido), expected_hours (decimal, e.g., 7.5), description, is_active, created_at, updated_at
- **Team**: Enhanced to reference ShiftType instead of storing times directly. Relationship: many Teams → one ShiftType. Includes calculated property: total_hours = sum of all time_window durations (handles split shifts and midnight spans)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can configure all 4 standard shift types in under 5 minutes from first login
- **SC-002**: System automatically calculates and displays total hours correctly for all shift types within 100ms response time
- **SC-003**: 100% of team API responses include the calculated total_hours field
- **SC-004**: No teams can be created with invalid shift types; 100% of invalid shift type requests are rejected with clear error messages
- **SC-005**: Shift type deletion is prevented when teams are actively assigned; admins see clear guidance on how to proceed
- **SC-006**: Team CRUD operations execute without performance degradation when 50+ shift types are configured per tenant

---

## Shift Type Specifications (From User Definition)

The kitchen operates with the following shift types:

| Shift Type | Start | End | Total Hours | Notes |
|-----------|-------|-----|-------------|-------|
| Mañana | 10:30 | 18:00 | 7.5 | Morning shift |
| Noche | 17:00 | Cierre (Close) | 7.7 | Evening/Night shift that extends to closing time |
| Cortado | 12:30-16:30 & 18:30-22:30 | — | 8.0 | Split shift with ~2 hour unpaid break between periods |
| Corrido | 14:00 | Cierre (Close) | 10.0 | Continuous shift to closing time |

---

## Assumptions

1. **Midnight Spanning Shifts**: The system MUST support shift types that span across midnight. Turno Noche (17:00 to Cierre) and Turno Corrido (14:00 to Cierre) extend past midnight on kitchen closing nights. Hour calculation must handle date boundaries correctly.

2. **Dynamic Close Time**: Some shifts end at "Cierre" (kitchen closing time). The system uses **expected_hours** as the constant shift duration for Noche (7.7 hrs) and Corrido (10 hrs). Actual clock-in/clock-out times are tracked separately via timesheets/timeclocks. This allows for variable actual closing times while maintaining consistent shift definitions.

3. **Split Shifts**: Cortado is a split shift with two separate time windows (12:30-16:30 and 18:30-22:30) with a 2-hour break in between. ShiftType model must support multiple time periods per shift definition.

4. **Break Implicit in Split Times**: For split shifts, the break is implicit in the gap between time windows. No separate break_duration field needed for Cortado; the system calculates: (first_window_duration) + (second_window_duration).

5. **Timezone Handling**: All shift times are stored in the tenant's configured timezone (default: Europe/Madrid per project constitution).

6. **Shift Type Definition**: The four shift types (Mañana, Noche, Cortado, Corrido) are predefined organizational standard, defined as an enum or configuration list (not arbitrary strings).

7. **Data Migration**: Existing teams created before this feature will need to have their shift_start/shift_end times migrated to reference a ShiftType. This is handled via database migration/seed script.
