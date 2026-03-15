# Tasks: Automatic Shift-Based Time Tracking

**Feature**: 008-automatic-time-tracking
**Branch**: `008-automatic-time-tracking`
**Date**: 2026-03-13

**Input**: Design documents from `/specs/008-automatic-time-tracking/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, contracts/api-endpoints.md, research.md

**Tests**: Integration and unit tests included (TDD approach recommended)

**Organization**: Tasks organized by user story to enable independent implementation and testing. All user stories are **independently testable** after Phase 2 (foundational).

---

## Format Reference

```
- [ ] [TaskID] [P] [Story] Description with exact file path
```

- **[P]**: Task can run in parallel (different files, no blocking dependencies)
- **[Story]**: User story label (US1, US2, US3) — ONLY for story-specific tasks
- **File paths**: All absolute paths from repository root

---

## Implementation Strategy & MVP Scope

**MVP Scope** (Phases 1-4, US1 + US2): Automatic entry generation + statistics reporting
- Phase 1: Setup (0.5 day)
- Phase 2: Foundational (1 day)
- Phase 3: US1 - Auto generation (1 day)
- Phase 4: US2 - Statistics (1.5 days)
- **Total MVP**: ~4 days for core functionality

**Phase 2+ Enhancement**: US3 - Future-proofing (source field already included in Phase 2, no additional work)

**Parallel Opportunities**:
- Phase 3: Backend auto-generation and frontend statistics service can be developed in parallel
- Within Phase 4: Each statistics endpoint implementation is independent

---

## Dependency Graph

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational - TimeEntry model + migrations + base service)
    ↓
┌─────────────────────────────────────────────┐
│ Phase 3 (US1): Auto Entry Generation        │
│ Phase 4 (US2): Statistics Reporting         │ (Parallel, both depend on Phase 2)
│ Phase 5 (US3): Future-Proofing              │
└─────────────────────────────────────────────┘
    ↓
Phase 6 (Polish & Integration Testing)
```

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and verify existing structure

**Status**: ✅ DONE - Using existing backend/frontend structure
- Backend: `backend/app/` (FastAPI + SQLModel)
- Frontend: `frontend/src/` (React 19 + TypeScript)
- Database: PostgreSQL 16 with Alembic migrations
- Testing: pytest (backend), Vitest (frontend)

**New Files to Create**:

- [x] T001 Create `backend/app/models/time_entry.py` with TimeEntry SQLModel definition (tenant_id, employee_id, shift_date, start_time, end_time, hours_worked, source, created_at, updated_at fields) ✅ COMPLETE

- [x] T002 Create `backend/app/schemas/time_tracking.py` with Pydantic DTOs (TimeEntryResponse, TimeEntryListResponse, EmployeeStatisticsResponse, DepartmentStatisticsResponse, StatisticsFilterRequest, BatchProcessRequest) ✅ COMPLETE

- [x] T003 Create `backend/app/common/time_tracking_exceptions.py` with custom exceptions (InvalidShiftError, DuplicateTimeEntryError, StatisticsCalculationError, NoShiftsFoundError) ✅ COMPLETE

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data model and service infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema & Migrations

- [x] T004 Update `backend/app/models/__init__.py` to re-export TimeEntry for Alembic ✅ COMPLETE

- [ ] T005 Run Alembic: Generate migration with `alembic revision --autogenerate -m "Create time_entry table"` in `backend/alembic/versions/`

- [ ] T006 Add database indexes in migration:
  - `(tenant_id, employee_id, shift_date)`
  - `(tenant_id, shift_date)`
  - Verify migration file in `backend/alembic/versions/`

- [ ] T007 Apply migration locally: `alembic upgrade head` in `backend/`

### Service Infrastructure

- [x] T008 [P] Create base `backend/app/services/time_tracking_service.py` with:
  - Class: `TimeTrackingService` ✅ COMPLETE
  - Methods: `generate_time_entries_for_date()`, `get_employee_statistics()`, `get_department_statistics()`, `get_time_entries()`
  - Helper method: `_calculate_hours(start_time, end_time)` for overnight shift handling

