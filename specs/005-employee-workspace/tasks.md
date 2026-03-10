# Tasks: Employee Workspace Portal

**Input**: Design documents from `/specs/005-employee-workspace/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Status**: Ready for implementation
**Branch**: `005-employee-workspace`

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared dependencies

- [ ] T001 Create Alembic migration stub in `backend/alembic/versions/` for Feature 005
- [ ] T002 [P] Create database migration template for TimeRecord table in `backend/alembic/versions/[timestamp]_add_time_records_table.py`
- [ ] T003 [P] Update `backend/app/models/__init__.py` to export TimeRecord (will be created in later task)
- [ ] T004 [P] Create frontend types file `frontend/src/types/employee.ts` with EmployeeContext interfaces
- [ ] T005 [P] Create frontend hooks directory structure and `frontend/src/hooks/useTimeTracking.ts` stub

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before user stories can proceed

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Foundation

- [ ] T006 [P] Update User model in `backend/app/models/user.py` to add password setup fields:
  - Add `password_reset_token: str | None`
  - Add `password_reset_expires: datetime | None`
  - Add `is_active: bool` (default True for existing users)
  - Add `last_login: datetime | None`

- [ ] T007 [P] Create TimeRecord model in `backend/app/models/time_record.py` with:
  - UUID id (primary key)
  - Foreign keys: tenant_id, employee_id
  - Fields: date, clock_in_timestamp, clock_out_timestamp (nullable), created_at, updated_at
  - Unique constraint on (tenant_id, employee_id, date, clock_out_timestamp)
  - Indexes on (tenant_id, employee_id, date DESC)

- [ ] T008 [P] Create/update schemas in `backend/app/schemas/auth.py`:
  - Create `PasswordSetupRequest` DTO (token, password, password_confirm)
  - Create `PasswordSetupResponse` DTO
  - Create `LoginResponse` DTO (access_token, user details)

- [ ] T009 [P] Create schemas in `backend/app/schemas/time_tracking.py`:
  - Create `TimeRecordResponse` DTO (all fields read-only)
  - Create `TimeRecordListResponse` DTO (paginated)
  - Create `ClockInResponse` DTO
  - Create `ClockOutResponse` DTO with summary

- [ ] T010 [P] Create schemas in `backend/app/schemas/dashboard.py`:
  - Create `DashboardResponse` DTO (employee, today status, vacation balance, upcoming events)
  - Create `ShiftListResponse` DTO
  - Create `VacationBalanceResponse` DTO

- [ ] T011 Create Alembic migration in `backend/alembic/versions/[timestamp]_update_user_password_fields.py`:
  - Add password_reset_token, password_reset_expires, is_active, last_login columns to user table
  - Make hashed_password nullable for new accounts without password

- [ ] T012 Create TimeRecord Alembic migration in `backend/alembic/versions/[timestamp]_add_time_records_table.py`:
  - Create time_record table with all columns
  - Add unique constraint on (tenant_id, employee_id, date, clock_out_timestamp IS NULL)
  - Add indexes for query optimization

### Frontend Foundation

- [ ] T013 [P] Create `frontend/src/components/EmployeeNav.tsx`:
  - Render 3-item sidebar (Shifts, Vacations, Time Tracking)
  - Hide admin navigation from Empleado role
  - Add logout button
  - Add employee name/email display

- [ ] T014 [P] Create `frontend/src/services/authService.ts` update with password setup:
  - Add `setupPassword(token: string, password: string)` function
  - Add error handling with specific error codes (INVALID_PASSWORD, TOKEN_EXPIRED, etc)

- [ ] T015 [P] Create `frontend/src/services/timeTrackingService.ts`:
  - Add `clockIn()` function (POST /employee/time-tracking/clock-in)
  - Add `clockOut()` function (POST /employee/time-tracking/clock-out)
  - Add `getTimeRecords(dateFrom?, dateTo?, page?, size?)` function
  - Add error handling with specific error codes

- [ ] T016 [P] Create/update route guards in `frontend/src/` (likely in App.tsx or routing file):
  - Add `ProtectedRoute` that checks for Empleado role
  - Add redirect to PasswordSetup if is_active is false
  - Prevent access to admin routes from Empleado users

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Password Setup & First Login (Priority: P1) 🎯 MVP

**Goal**: Enable employees to set their password via email and log in, receiving access to the 3-module dashboard

**Independent Test**: Verify that an employee can receive a password setup link, set a password, log in, and see the employee dashboard with only 3 modules (no admin features visible)

### Implementation for US1

- [ ] T017 [US1] Implement password setup validation in `backend/app/services/auth_service.py`:
  - Create `setup_password(token: str, password: str)` function
  - Validate password strength (8+ chars, mixed case, numbers)
  - Find user with matching token and non-expired expires time
  - Hash password with bcrypt and save to user
  - Set user.is_active = True
  - Consume token (set to NULL)
  - Return user object with success message

- [ ] T018 [US1] Implement password setup endpoint in `backend/app/routers/auth.py`:
  - Add `POST /auth/password-setup` endpoint
  - Call auth_service.setup_password()
  - Return 200 with redirect_url to /login
  - Return 400 for weak password (INVALID_PASSWORD)
  - Return 401 for expired token (TOKEN_EXPIRED)
  - Return 404 for token not found (TOKEN_NOT_FOUND)

- [ ] T019 [US1] Create `frontend/src/views/PasswordSetup.tsx`:
  - Extract token from URL query parameter
  - Render password input form with validation feedback
  - Show "Password must be 8+ characters with uppercase, lowercase, numbers" helper text
  - Handle form submission to POST /auth/password-setup
  - Show loading state during submission
  - Show success message and redirect to /login on success
  - Show error message for weak password, expired token, etc
  - Add retry button on error

- [ ] T020 [US1] Create `frontend/src/views/EmployeeDashboard.tsx`:
  - Render 3-module layout (Shifts, Vacations, Time Tracking)
  - Display employee welcome message with name
  - Show quick stats (today's shift, vacation balance summary)
  - Add navigation cards/buttons to each of 3 modules
  - Use EmployeeNav component for sidebar
  - Fetch dashboard data from GET /employee/dashboard endpoint (will create in later story)

- [ ] T021 [US1] Update authentication flow in `frontend/src/context/AuthContext.tsx` or similar:
  - Add `isActive` check - redirect to password setup if is_active is false
  - Add `setupPassword()` method to context
  - After successful login, verify is_active status
  - Prevent dashboard access until password is set

- [ ] T022 [US1] Add unit tests for password setup in `backend/tests/unit/test_auth_service.py`:
  - Test: Valid password setup with valid token
  - Test: Reject weak password (too short)
  - Test: Reject password without uppercase
  - Test: Reject password without numbers
  - Test: Reject expired token
  - Test: Reject nonexistent token
  - Test: One-time use (token consumed after use)

- [ ] T023 [US1] Add integration tests for password setup in `backend/tests/integration/test_auth_endpoints.py`:
  - Test: POST /auth/password-setup flow (email → password setup → login)
  - Test: Cannot access dashboard without password setup
  - Test: Can access dashboard after password setup

- [ ] T024 [US1] Add frontend tests for PasswordSetup component in `frontend/tests/unit/PasswordSetup.test.tsx`:
  - Test: Form validation (password length, mixed case, numbers)
  - Test: Show error messages for weak password
  - Test: Successful password setup shows success message
  - Test: Redirect to login on success

**Checkpoint**: User Story 1 is complete and independently testable - employee can log in and see dashboard

---

## Phase 4: User Story 2 - View Personal Shift Roster Calendar (Priority: P2)

**Goal**: Enable employees to see their assigned shifts in a calendar view with month navigation

**Independent Test**: Verify that an employee can view a monthly calendar of their assigned shifts, navigate between months, and see only their own shifts (no other employees' data visible)

### Implementation for US2

- [ ] T025 [P] [US2] Implement shift listing service in `backend/app/services/shift_service.py`:
  - Create `get_employee_shifts(employee_id: UUID, date_from: date, date_to: date)` function
  - Filter by: tenant_id, employee_id, date range
  - Return shifts with shift_type name (JOIN with ShiftType table)
  - Include vacation_overlap indicator
  - Verify employee can only see own shifts (RLS at service layer)

- [ ] T026 [P] [US2] Create GET endpoint in `backend/app/routers/shifts.py` (or create if not exists):
  - Add `GET /employee/shifts` endpoint with query params (date_from, date_to)
  - Call shift_service.get_employee_shifts()
  - Return paginated list with total count
  - Apply Empleado role protection (Depends on require_role("Empleado"))
  - Handle invalid date range (400 INVALID_DATE_RANGE)

- [ ] T027 [P] [US2] Create `frontend/src/views/EmployeeShiftRoster.tsx`:
  - Render react-big-calendar component
  - Fetch shifts from GET /employee/shifts endpoint
  - Transform shift data for calendar display (date, title with shift type, time range)
  - Implement month navigation (previous/next month)
  - Display shift details on click (shift type, entry_time, exit_time)
  - Show vacation overlap indicator (visual badge/color)
  - Handle loading state and error display
  - Prevent access if not logged in

- [ ] T028 [P] [US2] Create `frontend/src/components/ShiftCard.tsx`:
  - Display single shift with date, shift type, time range
  - Show vacation overlap badge if applicable
  - Make read-only (no edit option)
  - Handle null entry_time/exit_time gracefully

- [ ] T029 [US2] Update route navigation in `frontend/src/` (likely App.tsx):
  - Add route `/employee/shifts` → `<EmployeeShiftRoster />`
  - Protect with ProtectedRoute (Empleado role only)
  - Add to EmployeeNav sidebar

- [ ] T030 [P] [US2] Add unit tests for shift service in `backend/tests/unit/test_shift_service.py`:
  - Test: Get shifts for date range
  - Test: Filter by employee_id (RLS)
  - Test: Include shift_type details
  - Test: Mark vacation overlap correctly
  - Test: Cannot access other employee's shifts

- [ ] T031 [P] [US2] Add integration tests in `backend/tests/integration/test_employee_shifts.py`:
  - Test: GET /employee/shifts returns only employee's shifts
  - Test: GET /employee/shifts with date range filtering
  - Test: Unauthenticated request returns 401
  - Test: Other employee cannot access this employee's shifts (403)

- [ ] T032 [US2] Add frontend tests for ShiftRoster component in `frontend/tests/unit/EmployeeShiftRoster.test.tsx`:
  - Test: Calendar renders with correct month
  - Test: Month navigation updates calendar
  - Test: Shifts display on correct dates
  - Test: Click on shift shows details
  - Test: Vacation overlap badge visible when applicable

**Checkpoint**: User Story 2 is complete - employee can view calendar of their shifts

---

## Phase 5: User Story 3 - Request Vacation (Priority: P3)

**Goal**: Enable employees to request vacation, view balance, and track request status

**Independent Test**: Verify that an employee can create a vacation request, view their balance, see request status, and cancel pending requests (but not approved ones)

### Implementation for US3

- [ ] T033 [P] [US3] Implement vacation service in `backend/app/services/vacation_service.py`:
  - Create `get_vacation_balance(employee_id: UUID)` function
  - Create `create_vacation_request(employee_id: UUID, start_date, end_date, reason)` function
  - Validate: start_date not in past, end_date >= start_date, same calendar year
  - Validate: sufficient remaining balance
  - Validate: no overlapping pending/approved requests
  - Validate: create VacationRequest with status "Pendiente"
  - Create `get_vacation_requests(employee_id: UUID, status?, year?, page?, size?)` function
  - Create `cancel_vacation_request(request_id: UUID, employee_id: UUID)` function
  - Verify employee can only see/cancel own requests (RLS at service layer)

- [ ] T034 [P] [US3] Create endpoints in `backend/app/routers/vacations.py`:
  - Add `GET /employee/vacations/balance` endpoint
  - Add `GET /employee/vacations/requests` endpoint with query params
  - Add `POST /employee/vacations/requests` endpoint
  - Add `PATCH /employee/vacations/requests/{request_id}` endpoint (for cancellation)
  - All endpoints: Apply Empleado role protection
  - Handle error scenarios (insufficient balance, overlapping request, invalid status, access denied)

- [ ] T035 [P] [US3] Create `frontend/src/views/EmployeeVacations.tsx`:
  - Render vacation balance section (total, used, remaining days)
  - Render vacation request list (past and current requests)
  - Include "Create New Request" button/form
  - Form: date range picker, reason text field
  - Handle form submission to POST /employee/vacations/requests
  - Show loading state and error messages
  - Display request list with columns: dates, days, status, actions
  - For pending requests: show Cancel button
  - For approved/rejected: show read-only display
  - Handle pagination if many requests

- [ ] T036 [P] [US3] Create `frontend/src/components/VacationBalanceCard.tsx`:
  - Display total_days, used_days, remaining_days
  - Show as progress bar or card layout
  - Update after successful request creation

- [ ] T037 [P] [US3] Create `frontend/src/components/VacationRequestForm.tsx`:
  - Input: date range (start_date, end_date)
  - Input: reason text (optional)
  - Validate dates are not in past, start <= end
  - Show validation errors
  - Submit button with loading state
  - Success message with new balance

- [ ] T038 [P] [US3] Create `frontend/src/services/vacationService.ts`:
  - Add `getBalance()` function (GET /employee/vacations/balance)
  - Add `getRequests(status?, year?, page?, size?)` function
  - Add `createRequest(startDate, endDate, reason)` function
  - Add `cancelRequest(requestId)` function (PATCH /employee/vacations/requests/{id})
  - Add error handling with specific error codes

- [ ] T039 [US3] Update route navigation:
  - Add route `/employee/vacations` → `<EmployeeVacations />`
  - Protect with ProtectedRoute (Empleado role only)
  - Add to EmployeeNav sidebar

- [ ] T040 [P] [US3] Add unit tests for vacation service in `backend/tests/unit/test_vacation_service.py`:
  - Test: Create vacation request with valid dates
  - Test: Reject request with start_date in past
  - Test: Reject request with insufficient balance
  - Test: Reject overlapping request
  - Test: Get vacation balance calculation
  - Test: Cancel only pending requests
  - Test: RLS - cannot see other employee's requests

- [ ] T041 [P] [US3] Add integration tests in `backend/tests/integration/test_employee_vacations.py`:
  - Test: POST /employee/vacations/requests creates request
  - Test: GET /employee/vacations/balance returns correct balance
  - Test: GET /employee/vacations/requests returns only employee's requests
  - Test: PATCH /employee/vacations/requests/{id} cancels pending request
  - Test: Cannot cancel approved request (403)

- [ ] T042 [US3] Add frontend tests for VacationForm component in `frontend/tests/unit/EmployeeVacations.test.tsx`:
  - Test: Form validates date range
  - Test: Show error for insufficient balance
  - Test: Submit creates request successfully
  - Test: Balance updates after successful request
  - Test: Cancel button shown only for pending requests
  - Test: Vacation overlap badge visible in shift calendar after request

**Checkpoint**: User Story 3 is complete - employee can request vacation and track status

---

## Phase 6: User Story 4 - Clock In & Clock Out (Priority: P4)

**Goal**: Enable employees to record work hours with immutable timestamps

**Independent Test**: Verify that an employee can clock in, clock out, view time records, and cannot modify any timestamps

### Implementation for US4

- [ ] T043 [P] [US4] Implement time tracking service in `backend/app/services/time_tracking_service.py`:
  - Create `clock_in(employee_id: UUID, tenant_id: UUID)` function
  - Validate: employee has shift scheduled for today
  - Validate: no active clock-in already exists (prevent double clock-in)
  - Create TimeRecord with clock_in_timestamp = now(), clock_out_timestamp = NULL
  - Create `clock_out(employee_id: UUID, tenant_id: UUID)` function
  - Validate: active clock-in exists
  - Update TimeRecord: set clock_out_timestamp = now()
  - Calculate total_hours, total_minutes, formatted time
  - Create `get_time_records(employee_id: UUID, date_from?, date_to?, page?, size?)` function
  - Filter by employee_id + tenant_id (RLS)
  - Return immutable records (no edit/delete endpoints)
  - Verify employee can only see own records (RLS at service layer)

- [ ] T044 [P] [US4] Create endpoints in `backend/app/routers/time_tracking.py`:
  - Add `POST /employee/time-tracking/clock-in` endpoint (no body required)
  - Add `POST /employee/time-tracking/clock-out` endpoint (no body required)
  - Add `GET /employee/time-tracking/records` endpoint with query params
  - All endpoints: Apply Empleado role protection (Depends on require_role("Empleado"))
  - Handle error scenarios (no shift, already clocked in, not clocked in, future timestamp)
  - No PUT/DELETE endpoints for employees (immutable records)

- [ ] T045 [P] [US4] Create `frontend/src/views/TimeTracking.tsx`:
  - Display TODAY section with clock status
  - Show "Clock In" button if not clocked in and has shift today
  - Show "Clock Out" button + elapsed time if clocked in
  - Show completed record with summary (clock in time, clock out time, total hours)
  - Show time records list (paginated) for selected date range
  - Date range picker (default: last 30 days)
  - Records table/list with columns: date, clock in, clock out, total hours
  - All records read-only (no edit option)
  - Handle loading state and error display

- [ ] T046 [P] [US4] Create `frontend/src/components/TimeTrackingWidget.tsx`:
  - Display current clock status (clocked in / clocked out / no shift)
  - Show Clock In / Clock Out button based on current state
  - Show elapsed time counter when clocked in (updates every minute)
  - Show confirmation message after successful clock in/out
  - Handle loading state (disable button, show spinner)
  - Show error message if clock fails (no shift, already clocked in, etc)
  - Add retry button on error

- [ ] T047 [P] [US4] Update `frontend/src/hooks/useTimeTracking.ts`:
  - Create hook with state management for time tracking
  - Manage clockStatus (not-clocked-in, clocked-in, clocked-out)
  - Manage currentRecord (when clocked in)
  - Manage elapsedTime (for display)
  - Implement clockIn() function
  - Implement clockOut() function
  - Implement getRecords() function
  - Auto-refetch status on mount and after clock in/out
  - Handle error states

- [ ] T048 [US4] Update route navigation:
  - Add route `/employee/time-tracking` → `<TimeTracking />`
  - Protect with ProtectedRoute (Empleado role only)
  - Add to EmployeeNav sidebar

- [ ] T049 [P] [US4] Add unit tests for time tracking service in `backend/tests/unit/test_time_tracking_service.py`:
  - Test: Clock in creates TimeRecord with correct timestamp
  - Test: Cannot clock in twice without clock out (duplicate prevention)
  - Test: Cannot clock in without shift scheduled today
  - Test: Clock out updates clock_out_timestamp
  - Test: Cannot clock out without clocking in
  - Test: Cannot use future timestamps
  - Test: Calculate total hours/minutes correctly
  - Test: RLS - cannot see other employee's records
  - Test: Records are immutable after creation

- [ ] T050 [P] [US4] Add integration tests in `backend/tests/integration/test_employee_time_tracking.py`:
  - Test: POST /employee/time-tracking/clock-in creates record
  - Test: POST /employee/time-tracking/clock-out updates record
  - Test: GET /employee/time-tracking/records returns only employee's records
  - Test: Cannot clock in without shift (400 NO_SHIFT_TODAY)
  - Test: Cannot double clock-in (409 ALREADY_CLOCKED_IN)
  - Test: Full clock-in → clock-out workflow
  - Test: Other employee cannot access these records (403)

- [ ] T051 [P] [US4] Add frontend tests for TimeTracking component in `frontend/tests/unit/TimeTracking.test.tsx`:
  - Test: Clock In button visible when not clocked in and has shift
  - Test: Clock In button disabled when clocked in
  - Test: Clock Out button visible when clocked in
  - Test: Elapsed time updates every minute when clocked in
  - Test: Success message shown after clock in/out
  - Test: Error message shown for "no shift" error
  - Test: Time records list displays correctly
  - Test: Records are read-only (no edit option)

- [ ] T052 [US4] Add frontend tests for useTimeTracking hook in `frontend/tests/unit/useTimeTracking.test.tsx`:
  - Test: Hook initializes with correct state
  - Test: clockIn() updates state and calls API
  - Test: clockOut() updates state and calls API
  - Test: getRecords() fetches and caches records
  - Test: Error handling for API failures
  - Test: Auto-refetch after successful clock in/out

**Checkpoint**: User Story 4 is complete - employee can clock in/out and view time records immutably

---

## Phase 7: Dashboard Integration & Cross-Story Features

**Goal**: Connect all user stories and finalize shared dashboard features

### Implementation

- [ ] T053 Create `backend/app/routers/dashboard.py`:
  - Add `GET /employee/dashboard` endpoint
  - Gather: employee details, today's shift, vacation balance, upcoming events (next 7 days)
  - Call shift_service.get_shifts(today), vacation_service.get_balance(), time_tracking_service.get_active_record()
  - Return DashboardResponse DTO

- [ ] T054 [P] Update `frontend/src/views/EmployeeDashboard.tsx`:
  - Fetch dashboard data from GET /employee/dashboard
  - Display today's shift info (if exists)
  - Display vacation balance summary
  - Display upcoming events (next 7 days: shifts, pending vacation requests)
  - Show links/cards to each module (Shifts, Vacations, Time Tracking)
  - Handle loading and error states

- [ ] T055 [P] Add integration test for dashboard in `backend/tests/integration/test_employee_dashboard.py`:
  - Test: GET /employee/dashboard returns all required data
  - Test: Today's shift populated correctly
  - Test: Vacation balance accurate
  - Test: Upcoming events include shifts and pending vacations
  - Test: Only employee's data shown (RLS)

- [ ] T056 [P] Add integration test for full employee workflow in `frontend/tests/integration/employeeWorkflow.test.tsx`:
  - Test: Complete flow: login → password setup → dashboard → shifts → vacations → time tracking
  - Test: Can navigate between all 3 modules
  - Test: Data persists when navigating between modules
  - Test: Logout clears state

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, documentation, and quality assurance

### Backend Polish

- [ ] T057 [P] Add audit logging for security events in `backend/app/common/logging.py` or similar:
  - Log password setup (user_id, timestamp, success/failure)
  - Log clock in/out (employee_id, timestamp, clock time)
  - Log vacation request creation (employee_id, date range, requested_days)
  - Log unauthorized access attempts (employee trying to access other employee's data)

- [ ] T058 [P] Add error handling consistency:
  - Review all error responses match contract specifications (error.code, error.message)
  - Ensure no stack traces in production error responses
  - Validate all ValidationError/NotFoundError/ForbiddenError exceptions return correct HTTP status

- [ ] T059 [P] Run type checking:
  - Run `mypy app --strict` in backend (zero errors)
  - Run `ruff check .` linting (zero violations)
  - Fix any issues found

- [ ] T060 Run all backend unit tests:
  - Run `pytest backend/tests/unit/` (all tests pass)
  - Run `pytest backend/tests/integration/` (all tests pass)
  - Generate coverage report

### Frontend Polish

- [ ] T061 [P] Add error message handling consistently:
  - Review all error responses map to user-friendly Spanish messages
  - Use `errorHandler.extractErrorMessage()` from Feature 004 as reference
  - Test error messages display correctly in all forms

- [ ] T062 [P] Run type checking:
  - Run `npm run lint` (zero violations)
  - Run `npm run build` (build succeeds)
  - Fix any TypeScript strict mode issues

- [ ] T063 Run all frontend tests:
  - Run `npm run test` (all tests pass)
  - Generate coverage report
  - Verify integration tests work end-to-end

### Documentation & Validation

- [ ] T064 Verify API contracts match implementation:
  - Verify `/contracts/employee-auth.md` matches actual endpoints
  - Verify `/contracts/employee-dashboard.md` matches actual endpoints
  - Verify `/contracts/employee-time-tracking.md` matches actual endpoints
  - Update contracts if discrepancies found

- [ ] T065 Run `/speckit.analyze` for specification consistency:
  - Verify spec.md requirements map to implemented tasks
  - Verify plan.md architecture matches actual code
  - Verify data-model.md matches actual database schema
  - Fix any inconsistencies

- [ ] T066 [P] Create README section for Employee Workspace Portal:
  - Document the 4 user stories and their status
  - Document how to run feature locally (from DEV_SETUP.md)
  - Document API endpoints (link to contracts/)
  - Document testing approach and coverage

- [ ] T067 Verify migration strategy:
  - Confirm Alembic migrations in correct order
  - Test: Fresh database → run migrations → all tables exist with correct schema
  - Test: Rollback migrations → tables removed correctly

### Final Quality Checks

- [ ] T068 Run complete integration test suite:
  - Full employee workflow: password setup → login → dashboard → shifts → vacations → time tracking
  - Verify RLS: employee cannot access other employee's data
  - Verify immutability: time records cannot be edited
  - Verify validation: all error scenarios handled correctly

- [ ] T069 Load testing (manual or with locust/k6):
  - 10 concurrent employees clocking in simultaneously
  - Verify no duplicate TimeRecords created
  - Verify response time < 200ms p95
  - Verify database handles concurrent requests correctly

- [ ] T070 Security validation:
  - Attempt to access other employee's time records without permission → 403
  - Attempt to modify time record timestamps → 403
  - Attempt to approve own vacation request → 403 (only admin/moderador can approve)
  - Attempt to access endpoints without valid JWT → 401
  - Verify rate limiting on auth endpoints (10 req/min)

**Checkpoint**: All stories complete, tested, documented, and ready for production

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Stories (Phase 3-6)**: All depend on Foundational completion
  - US1 (P1): Foundation → US1 (no dependencies on other stories)
  - US2 (P2): Foundation → US2 (can start parallel to US1, but independent)
  - US3 (P3): Foundation → US3 (can start parallel to US1/US2, but independent)
  - US4 (P4): Foundation → US4 (can start parallel to US1/US2/US3, but independent)
- **Dashboard Integration (Phase 7)**: Depends on ALL user stories (Phase 3-6)
- **Polish (Phase 8)**: Depends on Dashboard Integration

### Within Each User Story

1. **Tests First** (if applicable)
   - Write tests that FAIL before implementation
   - Service/endpoint contract tests establish expected behavior

2. **Models/Data** (can be parallel in a user story)
   - Create models needed for story
   - Create DTOs/schemas for requests/responses

3. **Services** (depends on models)
   - Implement business logic
   - Implement validation
   - Implement RLS filters

4. **Endpoints/Components** (depends on services)
   - Create API endpoints (backend)
   - Create views/components (frontend)
   - Call services from endpoints/components

5. **Integration** (final)
   - Integration tests verify complete workflow
   - Update navigation/routing
   - Add to UI

### Parallel Opportunities

**Phase 1 (Setup)**:
- T002, T003, T004, T005 can run in parallel

**Phase 2 (Foundational)**:
- T006, T007, T008, T009, T010 can run in parallel (backend models/schemas)
- T013, T014, T015, T016 can run in parallel (frontend foundation)
- T011, T012 must wait for models (T006, T007) to be ready

**Phase 3 (US1) - Backend tasks can run in parallel**:
- T017, T018 (auth service + endpoint)
- T022, T023 (tests)
- Parallel: Teams implement service + tests simultaneously

**Phase 3 (US1) - Frontend tasks can run in parallel**:
- T019, T020 (PasswordSetup + Dashboard views)
- T024 (tests)

**Phase 4 (US2) - Can run in parallel with Phase 3**:
- T025, T026 (backend shift service + endpoint)
- T027, T028, T029 (frontend components)
- T030, T031, T032 (tests)

**Phase 5 (US3) - Can run in parallel with Phase 3/4**:
- T033, T034 (backend vacation service + endpoints)
- T035, T036, T037, T038, T039 (frontend components)
- T040, T041, T042 (tests)

**Phase 6 (US4) - Can run in parallel with Phase 3/4/5**:
- T043, T044 (backend time tracking service + endpoints)
- T045, T046, T047, T048 (frontend components)
- T049, T050, T051, T052 (tests)

**Phase 7 (Dashboard Integration)** - Must wait for all stories:
- T053, T054 (dashboard endpoint + view)
- T055, T056 (integration tests)

**Phase 8 (Polish)** - Can start once Phase 7 done:
- T057, T058, T059, T061, T062, T066 can run in parallel
- T060, T063, T068, T069, T070 are sequential (run tests)

---

## Parallel Example: Phase 2 Foundational Tasks

```
Team Member A:                  Team Member B:                  Team Member C:
├─ T006 (User model updates)   ├─ T008 (Auth schemas)          ├─ T013 (EmployeeNav)
├─ T007 (TimeRecord model)      ├─ T009 (Time tracking schemas) ├─ T014 (authService)
└─ T010 (Dashboard schemas)     └─ T015 (timeTrackingService)   └─ T016 (Route guards)

