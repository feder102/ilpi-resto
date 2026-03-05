# Implementation Tasks: Shift Roster Calendar View

**Feature**: `004-shift-roster-calendar` | **Date**: 2026-03-05
**Specification**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Executive Summary

**Total Tasks**: 32 tasks across 5 phases
**Duration**: 5-7 development days (with parallel execution)
**Dependency Structure**: Linear setup → Parallel service/model → Parallel frontend/endpoints
**MVP Scope**: User Story 1 (View Monthly Roster) + User Story 2 (Assign Employee) = Features P1
**Post-MVP**: User Stories 3-4 (Conflict Management, Bulk Operations) = Features P2

---

## Task Dependency Graph

```
Phase 1: Setup & Infrastructure (3 tasks, T001-T003) — SEQUENTIAL
    ↓
Phase 2: Backend Foundations (4 tasks, T004-T007) — PARALLEL
    ├─→ T004: ShiftRecord model
    ├─→ T005: ShiftType enum
    ├─→ T006: Database migration
    └─→ T007: Exceptions
    ↓
Phase 3: User Story 1 - View Roster (5 tasks, T008-T012) — PARALLEL [US1]
    ├─→ T008: ShiftRecord service (list/query)
    ├─→ T009: Shifts endpoint (GET)
    ├─→ T010: Calendar grid component
    ├─→ T011: Calendar hook (useShiftCalendar)
    └─→ T012: Calendar page (ShiftRosterCalendar.tsx)
    ↓
Phase 4: User Story 2 - Assign Employee (6 tasks, T013-T018) — PARALLEL [US2]
    ├─→ T013: ShiftRecord service (create/update/delete)
    ├─→ T014: Shifts endpoint (POST/PUT/DELETE)
    ├─→ T015: ShiftAssignmentDialog component
    ├─→ T016: Conflict detection service
    ├─→ T017: Vacation integration
    └─→ T018: Assignment modal integration
    ↓
Phase 5: User Story 3 & 4 - Advanced Features (8 tasks, T019-T026) — PARALLEL [US3/US4]
    ├─→ T019: Conflict warning UI [US3]
    ├─→ T020: Conflict detection tests [US3]
    ├─→ T021: Filter by department component [US4]
    ├─→ T022: Bulk assignment logic [US4]
    ├─→ T023: Vacation warning integration
    ├─→ T024: Permission filters
    ├─→ T025: API tests
    └─→ T026: Frontend component tests
    ↓
Phase 6: Polish & Quality (6 tasks, T027-T032) — PARALLEL
    ├─→ T027: TypeScript strict validation
    ├─→ T028: mypy --strict validation
    ├─→ T029: Response time optimization
    ├─→ T030: Responsive design (tablet)
    ├─→ T031: Documentation & quickstart
    └─→ T032: Deployment checklist
```

---

## Phase 1: Setup & Infrastructure (3 tasks)

### Phase Goal
Initialize backend routing structure and database schema foundation for shift rostering.

### Tasks

- [ ] T001 Create backend routing structure: `backend/app/routers/shifts.py` (empty router module, imports)
- [ ] T002 Create backend services directory: `backend/app/services/shift_record_service.py` (empty service class)
- [ ] T003 Create frontend views directory: `frontend/src/views/ShiftRosterCalendar.tsx` (empty component)

---

## Phase 2: Backend Foundations (4 tasks) — FOUNDATIONAL/BLOCKING

### Phase Goal
Build core domain models and service infrastructure that all user stories depend on.

**All tasks must complete before Phase 3 begins** (user stories depend on ShiftRecord model and exceptions).

### Tasks

- [ ] T004 Implement ShiftRecord SQLModel in `backend/app/models/shift_record.py`:
  - Fields: id (UUID), tenant_id (UUID FK), employee_id (UUID FK), date (Date), shift_type (Enum), created_at (DateTime), updated_at (DateTime), created_by (UUID FK)
  - Constraint: Unique (tenant_id, employee_id, date)
  - Validation: date not in past, shift_type in enum values
  - Type hints on all fields, Pydantic validation