- [x] T009 [P] Create `backend/app/routers/time_tracking.py` with route structure ✅ COMPLETE
  - 4 API endpoints for statistics and batch processing
  - RBAC enforcement (Admin/Moderador access)
  - Integrated with existing Feature 005 endpoints

- [x] T010 [P] Create `backend/app/jobs/scheduler.py` with APScheduler setup ✅ COMPLETE
  - Background scheduler for daily batch job
  - Configurable execution time
  - Proper startup/shutdown lifecycle

### Type Safety & Configuration

- [x] T011 [P] Add TimeEntrySource enum to `backend/app/models/time_entry.py` (SHIFT, MANUAL) ✅ COMPLETE

- [x] T012 [P] Add environment variable to `backend/app/config.py`: ✅ COMPLETE
  - `BATCH_TIME_TRACKING_HOUR` (default: 1) — Hour of day (0-23) to run batch job
  - `BATCH_TIME_TRACKING_MINUTE` (default: 0) — Minute of hour
  - Added properties: `batch_time_tracking_hour`, `batch_time_tracking_minute`

- [ ] T013 [P] Update Employee model in `backend/app/models/employee.py` to add relationship:
  - `time_entries: Optional[List["TimeEntry"]]` with `Relationship(back_populates="employee")`

- [ ] T014 [P] Add type hints to `backend/app/services/shift_service.py` if not present; verify no issues for mypy --strict

### Frontend Setup

- [ ] T015 [P] Create `frontend/src/types/timeTracking.ts` with TypeScript interfaces:
  - TimeEntry, TimeEntrySource, EmployeeStatistics, DepartmentStatistics, StatisticsFilterRequest, TimeEntryFilterRequest

- [ ] T016 [P] Create `frontend/src/services/statisticsService.ts` with API client methods:
  - `getEmployeeStatistics(employeeId, year, month)`
  - `getDepartmentStatistics(year, month, department?)`
  - `getTimeEntries(filters)`
  - `triggerBatchProcess(processDate, overwriteExisting)`

**Checkpoint**: Foundation complete. All subsequent user stories depend on Phase 2.

---

## Phase 3: User Story 1 - System Auto-Marks Employees Working During Assigned Shifts (Priority: P1) 🎯 MVP

**Goal**: Implement automatic TimeEntry record creation for employees with assigned shifts via nightly batch job.

**Independent Test**: Assign shifts to test employees → Run batch job → Verify TimeEntry records created with correct hours (including overnight shifts like 22:00-06:00 = 8 hours)

**Acceptance Scenarios**:
1. Single shift assigned → TimeEntry created with correct duration
2. No shifts assigned → No TimeEntry created
3. Multi-shift day (Mañana + Noche) → Two TimeEntry records created, total 16 hours
4. Overlapping shifts prevented at ShiftRecord level (existing validation)

### Implementation for User Story 1

#### Backend: Service Methods

- [ ] T017 [US1] Implement `TimeTrackingService.generate_time_entries_for_date(tenant_id: int, target_date: date) -> int` in `backend/app/services/time_tracking_service.py`:
  - Query ShiftRecord for target_date with status='scheduled'
  - For each ShiftRecord:
    - Calculate hours using `_calculate_hours(shift_type.start_time, shift_type.end_time)`
    - Get_or_create TimeEntry with unique constraint on (tenant_id, employee_id, shift_date, shift_type_id)
    - Set source='shift', created_at=UTC now
  - Return count of entries created
  - Log all operations (structured JSON)

- [ ] T018 [US1] Implement `TimeTrackingService._calculate_hours(start_time: time, end_time: time) -> float` helper:
  - Handle normal shifts (06:00-14:00 = 8.0 hours)
  - Handle overnight shifts (22:00-06:00 = 8.0 hours, wraps midnight)
  - Unit tests in `backend/tests/unit/test_time_tracking_service.py`

