# Implementation Tasks: Moderator Portal (Feature 006)

**Feature**: Moderator Portal
**Branch**: `006-moderator-portal`
**Created**: 2026-03-09
**Status**: Ready for Implementation

---

## Overview

Feature 006 adds a comprehensive Moderator Portal enabling team leaders to manage shifts, approve vacations, and view team reports for their department. This task list is organized by user story phases, with clear dependencies and parallelization opportunities.

### User Story Map

| Story | Priority | Goal | Independent Test Criteria |
|-------|----------|------|--------------------------|
| US1 | P1 | View Team Shift Roster | Moderator can log in and see calendar of own dept shifts |
| US2 | P1 | Approve/Reject Vacations | Moderator can approve/reject pending requests with audit |
| US3 | P2 | Manage Shift Assignments | Moderator can assign shifts with conflict detection |
| US4 | P2 | View Reports | Moderator can view vacation & attendance summaries |

### Suggested MVP Scope

**Minimum Viable Product**: Complete **US1 + US2** (both P1 stories)
- This delivers a functioning moderator dashboard with visibility and approval authority
- Can be independently tested and deployed
- Provides immediate value for vacation management
- Unblocks Feature 007 (Admin Portal) which depends on moderator role being functional

**Next Phase**: Implement US3 + US4 (both P2 stories)
- Adds proactive shift assignment capability
- Adds reporting/analytics for team planning

---

## Implementation Dependencies

```
Setup/Foundational (Phase 1-2)
  ↓
  ├─→ US1: View Roster (Phase 3)
  │   ├─→ US3: Shift Assignment (Phase 5)  [depends on roster view]
  │   └─→ US2: Vacation Approval (Phase 4) [independent of US1]
  │
  └─→ US2: Vacation Approval (Phase 4)
      └─→ US4: Reports (Phase 6) [depends on vacation data]
```

**Key Dependencies**:
- US1 (Roster) and US2 (Vacations) are parallel (independent)
- US3 (Shift Assignment) depends on US1 (needs roster display)
- US4 (Reports) depends on US2 (vacation approvals must be recorded)

**Parallelization Opportunities**:
- US1 backend and US2 backend can develop in parallel (different routers/services)
- US1 frontend and US2 frontend can develop in parallel
- US1 can be deployed before US2 if needed (feature flag optional)

---

## Phase 1: Setup & Infrastructure

> **Goal**: Establish project structure, routing, and foundational patterns
> **Duration**: ~4 hours
> **Blocking**: Must complete before user story phases