- [ ] T005 Define ShiftType enum in `backend/app/common/enums.py`:
  - Values: MORNING ("morning"), AFTERNOON ("afternoon"), NIGHT ("night")
  - Export in `backend/app/models/__init__.py` for Alembic metadata
  - Use enum in ShiftRecord model

- [ ] T006 Create Alembic migration in `backend/alembic/versions/`:
  - Create `shift_record` table with all fields from T004
  - Create indexes: (tenant_id, date), (tenant_id, employee_id, date), (shift_type)
  - Foreign keys: employee_id → employee, tenant_id → tenant, created_by → user
  - Constraint: Unique (tenant_id, employee_id, date)
  - Migration naming: YYYY-MM-DD_shift_record_table.py
  - Run `alembic upgrade head` to verify

- [ ] T007 Create domain exceptions in `backend/app/common/exceptions.py`:
  - ShiftConflictError(DomainException) — employee already has shift on date
  - VacationOverlapWarning(DomainException) — employee has approved vacation on date
  - Error codes: SHIFT_CONFLICT_001, VACATION_OVERLAP_WARNING_001
  - Include error message templates in Spanish

---

## Phase 3: User Story 1 - View Monthly Shift Roster (5 tasks) — [US1]

### Story Goal
**As a scheduling administrator or moderator, I need to see all employees and their assigned shifts for a given month displayed in a large calendar format.**

**Independent Test Criteria**:
- ✅ Can navigate to `/rosters/calendar` page
- ✅ Calendar displays current month with all days visible
- ✅ All shifts for the month are displayed with employee names and shift types
- ✅ Navigation to next/previous month works and updates calendar
- ✅ Empleado users see only their own shifts; Moderador/Admin see all shifts
- ✅ Page loads in <3 seconds
- ✅ Calendar is responsive on tablet (iPad size)

### Tasks

- [ ] T008 [P] [US1] Implement ShiftRecordService query methods in `backend/app/services/shift_record_service.py`:
  - `get_shifts_for_month(tenant_id, year, month, employee_id=None)` — returns list of shifts for given month
  - `get_employee_shifts(tenant_id, employee_id)` — returns shifts for specific employee
  - Type hints, return ShiftResponse pydantic models
  - Filter by tenant_id on all queries
  - If employee_id provided, filter to that employee
  - Sort by date, then shift_type

- [ ] T008b [P] [US1] Implement RBAC check in ShiftRecordService:
  - Add `_check_access(user_role, requesting_employee_id, target_employee_id)` method
  - Empleado can only access own shifts; Moderador/Admin can access all
  - Raise PermissionError with 403 code if denied
  - Use in all query methods

- [ ] T009 [P] [US1] Create GET endpoint in `backend/app/routers/shifts.py`:
  - Endpoint: `GET /api/v1/shifts?month=2026-03&employee_id={id}` (optional employee_id)
  - Parse month from query param; extract tenant_id from JWT
  - Call ShiftRecordService.get_shifts_for_month()
  - Response: `{shifts: [ShiftResponse], total: int}`
  - Status codes: 200 (success), 400 (invalid month), 403 (unauthorized)
  - Include audit log: log access with actor_id, target_employee_id
  - Rate limit: 100 req/min

- [ ] T010 [P] [US1] Create CalendarGrid component in `frontend/src/components/CalendarGrid.tsx`:
  - React component: `<CalendarGrid shifts={shifts} onSelectDate={callback} />`
  - Use react-big-calendar or react-calendar library (if not installed, `npm install`)
  - Display month view with all days visible
  - Each day cell shows employee names + shift types (max 3 visible, show "+X more" if needed)
  - Highlight Sundays with light gray background
  - Support next/prev month navigation
  - TypeScript: type ShiftRecord, type Props with TypeScript strict
  - Responsive: mobile-first (stack on small screens), desktop grid layout
  - Accessibility: ARIA labels on navigation buttons, keyboard-navigable