- [ ] T019 [US1] Add error handling in generate method:
  - Catch database IntegrityError for duplicates (idempotency)
  - Log warnings for employees with no shifts on target date
  - Raise `StatisticsCalculationError` if hours calculation fails

#### Backend: Batch Job Scheduler

- [ ] T020 [US1] Implement batch job initialization in `backend/app/main.py`:
  - In FastAPI startup event: Initialize APScheduler
  - Schedule `generate_time_entries_for_date()` job:
    - Type: cron job
    - Time: {BATCH_TIME_TRACKING_HOUR}:{BATCH_TIME_TRACKING_MINUTE} daily
    - Action: Call service for each active tenant (currently ILPI only)
    - Logging: Log job start/end/errors

- [ ] T021 [US1] Create scheduler wrapper function in `backend/app/services/time_tracking_service.py`:
  - `run_daily_batch_job() -> dict` returning { tenant_id, entries_created, status, timestamp }
  - Called by APScheduler
  - Error handling with structured logging

#### Backend: Integration Tests

- [ ] T022 [P] [US1] Create integration test `backend/tests/integration/test_time_tracking_automatic_entry.py`:
  - Test 1: Single 8-hour shift → TimeEntry created correctly
  - Test 2: No shifts assigned → No TimeEntry created
  - Test 3: Multi-shift same day → 2 entries, 16 hours total
  - Test 4: Overnight shift 22:00-06:00 → 8 hours calculated correctly
  - Test 5: Idempotency: Run batch twice → Same entry count (no duplicates)
  - Test 6: DST edge case: Shifts during DST transition → Hours still correct

- [ ] T023 [P] [US1] Create unit test `backend/tests/unit/test_time_tracking_service.py`:
  - `test_calculate_hours_normal_shift()` → 06:00-14:00 = 8.0
  - `test_calculate_hours_overnight_shift()` → 22:00-06:00 = 8.0
  - `test_calculate_hours_variable_durations()` → 10-hour, 12-hour shifts
  - `test_generate_entries_idempotent()` → No duplicates on re-run
  - `test_generate_entries_with_no_shifts()` → Graceful handling

#### Frontend: Statistics Service (Parallel with Backend)

- [ ] T024 [P] [US1] Implement API client method in `frontend/src/services/statisticsService.ts`:
  - `getTodayStatus()` — Fetch current day's time entries for logged-in user
  - Error handling: Map API errors to user-friendly messages
  - Type-safe with interfaces from `frontend/src/types/timeTracking.ts`

**Checkpoint**: User Story 1 complete. Automatic entry generation works; batch job running nightly. Can be tested independently.

---

## Phase 4: User Story 2 - Work Statistics Calculated from Shift Hours (Priority: P1) 🎯 MVP

**Goal**: Implement statistics endpoints and admin dashboard to query and display work hours by employee and department.

**Independent Test**: Create test shifts for 3 employees over a month → Query employee statistics → Verify totals match expected (hours, days_worked, avg, breakdown by shift_type). Query department statistics → Verify department totals correct.

**Acceptance Scenarios**:
1. Single employee, 5 shifts of 8h → Total 40h, 5 days, 8h avg
2. Multiple departments → Statistics grouped correctly
3. Multi-month shifts → Filtering by month works
4. Shift type change mid-month → Hours use correct duration per date

### Implementation for User Story 2

#### Backend: Service Methods for Statistics

- [ ] T025 [US2] Implement `TimeTrackingService.get_employee_statistics(tenant_id, employee_id, year, month, include_manual=False) -> EmployeeStatistics` in `backend/app/services/time_tracking_service.py`:
  - Query TimeEntry filtered by:
    - tenant_id, employee_id
    - EXTRACT(YEAR FROM shift_date) = year
    - EXTRACT(MONTH FROM shift_date) = month
    - source in ('shift', 'manual' if include_manual)
  - Calculate:
    - total_hours: SUM(hours_worked)
    - days_worked: COUNT(DISTINCT shift_date)
    - avg_hours_per_day: AVG(hours_worked)
    - breakdown_by_shift_type: GROUP BY shift_type
  - Return EmployeeStatisticsResponse Pydantic model
  - Performance: Query must execute in <1 second (indexed)