After models done (T006, T007):
└─ T011 (User table migration)
└─ T012 (TimeRecord migration)

All parallel tasks complete → Foundation ready → Proceed to User Stories
```

---

## Parallel Example: Implementing All User Stories

```
After Phase 2 (Foundational) completes:

Team A works on US1:           Team B works on US2:           Team C works on US3:           Team D works on US4:
├─ T017-T024 (US1 tasks)       ├─ T025-T032 (US2 tasks)       ├─ T033-T042 (US3 tasks)      ├─ T043-T052 (US4 tasks)
└─ Independent testing         └─ Independent testing         └─ Independent testing        └─ Independent testing

All teams complete in parallel → All stories ready → Merge + test integration (Phase 7)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup ✅
2. Complete Phase 2: Foundational ✅ (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 ✅
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Demo/deploy if ready

### Incremental Delivery (Add Remaining Stories)

1. Teams complete Setup + Foundational → Foundation ready ✅
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! 🎯)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Finalize with Dashboard Integration + Polish

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational (Phase 2) is done:
   - Dev A: User Story 1 (P1)
   - Dev B: User Story 2 (P2)
   - Dev C: User Story 3 (P3)
   - Dev D: User Story 4 (P4)
3. All stories complete in parallel
4. Regroup for Dashboard Integration (Phase 7)
5. Final polish and testing (Phase 8)

---

## Task Summary

| Phase | Title | Task Count | Notes |
|-------|-------|-----------|-------|
| 1 | Setup | 5 | Foundation initialization |
| 2 | Foundational | 11 | Blocking prerequisites (models, schemas, endpoints) |
| 3 | US1: Password Setup | 8 | MVP - password setup + first login |
| 4 | US2: Shift Calendar | 8 | View personal shift roster |
| 5 | US3: Vacation Requests | 10 | Request vacation, track status |
| 6 | US4: Clock In/Out | 10 | Record work hours immutably |
| 7 | Dashboard Integration | 4 | Connect all stories |
| 8 | Polish & QA | 14 | Testing, documentation, final checks |
| **TOTAL** | **70 tasks** | **70** | |

---

## Notes

- [P] tasks = different files, no dependencies (can run in parallel)
- [Story] label (US1, US2, US3, US4) maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests are marked but OPTIONAL - include only if team requests TDD approach
- Commit after each task or logical group (recommend per user story phase)
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