- [ ] T011 [P] [US1] Create useShiftCalendar hook in `frontend/src/hooks/useShiftCalendar.ts`:
  - Hook: `useShiftCalendar(month, year, employeeId?)` → `{shifts, loading, error, nextMonth, prevMonth}`
  - Call `shiftService.getShifts(month, year, employeeId)` on mount and dependency changes
  - Handle loading state, error state
  - Provide nextMonth/prevMonth callbacks that update month/year state
  - Memoize to prevent unnecessary re-renders
  - TypeScript: return typed object, strict mode

- [ ] T012 [US1] Create ShiftRosterCalendar page in `frontend/src/views/ShiftRosterCalendar.tsx`:
  - Page component: displays CalendarGrid + month navigation
  - Call useShiftCalendar hook
  - Show loading spinner while data fetches
  - Show error message if fetch fails
  - Display current month by default
  - Header shows "Rosters - March 2026" (i18n in Spanish: "Rostos - Marzo 2026")
  - RBAC: Empleado users auto-filtered to own employee_id; Moderador/Admin see all
  - Route: `/rosters/calendar`
  - Responsive: full-width on all screens

---

## Phase 4: User Story 2 - Assign Employee to Shift (6 tasks) — [US2]

### Story Goal
**As a scheduling administrator or moderator, I need to drag/select an employee and assign them to a specific day with a specific shift type.**

**Independent Test Criteria**:
- ✅ Can click on a calendar date to open assignment dialog
- ✅ Assignment dialog shows employee dropdown and shift type selector
- ✅ Can select employee and shift type, then submit
- ✅ Shift assignment creates ShiftRecord in database
- ✅ Calendar immediately updates to show new shift
- ✅ Can edit existing shift (click → update → save)
- ✅ Can delete shift (click → delete confirmation → remove)
- ✅ Conflict warning shown if employee already has shift on that day
- ✅ Only Moderador/Admin can assign (Empleado gets permission denied)
- ✅ Vacation warning shown if employee has approved vacation on date
- ✅ Assignment completes in <2 minutes from UI click to confirmation

### Tasks

- [ ] T013 [P] [US2] Extend ShiftRecordService with mutation methods in `backend/app/services/shift_record_service.py`:
  - `create_shift(tenant_id, employee_id, date, shift_type, created_by)` → ShiftResponse
  - `update_shift(tenant_id, shift_id, shift_type)` → ShiftResponse
  - `delete_shift(tenant_id, shift_id)` → None
  - Each method: validate date not in past, check RBAC (Moderador+ only), check conflict, log audit
  - Return ShiftResponse or raise DomainException
  - Type hints on all params and returns

- [ ] T013b [P] [US2] Implement conflict detection in ShiftRecordService:
  - Add `_check_shift_conflict(tenant_id, employee_id, date)` method
  - Query existing shifts for employee+date; raise ShiftConflictError if found
  - Called in create_shift() and update_shift()
  - Log conflict attempt with actor_id, employee_id, date

- [ ] T013c [P] [US2] Implement vacation check in ShiftRecordService:
  - Add `_check_vacation(tenant_id, employee_id, date)` method
  - Query VacationRequest where status=Aprobado and date in range
  - If found, include in response as warning (not error)
  - Return warning message for UI to display
  - Warn but allow assignment (caller decides)

- [ ] T014 [P] [US2] Create POST/PUT/DELETE endpoints in `backend/app/routers/shifts.py`:
  - POST `POST /api/v1/shifts` — Create shift
    - Body: `{employee_id, date, shift_type}`
    - Call ShiftRecordService.create_shift()
    - Response: `{shift: ShiftResponse, warning?: string}` (warning if vacation)
    - Status: 201 (created), 409 (conflict), 403 (unauthorized), 400 (validation error)
  - PUT `PUT /api/v1/shifts/{shift_id}` — Update shift
    - Body: `{shift_type}` (or full shift object)
    - Call ShiftRecordService.update_shift()
    - Response: `{shift: ShiftResponse}`
    - Status: 200 (ok), 404 (not found), 409 (conflict), 403 (unauthorized)
  - DELETE `DELETE /api/v1/shifts/{shift_id}` — Delete shift
    - Call ShiftRecordService.delete_shift()
    - Response: `{success: true}` or `{error: {...}}`
    - Status: 204 (no content), 404 (not found), 403 (unauthorized)
  - All endpoints: extract tenant_id from JWT, audit log action
  - Rate limit: 100 req/min