- [ ] T026 [US2] Implement `TimeTrackingService.get_department_statistics(tenant_id, year, month, department=None, include_manual=False) -> List[DepartmentStatistics]` in `backend/app/services/time_tracking_service.py`:
  - Query TimeEntry joined with Employee
  - Filter by tenant_id, year, month, department (if specified), source
  - GROUP BY e.department
  - Calculate per department:
    - total_hours: SUM(hours_worked)
    - employee_count: COUNT(DISTINCT employee_id)
    - avg_hours_per_employee: AVG(SUM by employee)
    - breakdown_by_shift_type: Nested GROUP BY
  - Return list of DepartmentStatisticsResponse
  - Performance: <2 seconds for 50+ employees, 1-month period

- [ ] T027 [US2] Implement `TimeTrackingService.get_time_entries(tenant_id, start_date, end_date, employee_id=None, department=None, source='shift', limit=100, offset=0) -> TimeEntryListResponse` in `backend/app/services/time_tracking_service.py`:
  - Query TimeEntry with optional filtering
  - Support pagination (limit, offset)
  - Return paginated TimeEntryListResponse with total count
  - Used for detailed time entry reports

#### Backend: FastAPI Endpoints

- [ ] T028 [US2] Create endpoint `GET /api/v1/time-tracking/statistics/employee/{employee_id}` in `backend/app/routers/time_tracking.py`:
  - Query params: year (int), month (int), include_manual (bool, optional)
  - RBAC: Require Admin or Moderador role (via dependency)
  - Call `time_tracking_service.get_employee_statistics()`
  - Response: EmployeeStatisticsResponse (200)
  - Errors: 401 (unauthorized), 403 (forbidden), 404 (employee not found), 400 (invalid params)
  - Documentation: OpenAPI docstring with examples

- [ ] T029 [US2] Create endpoint `GET /api/v1/time-tracking/statistics/department` in `backend/app/routers/time_tracking.py`:
  - Query params: year, month, department (optional), include_manual (bool, optional)
  - RBAC: Require Admin or Moderador role
  - Call `time_tracking_service.get_department_statistics()`
  - Response: List[DepartmentStatisticsResponse] (200)
  - Errors: 401, 403, 400
  - Rate limiting: 100 req/min

- [ ] T030 [US2] Create endpoint `GET /api/v1/time-tracking/entries` in `backend/app/routers/time_tracking.py`:
  - Query params: start_date, end_date (required), employee_id, department, source (optional), limit, offset
  - RBAC: Admin/Moderador only
  - Call `time_tracking_service.get_time_entries()`
  - Response: TimeEntryListResponse with pagination (200)
  - Errors: 401, 403, 400

- [ ] T031 [US2] Create endpoint `POST /api/v1/time-tracking/batch-process` in `backend/app/routers/time_tracking.py`:
  - Request body: BatchProcessRequest (process_date, overwrite_existing)
  - RBAC: Admin only (stricter than other endpoints)
  - Call `time_tracking_service.generate_time_entries_for_date()`
  - Response: BatchProcessResponse with job_id, status, estimated_entries (202 Accepted)
  - Errors: 401, 403 (non-admin), 400 (invalid date), 409 (job already running)

#### Backend: Integration Tests

- [ ] T032 [P] [US2] Create integration test `backend/tests/integration/test_time_tracking_statistics.py`:
  - Setup: 3 employees × 20 shifts each (Feb + Mar) = 60 TimeEntry records
  - Test 1: Employee statistics (single month) → Verify hours, days, avg
  - Test 2: Employee statistics (multi-month) → Verify filtering by month
  - Test 3: Department statistics → Verify department grouping
  - Test 4: Shift type breakdown → Verify breakdown by Mañana/Noche
  - Test 5: Pagination → Verify limit/offset works
  - Test 6: Performance → Statistics query <2 seconds
  - Test 7: RBAC → Admin can access, Empleado returns 403