- [ ] T001 Add ModeratorRoute wrapper to frontend for role validation in `frontend/src/components/routes/ModeratorRoute.tsx`
- [ ] T002 Create moderator router file `backend/app/routers/moderator.py` with imports and dependency injection
- [ ] T003 Create moderator schemas file `backend/app/schemas/moderator.py` for request/response DTOs
- [ ] T004 Register moderator router in `backend/app/main.py` at `/api/v1/moderator` prefix
- [ ] T005 Create ModeratorContext for frontend state in `frontend/src/context/ModeratorContext.tsx`
- [ ] T006 Create moderatorService API client in `frontend/src/services/moderatorService.ts` with all endpoint stubs
- [ ] T007 Update `frontend/src/types/models.ts` with moderator-specific types (RosterDay, VacationRequestDTO, etc.)
- [ ] T008 Add moderator navigation link to main App layout in `frontend/src/App.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

> **Goal**: Set up shared services and utilities needed by all user stories
> **Duration**: ~6 hours
> **Blocking**: All user story phases depend on these

### Backend Services
- [ ] T009 Create `backend/app/services/moderator_service.py` with department scoping utility function `get_moderator_department()`
- [ ] T010 [P] Create `backend/app/services/moderator_shift_service.py` with methods: `get_department_employees()`, `check_vacation_conflict()`, `get_available_shift_types()`
- [ ] T011 [P] Extend `backend/app/services/vacation_service.py` with approval/rejection methods: `approve_request()`, `reject_request()` (includes setting reviewed_by, reviewed_at, rejection_reason)
- [ ] T012 Create error classes in `backend/app/common/exceptions.py` if not exist: `EmployeeNotInDepartmentError`, `VacationConflictError`, `ShiftExistsError`

### Frontend Context & Utilities
- [ ] T013 [P] Implement ModeratorContext provider and hooks in `frontend/src/context/ModeratorContext.tsx`
- [ ] T014 [P] Create error handler utility `frontend/src/utils/errorHandler.ts` for parsing moderator API error responses (reuse/extend from Feature 004/005)
- [ ] T015 Create moderator query hooks in `frontend/src/hooks/useModeratorData.ts`: `useDepartmentEmployees()`, `useVacationBalance()`, `useShiftTypes()`

---

## Phase 3: User Story 1 - View Team Shift Roster (P1)

> **Goal**: Moderators can view their team's shifts in a calendar interface
> **Duration**: ~12 hours
> **Independent Test**: Moderator sees own department's shifts; cannot see other departments
> **Dependencies**: Phase 1-2 complete

### Backend Implementation

- [ ] T016 [US1] Create `/roster?year=YYYY&month=MM` endpoint in `backend/app/routers/moderator.py` that returns shifts for moderator's department
- [ ] T017 [US1] Implement `get_department_roster()` in `backend/app/services/moderator_shift_service.py` with queries: ShiftRecord JOIN Employee WHERE department = moderator_dept
- [ ] T018 [US1] Create `/shifts?date=YYYY-MM-DD` endpoint to get shifts for specific date in `backend/app/routers/moderator.py`
- [ ] T019 [US1] Add vacation status indicator logic in `moderator_shift_service.py` - check if employee has approved vacation on shift date
- [ ] T020 [US1] Create RosterDTO schema in `backend/app/schemas/moderator.py` with fields: employee_id, employee_name, date, shift_type_name, vacation_status

### Frontend Implementation

- [ ] T021 [P] [US1] Create `frontend/src/views/ModeratorRoster.tsx` view component with calendar month navigation
- [ ] T022 [P] [US1] Create `frontend/src/components/moderator/RosterCalendar.tsx` calendar component using react-big-calendar (reuse Feature 005 pattern)
- [ ] T023 [P] [US1] Implement shift fetching in `moderatorService.ts` - `getRoster(year, month)` and `getShiftsForDate(date)` methods
- [ ] T024 [US1] Add color-coding function in RosterCalendar for shift types (Mañana=yellow, Noche=blue, etc.)
- [ ] T025 [US1] Add vacation status badge/indicator to shift cells (shows when employee has approved vacation)
- [ ] T026 [US1] Add error handling and loading states to RosterCalendar component
- [ ] T027 [US1] Create RosterCalendar unit tests in `frontend/src/components/moderator/__tests__/RosterCalendar.test.tsx`

### Integration

- [ ] T028 [US1] Integrate ModeratorRoster into ModeratorDashboard as primary view in `frontend/src/views/ModeratorDashboard.tsx`
- [ ] T029 [US1] Add route for moderator roster: GET `/moderator/roster` in frontend routing

---

## Phase 4: User Story 2 - Approve/Reject Vacation Requests (P1)

> **Goal**: Moderators approve/reject pending vacation requests from their team
> **Duration**: ~10 hours
> **Independent Test**: Moderator can approve/reject request; status updates; reviewed_by is recorded
> **Dependencies**: Phase 1-2 complete (independent of US1)

### Backend Implementation

- [ ] T030 [US2] Create `/vacations/pending` endpoint in `backend/app/routers/moderator.py` that lists pending vacation requests for moderator's department
- [ ] T031 [US2] Implement `get_department_pending_requests()` in `vacation_service.py` - query VacationRequest WHERE status='Pendiente' AND employee in moderator's dept
- [ ] T032 [US2] Create `/vacations/{request_id}` endpoint to get request details in `backend/app/routers/moderator.py`
- [ ] T033 [US2] Implement `get_vacation_request_details()` in `vacation_service.py` including employee name, dates, requested_days, balance
- [ ] T034 [US2] Create `/vacations/{request_id}/approve` endpoint with POST in `backend/app/routers/moderator.py`
- [ ] T035 [US2] Implement `approve_vacation_request()` in `vacation_service.py` - updates status='Aprobado', sets reviewed_by, reviewed_at
- [ ] T036 [US2] Create `/vacations/{request_id}/reject` endpoint with POST in `backend/app/routers/moderator.py`
- [ ] T037 [US2] Implement `reject_vacation_request(request_id, reason)` in `vacation_service.py` - updates status='Rechazado', sets reviewed_by, reviewed_at, rejection_reason
- [ ] T038 [US2] Add department scope check to all endpoints - verify employee belongs to moderator's department (returns 400 if not)
- [ ] T039 [US2] Create VacationRequestDTO and VacationApprovalRequest schemas in `backend/app/schemas/moderator.py`

### Frontend Implementation

- [ ] T040 [P] [US2] Create `frontend/src/views/VacationApproval.tsx` view with list of pending requests
- [ ] T041 [P] [US2] Create `frontend/src/components/moderator/VacationRequestList.tsx` component showing pending requests with filter UI
- [ ] T042 [P] [US2] Create `frontend/src/components/moderator/VacationRequestDetail.tsx` component for request details modal
- [ ] T043 [US2] Implement vacation fetching in `moderatorService.ts` - `getPendingRequests()`, `getRequestDetails(id)` methods
- [ ] T044 [US2] Implement approval/rejection in `moderatorService.ts` - `approveRequest(id)`, `rejectRequest(id, reason)` methods
- [ ] T045 [US2] Add filter UI to VacationRequestList for: status, employee, date range
- [ ] T046 [US2] Create approve/reject buttons with confirmation dialogs in VacationRequestDetail
- [ ] T047 [US2] Add success/error toasts after approval/rejection
- [ ] T048 [US2] Create VacationApproval unit tests in `frontend/src/views/__tests__/VacationApproval.test.tsx`

### Integration

- [ ] T049 [US2] Integrate VacationApproval view into ModeratorDashboard as secondary tab/section
- [ ] T050 [US2] Add route for vacation approval: GET `/moderator/vacations` in frontend routing
- [ ] T051 [US2] Refresh roster calendar after vacation approval (vacation status indicator should update)

---

## Phase 5: User Story 3 - Manage Shift Assignments (P2)

> **Goal**: Moderators can create and modify shift assignments with conflict detection
> **Duration**: ~14 hours
> **Independent Test**: Can assign shift; conflict detected (vacation/duplicate); error message shown
> **Dependencies**: Phase 1-2 complete, US1 (roster must be viewable)

### Backend Implementation

- [ ] T052 [US3] Create POST `/shifts/assign` endpoint in `backend/app/routers/moderator.py`
- [ ] T053 [US3] Implement `assign_shift()` in `moderator_shift_service.py` with:
  - Check employee in moderator's department → 400 EMPLOYEE_NOT_IN_DEPARTMENT
  - Check no approved vacation on date → 400 VACATION_CONFLICT
  - Check no existing shift on date → 400 SHIFT_EXISTS (offer replace)
  - Create ShiftRecord with employee_id, date, shift_type_id
- [ ] T054 [US3] Create PUT `/shifts/{shift_id}` endpoint to replace existing shift in `backend/app/routers/moderator.py`
- [ ] T055 [US3] Implement `update_shift()` in `moderator_shift_service.py` - validates same conflict rules, updates shift_type_id
- [ ] T056 [US3] Create DELETE `/shifts/{shift_id}` endpoint in `backend/app/routers/moderator.py`
- [ ] T057 [US3] Implement `delete_shift()` in `moderator_shift_service.py` - checks shift not worked (entry_time not set), deletes record
- [ ] T058 [US3] Create ShiftAssignmentRequest schema in `backend/app/schemas/moderator.py` with: employee_id, date, shift_type_id
- [ ] T059 [US3] Add error codes to exceptions: EMPLOYEE_NOT_IN_DEPARTMENT, VACATION_CONFLICT, SHIFT_EXISTS, SHIFT_WORKED

### Frontend Implementation

- [ ] T060 [P] [US3] Create `frontend/src/views/ShiftAssignment.tsx` view with assignment form
- [ ] T061 [P] [US3] Create `frontend/src/components/moderator/ShiftAssignmentForm.tsx` form component with:
  - Employee dropdown (department roster)
  - Date picker
  - Shift type dropdown
- [ ] T062 [US3] Implement shift assignment in `moderatorService.ts` - `assignShift(employeeId, date, shiftTypeId)` method
- [ ] T063 [US3] Implement shift update/delete in `moderatorService.ts` - `updateShift(shiftId, shiftTypeId)`, `deleteShift(shiftId)` methods
- [ ] T064 [US3] Add client-side validation: past dates blocked, date required, employee required
- [ ] T065 [US3] Add smart error handling for conflict scenarios:
  - VACATION_CONFLICT: Show message + link to vacation details
  - SHIFT_EXISTS: Show replace confirmation dialog
  - EMPLOYEE_NOT_IN_DEPARTMENT: Show message (shouldn't happen if dropdown is filtered)
- [ ] T066 [US3] Add success message after assignment (shift appears in roster calendar immediately)
- [ ] T067 [US3] Create bulk assignment UI mockup in ShiftAssignmentForm (optional multi-select for future)
- [ ] T068 [US3] Create ShiftAssignment unit tests in `frontend/src/views/__tests__/ShiftAssignment.test.tsx`

### Integration

- [ ] T069 [US3] Integrate ShiftAssignment view into ModeratorDashboard
- [ ] T070 [US3] Update RosterCalendar to refresh after shift assignment (show new shift immediately)
- [ ] T071 [US3] Add route for shift assignment: GET/POST `/moderator/shifts` in frontend routing

---

## Phase 6: User Story 4 - View Attendance Summary and Reports (P2)

> **Goal**: Moderators can view vacation and attendance summary reports
> **Duration**: ~10 hours
> **Independent Test**: Reports show department data only; filtered by date range; aggregations correct
> **Dependencies**: Phase 1-2, US2 (vacation approvals must be recorded)

### Backend Implementation

- [ ] T072 [US4] Create GET `/reports/vacations?year=YYYY&status=` endpoint in `backend/app/routers/moderator.py`
- [ ] T073 [US4] Implement `get_vacation_summary()` in `moderator_shift_service.py`:
  - Query VacationRequest grouped by employee WHERE status IN ('Aprobado', 'Rechazado')
  - Aggregate: approved_days, rejected_days, pending_days per employee
  - Include remaining_days from VacationBalance
- [ ] T074 [US4] Create GET `/reports/attendance?date_from=&date_to=` endpoint in `backend/app/routers/moderator.py`
- [ ] T075 [US4] Implement `get_attendance_report()` in `moderator_shift_service.py`:
  - Query ShiftRecord WHERE date BETWEEN date_from AND date_to
  - Join Employee, ShiftType
  - Include: employee_name, date, clock_in, clock_out, hours_worked, shift_type
  - Filter to moderator's department
- [ ] T076 [US4] Create VacationSummaryDTO and AttendanceReportDTO schemas in `backend/app/schemas/moderator.py`
- [ ] T077 [US4] Add department scope check to report endpoints (must verify moderator's department)

### Frontend Implementation

- [ ] T078 [P] [US4] Create `frontend/src/views/ModeratorReports.tsx` view with tab selector (Vacations / Attendance)
- [ ] T079 [P] [US4] Create `frontend/src/components/moderator/VacationSummary.tsx` component showing vacation table with: employee, approved_days, rejected_days, remaining_days
- [ ] T080 [P] [US4] Create `frontend/src/components/moderator/AttendanceReport.tsx` component showing attendance table with date range filter
- [ ] T081 [US4] Implement report fetching in `moderatorService.ts` - `getVacationSummary(year, status)`, `getAttendanceReport(dateFrom, dateTo)` methods
- [ ] T082 [US4] Add date range picker to AttendanceReport component (date_from, date_to)
- [ ] T083 [US4] Add status filter to VacationSummary (Aprobado, Rechazado, Pendiente)
- [ ] T084 [US4] Add sorting to both report tables (by employee name, by days, by date)
- [ ] T085 [US4] Create summary cards showing: total_approved_days, total_rejected_days, average_attendance_rate (optional)
- [ ] T086 [US4] Create ModeratorReports unit tests in `frontend/src/views/__tests__/ModeratorReports.test.tsx`

### Integration

- [ ] T087 [US4] Integrate ModeratorReports view into ModeratorDashboard
- [ ] T088 [US4] Add route for reports: GET `/moderator/reports` in frontend routing

---

## Phase 7: Polish & Cross-Cutting Concerns

> **Goal**: Quality, performance, security, testing, documentation
> **Duration**: ~8 hours
> **Blocking**: Must complete before merge to main

### Testing

- [ ] T089 Create comprehensive pytest tests for all moderator routers in `backend/tests/test_moderator_routers.py` covering:
  - Department scoping (moderator cannot access other depts)
  - VACATION_CONFLICT error (shift during vacation)
  - SHIFT_EXISTS error with replace
  - EMPLOYEE_NOT_IN_DEPARTMENT error
  - Success scenarios (approval, rejection, assignment)
  - All 9 endpoints with valid/invalid inputs
- [ ] T090 Create integration tests in `backend/tests/test_moderator_integration.py` covering full workflows:
  - Approve vacation → roster updates
  - Assign shift → roster reflects
  - Reject vacation → can reassign shift
- [ ] T091 Run `mypy app --strict` in backend and fix any type errors
- [ ] T092 Run `npm run lint` in frontend and fix any linting issues
- [ ] T093 Build frontend with `npm run build` and verify no TypeScript errors

### Performance & Security

- [ ] T094 Add database indexes on frequently queried columns: `vacation_request(tenant_id, status, employee_id)`, `shift_record(tenant_id, employee_id, date)`
- [ ] T095 Verify all endpoints enforce department scoping at service layer (no cross-dept data leakage)
- [ ] T096 Verify JWT role check on all moderator endpoints (require_role_and_active("Moderador"))
- [ ] T097 Verify no hardcoded secrets/credentials in code
- [ ] T098 Test with invalid JWT tokens - expect 401 Unauthorized

### Documentation

- [ ] T099 Update quickstart.md with final endpoint paths and response examples
- [ ] T100 Add code comments to moderator_service.py explaining department scoping pattern
- [ ] T101 Create API documentation in `backend/docs/moderator_api.md` or update OpenAPI/Swagger docs
- [ ] T102 Update main README.md with moderator feature overview and development notes

### Final Integration

- [ ] T103 Test complete workflow: Moderador logs in → views roster → approves vacation → assigns shift → views reports
- [ ] T104 Verify ModeratorRoute properly guards access (only Moderador role can access)
- [ ] T105 Test with multiple moderators from different departments - verify isolation
- [ ] T106 Manual end-to-end testing on Docker dev stack (make dev)
- [ ] T107 Create migration script for database changes (if any) - though Feature 006 reuses existing tables
- [ ] T108 Update IMPLEMENTATION_INDEX.md with Feature 006 summary

### Code Review Preparation

- [ ] T109 Self-review all code changes against constitution principles:
  - Clean Architecture (Routers → Services → Models)
  - Type Safety (mypy + TypeScript)
  - Security (role checks, tenant isolation)
  - Production-Ready (no hardcoded values)
  - Modularity (single responsibility)
- [ ] T110 Create merge summary document for pull request (what changed, why, testing done)

---

## Summary

### Task Statistics

| Phase | Description | Count | Duration |
|-------|-------------|-------|----------|
| Phase 1 | Setup & Infrastructure | 8 | ~4h |
| Phase 2 | Foundational (Prerequisites) | 7 | ~6h |
| Phase 3 | US1: View Roster | 12 | ~12h |
| Phase 4 | US2: Vacation Approval | 21 | ~10h |
| Phase 5 | US3: Shift Assignment | 19 | ~14h |
| Phase 6 | US4: Reports | 17 | ~10h |
| Phase 7 | Polish & Testing | 22 | ~8h |
| **TOTAL** | | **106** | **~64h** |

### Parallelization Opportunities

**Can develop in parallel** (different files, no cross-dependencies):
- T001-T008 (Phase 1) - all setup tasks
- T010-T015 (Phase 2) - independent service classes
- US1 backend (T016-T020) + US2 backend (T030-T039) - separate routers/services
- US1 frontend (T021-T027) + US2 frontend (T040-T048) - separate components
- US3 and US4 can start after Phase 2 (both independent of each other)

**Suggested Execution Plan**:
1. Complete Phase 1-2 (10h) - blocking for all stories
2. Start US1 backend + US2 backend in parallel (18h parallel = ~10h wall)
3. Start US1 frontend + US2 frontend in parallel (while backend develops)
4. Complete US1 integration (2h)
5. Complete US2 integration (2h)
6. Deploy US1+US2 MVP (first merge)
7. Continue with US3 (Phase 5)
8. Continue with US4 (Phase 6)
9. Polish and final testing (Phase 7)

**Estimated MVP Delivery**: 22-28 hours (with parallelization)

### Independent Testing Per Story

**US1 Test**: Moderador logs in → navigates to Roster view → sees department shifts → cannot see other department shifts ✅

**US2 Test**: Moderador sees Vacations tab → reviews pending request → approves → status updates to "Aprobado" → reviewed_by is moderador's ID ✅

**US3 Test**: Moderador accesses Shift Assignment → tries to assign shift during vacation → error "Vacation conflict" appears → cannot submit ✅

**US4 Test**: Moderador navigates to Reports → Vacations tab shows summary by employee → Attendance tab shows clock records → can filter by date range ✅

---

## Version Control

- **Branch**: `006-moderator-portal`
- **Commit Pattern**: `feat: [US#] feature description` (e.g., `feat: US1 add shift roster calendar`)
- **Merge Strategy**: Feature branch → main (via PR with full testing)
- **Deployment**: After Phase 7 completion and code review approval

---

## References

- **Specification**: [Feature 006 Spec](./spec.md)
- **Implementation Plan**: [Plan](./plan.md)
- **API Contracts**: [Moderator API](./contracts/moderator-api.md)
- **Data Model**: [Data Model](./data-model.md)
- **Research**: [Design Decisions](./research.md)
- **Quickstart**: [Developer Guide](./quickstart.md)