- [ ] T015 [P] [US2] Create ShiftAssignmentDialog component in `frontend/src/components/ShiftAssignmentDialog.tsx`:
  - React Modal component: `<ShiftAssignmentDialog isOpen={bool} date={Date} onClose={callback} onSubmit={callback} />`
  - Form fields:
    - Employee dropdown (loaded from API, filtered by department if applicable)
    - Shift type radio buttons (morning, afternoon, night)
    - Submit and Cancel buttons
  - Validation: require both employee and shift_type selected
  - Show "Required" error if submitted without both
  - Show loading spinner while submitting
  - Show success toast: "Shift assigned successfully"
  - Show error toast: "Error: {message}" (especially conflict or vacation warning)
  - TypeScript strict, form state management with useState
  - Accessibility: form labels, tab-navigable inputs, focus on submit
  - Responsive: modal fits on tablet

- [ ] T016 [P] [US2] Create shiftService API client in `frontend/src/services/shiftService.ts`:
  - `getShifts(month, year, employeeId?)` → Promise<ShiftRecord[]>
  - `createShift(employeeId, date, shiftType)` → Promise<{shift, warning?}>
  - `updateShift(shiftId, shiftType)` → Promise<ShiftRecord>
  - `deleteShift(shiftId)` → Promise<void>
  - Use axios; include JWT in Authorization header (from auth context)
  - Handle errors: catch and re-throw as typed errors
  - Include loading states (optional: use custom hook for loading/error)
  - TypeScript: type request/response payloads