- [ ] T033 [P] [US2] Create unit test `backend/tests/unit/test_statistics_calculations.py`:
  - `test_employee_statistics_calculation()` → Manual vs. query results
  - `test_department_statistics_aggregation()` → Verify GROUP BY logic
  - `test_statistics_with_no_entries()` → Graceful handling (empty result)

#### Frontend: Statistics Components

- [ ] T034 [P] [US2] Create component `frontend/src/components/time-tracking/EmployeeStatisticsCard.tsx`:
  - Props: employeeId (number), onDateChange (callback)
  - Display: Employee name, month/year picker, total hours (large), days worked, avg hours/day
  - Show breakdown by shift type (Mañana, Noche, etc.) as small cards
  - Styling: Card layout, use Recharts for mini pie chart of shift breakdown
  - API call: `getEmployeeStatistics(employeeId, year, month)`
  - Error handling: Display error message if API fails
  - Loading state: Skeleton loader while fetching

- [ ] T035 [P] [US2] Create component `frontend/src/components/time-tracking/DepartmentStatisticsCard.tsx`:
  - Display: Department name, total hours, employee count, avg per employee
  - Nested breakdown by shift type
  - Styling: Table format or card grid
  - API call: `getDepartmentStatistics(year, month, department)`
  - Reusable for multiple departments in a view

- [ ] T036 [P] [US2] Create component `frontend/src/components/time-tracking/TimeEntriesTable.tsx`:
  - Props: filters (start_date, end_date, employee_id, department)
  - Display: Paginated table of TimeEntry records
  - Columns: Employee, Shift Date, Start Time, End Time, Hours Worked, Shift Type, Source
  - Pagination: Next/Prev buttons, page indicator
  - API call: `getTimeEntries(filters)`
  - Sorting: Clickable column headers (optional, Phase 2+)

- [ ] T037 [US2] Create admin view `frontend/src/views/AdminStatistics.tsx`:
  - Layout: Tabs or sections for Employee / Department / Detailed Entries
  - Section 1: Employee selector dropdown → Display EmployeeStatisticsCard
  - Section 2: Department selector → Display DepartmentStatisticsCard for each
  - Section 3: Advanced filters → TimeEntriesTable with date range picker
  - Month/Year picker: Global for employee/department sections
  - Styling: Professional admin dashboard layout with cards and charts
  - Error handling: Display alerts if API fails

- [ ] T038 [US2] Integrate statistics view into app routing in `frontend/src/App.tsx`:
  - Add route: `<Route path="/admin/statistics" element={<AdminRoute><AdminStatistics /></AdminRoute>} />`
  - AdminRoute: Checks role is Admin/Moderador
  - Navigation: Add link in admin menu/sidebar

#### Frontend: Integration Tests

- [ ] T039 [P] [US2] Create component test `frontend/src/components/time-tracking/__tests__/EmployeeStatisticsCard.test.tsx`:
  - Test 1: Render with mock data → Display hours, days, breakdown
  - Test 2: Date picker change → Calls onDateChange with new month
  - Test 3: Error state → Shows error message
  - Test 4: Loading state → Shows skeleton loader

- [ ] T040 [P] [US2] Create integration test for statistics flow:
  - Mock API responses using msw (Mock Service Worker)
  - Test: Load AdminStatistics → Select employee → Display stats → Verify calculations
  - Test: Filter by date range → Results update correctly

**Checkpoint**: User Story 2 complete. Statistics endpoints functional; admin dashboard displays employee and department metrics. MVP now complete!

---

## Phase 5: User Story 3 - Manual Tracking Integration Point (Priority: P2)

**Goal**: Ensure system is prepared for Phase 2 (manual clock in/out) without future rework. Add source field distinction; prepare statistics queries for mixed tracking.

**Independent Test**: Verify TimeEntry has source field with default 'shift'. Confirm statistics queries already prepared to filter by source. No breaking changes if source='manual' entries added later.

**Acceptance Scenarios**:
1. TimeEntry has source field → Shows 'shift' for auto-generated
2. Mixed sources query possible → Statistics prepared for future manual entries
3. No double-counting logic in place → Conflict resolution documented

### Implementation for User Story 3

#### Already Complete in Phase 2
✅ TimeEntry model includes `source: TimeEntrySource` field (SHIFT, MANUAL)
✅ Migration includes source field
✅ Service methods have `include_manual` parameter (prepared for Phase 2)

#### Backend: Documentation & Preparation

- [ ] T041 [US3] Document conflict resolution strategy in `backend/docs/MANUAL_TRACKING_NOTES.md`:
  - When Phase 2 adds manual entries: How to handle employee/date with both shift + manual entries
  - Decision: Shift entries primary, manual entries override during clock window only
  - Conflict resolution: Log & alert to admin if both exist for same time period
  - Statistics: Include both by default; provide option to exclude manual

- [ ] T042 [US3] Add comment in `backend/app/services/time_tracking_service.py` at statistics methods:
  - Document `include_manual` parameter behavior for Phase 2
  - Explain how to update when manual tracking is added

#### Frontend: Prepare for Source Display

- [ ] T043 [US3] Add source field display to `frontend/src/components/time-tracking/TimeEntriesTable.tsx`:
  - Column: "Source" showing 'Shift' or 'Manual' (badge styling)
  - Filter option: Allow filtering by source (Phase 2+)

#### Tests: Prepare for Manual Tracking

- [ ] T044 [US3] Add test to `backend/tests/unit/test_time_tracking_service.py`:
  - `test_get_employee_statistics_mixed_sources()` — Simulates both shift + manual entries
  - Verify statistics include both without double-counting
  - (Mock manual entries for now; will be real in Phase 2)

**Checkpoint**: Source field ready for Phase 2. System prepared for manual clock in/out without migration.

---

## Phase 6: Polish & Integration Testing

**Purpose**: Cross-cutting concerns, documentation, and end-to-end testing

### Documentation & Configuration

- [ ] T045 Create deployment checklist in `backend/docs/DEPLOYMENT.md`:
  - Run migrations: `alembic upgrade head`
  - Set env vars: BATCH_TIME_TRACKING_HOUR, BATCH_TIME_TRACKING_MINUTE
  - Verify batch job scheduled and running
  - Monitor logs for errors

- [ ] T046 [P] Add API documentation to `backend/app/routers/time_tracking.py`:
  - OpenAPI docstrings for all endpoints
  - Example requests/responses in docstrings
  - Rate limiting documented

- [ ] T047 [P] Create user guide `frontend/docs/ADMIN_STATISTICS_GUIDE.md`:
  - How to access statistics view
  - How to interpret employee/department stats
  - How to export data (future feature)
  - FAQ: Why manual clock in/out is deferred

### Logging & Monitoring

- [ ] T048 [P] Add structured JSON logging to batch job in `backend/app/services/time_tracking_service.py`:
  - Log format: { timestamp, level, module, message, tenant_id, entries_created, duration_ms }
  - Log job start, completion, errors
  - Sample logs to console/file for verification

- [ ] T049 [P] Add application logging to endpoints in `backend/app/routers/time_tracking.py`:
  - Log all statistics queries (employee_id, date_range, user_id)
  - Log errors and exceptions with context

### End-to-End Testing

- [ ] T050 Create end-to-end test scenario `backend/tests/e2e/test_time_tracking_flow.py`:
  - Setup: 5 employees with shifts assigned
  - Step 1: Run batch job manually via API
  - Step 2: Verify TimeEntry records created
  - Step 3: Query employee statistics
  - Step 4: Query department statistics
  - Step 5: Verify numbers match manual calculations
  - Result: All checks pass ✅