- [ ] T017 [P] [US2] Integrate ShiftAssignmentDialog into ShiftRosterCalendar view:
  - Add dialog state: `isDialogOpen`, `selectedDate`, `selectedShift`
  - On CalendarGrid date click: set selectedDate, open dialog
  - On ShiftAssignmentDialog submit: call `shiftService.createShift()`, close dialog, refresh shifts
  - On shift in calendar click (edit): populate dialog with shift data, open for edit
  - On shift in calendar click (delete): show confirmation, call `deleteShift()`, refresh
  - Refresh shifts list after create/update/delete (call useShiftCalendar hook's refetch or similar)
  - Show success/error toasts from API responses
  - Handle optimistic UI updates (or wait for server confirmation)

- [ ] T018 [US2] Integrate vacancy warnings into ShiftAssignmentDialog:
  - When employee selected, check if approved vacation on selected date
  - If yes: show yellow warning banner: "⚠️ Employee has approved vacation on this date"
  - Allow user to proceed despite warning
  - When shift created, if warning was present, confirm: "Proceed with assigning during vacation?"

---

## Phase 5: User Story 3 & 4 - Advanced Features (8 tasks) — [US3/US4]

### User Story 3: Manage Shift Conflicts (Priority: P2) — [US3]

**Story Goal**: Warn administrators of conflicts to prevent invalid schedules.

### User Story 4: Bulk Operations & Filters (Priority: P2) — [US4]

**Story Goal**: Enable efficient scheduling for large teams via filtering and bulk assignment.

### Tasks

- [ ] T019 [P] [US3] Create conflict warning UI in ShiftAssignmentDialog:
  - Before dialog open: call `shiftService.checkConflict(employeeId, date)`
  - If conflict exists: show red warning: "⚠️ Employee already assigned to a shift on this date"
  - Disable submit button if hard conflict (admin setting: allow override or block)
  - If admin, show "Override conflict?" checkbox to allow force-assignment
  - Style: red border around form, warning icon

- [ ] T020 [US3] Write integration tests for conflict detection in `backend/tests/test_shifts.py`:
  - Test 1: Create shift for employee on date → OK
  - Test 2: Try to create second shift for same employee on same date → 409 Conflict
  - Test 3: Create shift on different date → OK
  - Test 4: Update existing shift → OK
  - Test 5: Override flag (if implemented) allows second shift → OK (with warning logged)
  - Use pytest, httpx client, test database
  - 80%+ coverage on ShiftRecordService.create_shift()

- [ ] T021 [P] [US4] Create DepartmentFilter component in `frontend/src/components/DepartmentFilter.tsx`:
  - Filter component: `<DepartmentFilter onFilter={callback} />`
  - Dropdown of departments (loaded from Employee API or hardcoded: Cocina, Barra, etc.)
  - "All Departments" default option
  - On selection change: call callback with selected department
  - Parent (ShiftRosterCalendar) passes department filter to hook
  - Hook refetches shifts for filtered employees only
  - Shows "Filtering by: Cocina" label

- [ ] T022 [P] [US4] Implement bulk assignment logic in ShiftRecordService:
  - New method: `create_shifts_bulk(tenant_id, employee_ids: List, dates: List, shift_type, created_by)` → List[ShiftResponse]
  - Validate all employee_ids exist and are active
  - For each (employee, date) pair: check conflict, create shift
  - Return successful shifts + errors for conflicts
  - Rollback on critical error (transaction), or partial success on conflict
  - Audit log bulk operation with actor_id, count, affected employees

- [ ] T023 [P] [US3/US4] Add VacationRequest query integration:
  - Create `check_vacation_on_date(tenant_id, employee_id, date_from, date_to)` in VacationRequestService (or new utility)
  - Query: SELECT VacationRequest WHERE tenant_id={} AND employee_id={} AND status=Aprobado AND date BETWEEN {} AND {}
  - Return: [list of vacation requests covering those dates]
  - Use in ShiftAssignmentDialog to show warnings
  - Implement with 90-day cache in memory (update: only on vacation events)

- [ ] T024 [P] [US3/US4] Add permission filters to shift queries:
  - Extend `_check_access()` to support filtering by department
  - Only show employees in selected department if filter applied
  - Moderador: can filter; Admin: can see all; Empleado: only own
  - Pass department filter from frontend to API query param

- [ ] T025 [US3/US4] Write API contract tests in `backend/tests/test_shift_contracts.py`:
  - Test 1: GET /shifts returns correct schema (shifts array, timestamps, employee names)
  - Test 2: POST /shifts creates with status 201
  - Test 3: PUT /shifts/{id} updates with status 200
  - Test 4: DELETE /shifts/{id} returns 204
  - Test 5: POST with conflict returns 409
  - Test 6: POST by Empleado returns 403
  - Use pytest, test database, ~10 tests, 80%+ coverage

- [ ] T026 [US3/US4] Write frontend component tests in `frontend/tests/ShiftRosterCalendar.test.tsx`:
  - Test 1: Component renders calendar on mount
  - Test 2: Clicking date opens dialog
  - Test 3: Submitting dialog creates shift (mocked API)
  - Test 4: Conflict warning shows if API returns conflict
  - Test 5: Department filter updates displayed shifts
  - Use Vitest + React Testing Library, ~8 tests, 60%+ coverage

---

## Phase 6: Polish & Quality (6 tasks)

### Phase Goal
Ensure production-readiness, performance, and adherence to constitution.

### Tasks

- [ ] T027 Validate TypeScript strict mode in `frontend/src/`:
  - Run `npx tsc --noEmit` from frontend root
  - Fix all type errors (zero `any` types unless justified)
  - Check: all props typed, all hook returns typed, all API calls typed
  - Document any justified `any` usage in code comment: `// Any justified because...`

- [ ] T028 Validate mypy --strict in `backend/`:
  - Run `mypy backend/app --strict`
  - Fix all type errors (zero failures allowed)
  - Check: all function signatures typed, all returns typed, imports typed
  - Especially ShiftRecordService, shifts router, shift models

- [ ] T029 Optimize API response time and caching:
  - Add database indexes (done in T006, verify they exist)
  - Verify queries execute in <200ms p95 (use EXPLAIN ANALYZE)
  - Add pagination to GET /shifts if list > 100 items
  - Consider in-memory caching for shift list (1-min TTL) if needed
  - Measure: use curl + time to test `/api/v1/shifts?month=2026-03`

- [ ] T030 Ensure responsive design on tablet (iPad size):
  - Test on Safari DevTools iPad Pro viewport (1024×1366)
  - Verify calendar grid is readable (font >12px)
  - Verify buttons clickable (touch target >44px)
  - Verify dialog fits without scrolling
  - Verify month navigation buttons accessible
  - Use Tailwind responsive classes: `md:`, `lg:` breakpoints
  - Screenshot: calendar on tablet (landscape and portrait)

- [ ] T031 Create/update developer quickstart in `specs/004-shift-roster-calendar/quickstart.md`:
  - 5-min guide: file locations, how to run, test commands
  - Section 1: Backend setup (cd backend, pip install, alembic migrate)
  - Section 2: Frontend setup (cd frontend, npm install, npm run dev)
  - Section 3: Test shift assignment (create shift via API, view in calendar)
  - Section 4: Running tests (pytest, vitest, coverage)
  - Section 5: Common tasks (add new shift type, add new endpoint, add new filter)
  - Include example requests (curl) for all endpoints

- [ ] T032 Verify deployment checklist:
  - [ ] All secrets in .env (NONE in source code)
  - [ ] Database migrations versioned in alembic/versions/
  - [ ] Seed data includes shift types in backend/app/seed.py
  - [ ] Security headers set in FastAPI config (CSP, HSTS, etc.)
  - [ ] Rate limiting configured on /api/v1/shifts endpoints
  - [ ] Audit logging configured for shift operations
  - [ ] Docker image builds successfully (if applicable)
  - [ ] Frontend build succeeds (`npm run build`, no errors)
  - [ ] All tests pass (pytest, vitest)
  - [ ] No console errors/warnings in frontend

---

## Cross-Cutting Concerns

### Error Handling
- **Backend**: All errors return DomainException format: `{error: {code, message, details}}`
- **Frontend**: All API errors caught and shown as toast notifications
- **Logging**: All shift operations logged to JSON: `{timestamp, level, actor_id, action, result, details, tenant_id}`

### Type Safety
- **Backend**: `mypy --strict` passes; zero errors
- **Frontend**: `tsc --noEmit` passes; no `any` types
- **Both**: All function signatures include type hints

### RBAC Enforcement
- **Backend**: Service-layer checks (not just router guards)
  - Empleado: read own shifts only
  - Moderador: create/update/delete any, read all
  - Admin: full access
- **Frontend**: Hide/disable UI for unauthorized users; backend enforces

### Tenant Isolation
- **All queries**: Filter by tenant_id from JWT
- **Shifts**: No cross-tenant visibility
- **Employees**: Filtered by tenant in queries

---

## Parallel Execution Strategy

### MVP (User Story 1 & 2) — 3-4 days

**Phase 1 (Sequential)**: T001-T003 (30 min)
**Phase 2 (Parallel)**: T004-T007 (1 day)
**Phase 3 (Parallel)**: T008-T012 (1.5 days)
  - T008 + T008b (service) → T009 (endpoint) [dependency: service before endpoint]
  - T010 + T011 (components) [independent]
  - T012 (page) depends on T009 + T010 + T011 (but can start design early)
**Phase 4 (Parallel)**: T013-T018 (1.5 days)
  - T013 + T013b + T013c (service methods) [parallel]
  - T014 (endpoints) depends on T013
  - T015 + T016 (components + client) [independent]
  - T017 + T018 (integration) depends on all above

### Parallel Development Example
```
Day 1:
  Dev A: T001-T003 (setup)
  Dev B: waiting for Phase 2

Day 2:
  Dev A: T004 (ShiftRecord model)
  Dev B: T005 (enum) + T007 (exceptions) [parallel]
  Dev C: T006 (migration, blocks until models ready)

Day 3:
  Dev A: T008 + T008b (service layer)
  Dev B: T009 (endpoint, waits for T008)
  Dev C: T010 + T011 (components, independent)

Day 4:
  Dev A: T013 + T013b + T013c (more service)
  Dev B: T014 (endpoints, waits for T013)
  Dev C: T015 + T016 (dialog + API client)
  Dev D: T012 (page integration, waits for T009+T010+T011)

Day 5:
  Dev A: T017 + T018 (dialog integration, waits for T014+T015)
  Dev B: T019 + T023 + T024 (advanced features)
  Dev C: T020 + T025 + T026 (tests)

Day 6+:
  All: T027-T032 (polish & quality)
```

---

## Implementation Strategy

### MVP Scope
**User Story 1 + 2** (3-4 days)
- View monthly roster ✅
- Assign employee to shift ✅
- Conflict detection (basic, service-layer) ✅
- Vacation warning (basic, UI) ✅

### Not in MVP (post-launch features)
- Department filtering (P2, User Story 4)
- Bulk assignment (P2, User Story 4)
- Shift type configuration (out of scope)
- Real-time collaboration (out of scope)
- Mobile app (out of scope, responsive web only)

### Quality Gates (ALL MUST PASS before merge)
```bash
# Backend
cd backend && mypy app --strict && ruff check . && pytest --cov=app/services/shift_record_service --cov-report=term-missing

# Frontend
cd frontend && npm run lint && npx tsc --noEmit && npm run build && npm run test
```

---

## Task Status Template

Use this to track progress:

```markdown
## Phase 1: Setup (T001-T003)
- [x] T001 Create backend routing structure
- [ ] T002 Create backend services directory
- [ ] T003 Create frontend views directory

## Phase 2: Foundations (T004-T007)
- [ ] T004 Implement ShiftRecord model
- [ ] T005 Define ShiftType enum
- [ ] T006 Create Alembic migration
- [ ] T007 Create domain exceptions

[Continue for Phases 3-6...]
```

---

## References

- **Specification**: [spec.md](./spec.md) — User stories, requirements, success criteria
- **Implementation Plan**: [plan.md](./plan.md) — Technical design, architecture, dependencies
- **Constitution**: `specs/001-kitchen-staff-mgmt/constitution.md` — 10 principles to follow
- **Existing Models**: `backend/app/models/` — Employee, VacationRequest, User models
- **Existing Services**: `backend/app/services/` — Employee service, vacation service patterns
- **Type System**: `backend/app/common/exceptions.py`, `frontend/src/types/` — Typing conventions

---

## Approval Checklist

Before merging to main:

- [ ] All Phase 1-4 tasks complete (MVP: User Stories 1-2)
- [ ] mypy --strict passes (backend)
- [ ] tsc --noEmit passes (frontend)
- [ ] pytest passes with 80%+ coverage (services, models)
- [ ] npm run lint passes (frontend)
- [ ] npm run build succeeds (zero errors)
- [ ] All endpoints tested (via pytest, curl, Postman)
- [ ] Calendar renders and responds in <3s
- [ ] Tablet responsiveness verified
- [ ] No console errors in browser
- [ ] Security headers present
- [ ] Audit logging working
- [ ] RBAC enforced (Empleado can't see others' shifts)
- [ ] Tenant isolation verified
- [ ] Documentation (quickstart.md) complete
- [ ] PR reviewed and approved

---

**Date Generated**: 2026-03-05
**Total Estimated Effort**: 40-56 hours (5-7 days at 8 hrs/day with 2+ developers)
**Ready for Implementation**: ✅ YES