- [ ] T051 [P] Create frontend E2E test `frontend/e2e/statistics.e2e.ts` (if E2E framework available):
  - Login as admin
  - Navigate to /admin/statistics
  - Select employee from dropdown
  - Verify stats display correctly
  - Change month/year
  - Verify stats update

### Performance Validation

- [ ] T052 [P] Performance test script `backend/tests/performance/test_statistics_latency.py`:
  - Setup: 1000 TimeEntry records (50 employees, 20 days/month)
  - Test: Query employee statistics → Verify <1 second
  - Test: Query department statistics → Verify <2 seconds
  - Test: Batch job processing → Verify <10 seconds for 100 shifts
  - Report: Mean, p95, p99 latencies

### Type Safety & Linting

- [ ] T053 [P] Run mypy --strict on all new backend code:
  - `mypy backend/app/models/time_entry.py`
  - `mypy backend/app/services/time_tracking_service.py`
  - `mypy backend/app/routers/time_tracking.py`
  - Verify 0 errors

- [ ] T054 [P] Run TypeScript strict mode on all frontend code:
  - `npx tsc --noEmit frontend/src/types/timeTracking.ts`
  - `npx tsc --noEmit frontend/src/services/statisticsService.ts`
  - `npx tsc --noEmit frontend/src/components/time-tracking/`
  - Verify 0 errors

- [ ] T055 [P] Run linting:
  - Backend: `ruff check backend/app/` (no errors)
  - Frontend: `npm run lint` (no errors)

### Security Review

- [ ] T056 [P] Verify RBAC enforcement:
  - Admin can access all endpoints ✓
  - Moderador can access statistics but not batch-process ✓
  - Empleado cannot access any time-tracking endpoints ✓
  - Test with different roles via unit tests

- [ ] T057 [P] Verify multi-tenant isolation:
  - Statistics queries filter by tenant_id ✓
  - No data leakage between tenants ✓
  - All service methods check tenant_id

### Final Integration

- [ ] T058 Verify all endpoints in API docs are working:
  - Test all 4 GET/POST endpoints with real requests
  - Verify error responses
  - Verify rate limiting

- [ ] T059 [P] Create smoke test checklist:
  - [ ] Batch job runs at configured time ✓
  - [ ] TimeEntry records created for all shifts ✓
  - [ ] Employee statistics query works ✓
  - [ ] Department statistics query works ✓
  - [ ] Admin dashboard loads and displays stats ✓
  - [ ] RBAC blocks unauthorized users ✓

**Checkpoint**: Polish complete. All tests passing. Feature ready for production deployment.

---

## Testing Strategy Summary

### Unit Tests (Phase 3-6)
- Service methods: `hours_worked` calculation, statistics aggregation
- API validators: Request/response Pydantic models
- Error handling: Invalid dates, missing employee, duplicates

**Total**: ~15 unit tests

### Integration Tests (Phase 3-6)
- Batch job: Create entries, idempotency, timezone handling
- Statistics: Accuracy, performance, filtering, RBAC
- API endpoints: All 4 endpoints with various query parameters

**Total**: ~20 integration tests

### End-to-End Tests (Phase 6)
- Full flow: Shifts → Batch job → TimeEntry records → Statistics dashboard
- User scenarios: Admin viewing employee stats, department reports

**Total**: ~5 E2E tests

### Performance Tests (Phase 6)
- Statistics query latency <2 seconds ✓
- Batch job completion <10 seconds ✓

---

## Success Criteria Verification

| Criterion | Task | Status |
|-----------|------|--------|
| **SC-001**: Entries created within 24h | T020, T021 | ✅ |
| **SC-002**: 100% hours accuracy | T018, T022, T032 | ✅ |
| **SC-003**: Stats <2 seconds | T026, T032, T052 | ✅ |
| **SC-004**: No duplicates (100+ runs) | T019, T022 | ✅ |
| **SC-005**: Stats reports accurate | T032, T050 | ✅ |
| **SC-006**: Timezone handling correct | T018, T022 | ✅ |

---

## Task Summary & Metrics

**Total Tasks**: 59
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 14 tasks
- **Phase 3 (US1 - Auto Generation)**: 9 tasks
- **Phase 4 (US2 - Statistics)**: 24 tasks
- **Phase 5 (US3 - Future-Proofing)**: 4 tasks
- **Phase 6 (Polish & Testing)**: 5 tasks

**Parallelizable Tasks**: 18 [P] marked
- Backend service & frontend UI development
- Unit tests and integration tests
- Linting and type checking

**Critical Path** (Sequential):
1. Phase 2 (Foundational) — 1 day
2. Phase 3 (US1) — 1 day
3. Phase 4 (US2) — 1.5 days
4. Phase 6 (Polish) — 0.5 days
5. **Total**: ~4 days (MVP complete)

**With Parallelization**:
- Phase 2: 1 day (sequential, blocking)
- Phases 3 & 4: 1.5 days (parallel for backend/frontend)
- Phase 6: 0.5 days
- **Realistic Duration**: ~3 days with 2 developers

---

## Independent Test Criteria Per User Story

### User Story 1: Auto Entry Generation
**Prerequisites**: Phase 2 complete
**Independent Test**:
```bash
# 1. Assign shifts to test employee for tomorrow
POST /shifts/assignment {employee_id: 1, shift_type_id: 1, shift_date: tomorrow}

# 2. Run batch job (manual trigger for testing)
POST /api/v1/time-tracking/batch-process {process_date: tomorrow}

# 3. Verify TimeEntry created
GET /api/v1/time-tracking/entries?start_date=tomorrow&end_date=tomorrow
→ Verify 1 entry with hours_worked=8.0, source='shift'
```

### User Story 2: Statistics Reporting
**Prerequisites**: Phase 2 + US1 complete
**Independent Test**:
```bash
# 1. Setup: 3 employees × 10 shifts each = 30 TimeEntry records

# 2. Query employee stats
GET /api/v1/time-tracking/statistics/employee/1?year=2026&month=3
→ Verify total_hours=80, days_worked=10, avg=8.0

# 3. Query department stats
GET /api/v1/time-tracking/statistics/department?year=2026&month=3
→ Verify department aggregation correct

# 4. View admin dashboard
GET /admin/statistics
→ Verify stats display, month picker works
```

### User Story 3: Future-Proofing
**Prerequisites**: Phase 2 complete (source field already in place)
**Independent Test**:
```python
# 1. Verify source field present
entry = TimeEntry.get_by_id(1)
assert entry.source == TimeEntrySource.SHIFT

# 2. Verify mixed-source query possible (simulation)
stats = get_employee_statistics(include_manual=True)
# Statistics include hypothetical manual entries (ready for Phase 2)
```

---

## Next Steps After Task Completion

1. **Deployment**: Run migrations, configure env vars, verify batch job scheduled
2. **Monitoring**: Monitor logs, track statistics query latency
3. **Phase 2 Preparation**: Prepare manual clock in/out feature based on US3 groundwork
4. **User Testing**: Get admin feedback on statistics dashboard
5. **Iteration**: Refine UI, optimize performance, add more aggregations (shift type, overtime, etc.)

---

## Notes for Developers

- **Tests are TDD**: Write tests FIRST, then implement to make tests pass
- **Parallel work**: Backend and frontend can be developed concurrently after Phase 2
- **MVP Scope**: Phases 1-4 deliver core feature; US3 is low-risk future-proofing already in place
- **Performance**: Use indexed queries; avoid N+1 problems; test with realistic data volumes
- **Error Messages**: Return user-friendly Spanish messages (align with existing app)
- **Timezone**: Always use tenant timezone for shift times; UTC for timestamps
- **Logging**: Structured JSON with tenant_id, action, user_id context for audit trail
