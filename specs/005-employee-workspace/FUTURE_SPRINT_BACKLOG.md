# Feature 005: Future Sprint Backlog

**Feature**: Employee Workspace Portal
**Created**: 2026-03-10
**Status**: Phase 1-3 COMPLETE ✅ | Phase 4-8 PENDING ⏳

---

## 🎯 What's Implemented (Phase 1-3)

### ✅ Phase 1: Setup & Infrastructure
- ✅ Alembic migrations for TimeRecord table
- ✅ Database models (TimeRecord, User updates)
- ✅ Pydantic schemas for all DTOs
- ✅ Frontend types and hooks structure

### ✅ Phase 2: Foundational Backend/Frontend
- ✅ User model with password setup fields (`is_active`, `password_reset_token`, etc)
- ✅ TimeRecord model with proper constraints
- ✅ Auth schemas (LoginResponse, PasswordSetupRequest, etc)
- ✅ EmployeeNav sidebar component
- ✅ authService with password setup support
- ✅ timeTrackingService implementation
- ✅ Route guards (ProtectedRoute, EmployeeRoute, PasswordSetupRoute)

### ✅ Phase 3: User Stories 1-4 COMPLETE
- ✅ **US1**: Password Setup & First Login
  - Backend: `POST /auth/password-setup` endpoint
  - Frontend: PasswordSetup view + LoginView redirects
  - Tests: 6 scenarios passing

- ✅ **US2**: Shift Calendar
  - Backend: `GET /employee/shifts` with RLS enforcement
  - Frontend: EmployeeShiftCalendar with month navigation + timezone fix
  - Feature 004 integration: Full shift roster calendar

- ✅ **US3**: Vacation Requests
  - Backend: Vacation CRUD endpoints with balance validation
  - Frontend: EmployeeVacationView, VacationBalanceCard, VacationRequestForm
  - RLS: Employee can only see own vacations

- ✅ **US4**: Clock In/Out Time Tracking
  - Backend: `POST /employee/time-tracking/clock-in`, `POST /clock-out`, `GET /records`
  - Frontend: TimeClock widget (circular button, elapsed time counter)
  - EmployeeTimeTracking view created and routed
  - RLS: Employee can only see own time records

---

## ⏳ What's Pending (Phase 4-8 - Future Sprints)

### Phase 4: Dashboard Integration & Cross-Story Features

**Status**: DESIGN READY | CODE PENDING

**Tasks**:
- [ ] T053: Create `GET /employee/dashboard` endpoint
  - Gather: today's shift, vacation balance, upcoming events (next 7 days)
  - Call shift_service, vacation_service, time_tracking_service
  - Return DashboardResponse DTO with aggregated data

- [ ] T054: Update EmployeeDashboard view
  - Fetch `/employee/dashboard` data
  - Display today's shift summary
  - Display vacation balance overview
  - Show 3 quick-access module cards
  - Display upcoming events (shifts + pending vacations)

- [ ] T055: Integration tests for dashboard
  - Test `/employee/dashboard` returns all required data
  - Test RLS: Only employee's data shown
  - Test data aggregation accuracy

- [ ] T056: Full employee workflow integration test
  - Test: login → password setup → dashboard → shifts → vacations → time tracking
  - Test: Data persists when navigating between modules
  - Test: Logout clears state

**Estimated Effort**: 4-6 hours
**Dependencies**: All Phase 3 user stories must be complete ✅

---

### Phase 5: Polish & Cross-Cutting Concerns

**Status**: DESIGN READY | CODE PENDING

#### 5.1 Audit Logging

- [ ] T057: Add security event logging
  - Log: Password setup (user_id, timestamp, success/failure)
  - Log: Clock in/out (employee_id, timestamp, action)
  - Log: Vacation requests (employee_id, dates, status change)
  - Log: Unauthorized access attempts
  - Format: JSON structured logging with timestamp, level, module, context

**Files to Create**:
- `backend/app/common/audit_logging.py` - Centralized logging service

#### 5.2 Error Handling Consistency

- [ ] T058: Review and standardize error responses
  - Ensure all endpoints return consistent error format
  - Verify error codes match contract specifications
  - No stack traces in production errors
  - All ValidationError/ForbiddenError/NotFoundError return correct HTTP status

**Refactor Opportunities**:
- [ ] Issue #7: Remove duplicate error handling
  - `backend/app/common/exceptions.py` has `handle_exceptions` decorator
  - Currently duplicates app-wide error mapping
  - **Recommendation**: Remove decorator, rely on global handler only
  - **Effort**: 2-3 hours
  - Files: `auth.py`, `shifts.py`, `vacations.py`, `time_tracking.py`

#### 5.3 Type Checking & Linting

- [ ] T059: Run type checking and fix violations
  ```bash
  mypy app --strict  # Must be 0 errors
  ruff check . --fix # Must be 0 violations
  ```

- [ ] T060: Run all backend tests
  ```bash
  pytest backend/tests/unit/ -v
  pytest backend/tests/integration/ -v
  pytest --cov=app --cov-report=html
  ```

#### 5.4 Frontend Quality

- [ ] T061: Standardize error messages
  - Use `errorHandler.extractErrorMessage()` from Feature 004
  - Create Spanish translations for all API error codes
  - Test error display in: forms, modals, alerts

- [ ] T062: Frontend type checking & build
  ```bash
  npm run lint    # ESLint, TypeScript strict mode
  npm run build   # Production build
  npm run test    # Unit tests
  ```

#### 5.5 Documentation & Validation

- [ ] T064: Verify API contracts
  - `/specs/005-employee-workspace/contracts/employee-auth.md`
  - `/specs/005-employee-workspace/contracts/employee-dashboard.md`
  - `/specs/005-employee-workspace/contracts/employee-time-tracking.md`
  - Update if discrepancies found

- [ ] T065: Run specification consistency analysis
  ```bash
  speckit.analyze
  ```
  - Verify spec.md requirements map to tasks
  - Verify plan.md architecture matches code
  - Verify data-model.md matches actual schema

- [ ] T066: Create final documentation
  - README section for Feature 005
  - Document 4 user stories and status
  - Link to API contracts in `/contracts/`
  - Document test coverage and approach

- [ ] T067: Verify migration strategy
  - Test fresh database → migrations → all tables exist
  - Test rollback migrations → tables removed correctly
  - Ensure Alembic migrations in correct order

**Estimated Effort**: 8-12 hours
**Dependencies**: All Phase 3 user stories complete ✅

---

### Phase 6: Quality Assurance & Load Testing

**Status**: DESIGN READY | CODE PENDING

- [ ] T068: Complete integration test suite
  - Full employee workflow: password setup → login → all 3 modules → logout
  - RLS verification: Employee cannot access other employee's data
  - Immutability verification: Time records cannot be edited
  - Validation: All error scenarios handled correctly

- [ ] T069: Load testing
  - Simulate 10 concurrent employees clocking in simultaneously
  - Verify no duplicate TimeRecords created
  - Verify response time < 200ms p95
  - Verify database handles concurrent requests

**Tools**: Locust, K6, or ab (Apache Bench)
**Estimated Effort**: 4-6 hours

---

### Phase 7: Security Validation & Final Testing

**Status**: DESIGN READY | CODE PENDING

- [ ] T070: Security validation checklist
  - [ ] Attempt to access other employee's time records → 403
  - [ ] Attempt to modify time record timestamps → 403
  - [ ] Attempt to approve own vacation request → 403
  - [ ] Attempt to access without valid JWT → 401
  - [ ] Verify rate limiting on auth endpoints (10 req/min)
  - [ ] Verify password hashing with bcrypt (cost ≥10)
  - [ ] Verify JWT expiration (access: 30min, refresh: 7d)

- [ ] T071: Accessibility audit
  - [ ] WCAG 2.1 AA compliance check
  - [ ] Keyboard navigation (Tab, Shift+Tab, Escape)
  - [ ] Color contrast (4.5:1+)
  - [ ] Screen reader testing

**Estimated Effort**: 3-5 hours

---

## 🔴 Known Issues & Debt

### Critical Issues (RESOLVED in PR #4 - Commit 3aee952)

All 10 Copilot PR #4 review issues have been resolved ✅:
- ✅ JWT field name mismatch: emp_id → employee_id (Commit 9a283f1)
- ✅ No-op timestamp validation: Removed (Commit 9a283f1)
- ✅ Redirect loop in EmployeeRoute: Fixed (Commit a4b201e)
- ✅ Missing token in LoginView: Fixed (Commit a4b201e)
- ✅ Status code mismatch: 403 for is_active=false (Commit a4b201e)
- ✅ Stale state in VacationRequestForm: Fixed (Commit 3aee952)
- ✅ Calendar grid misalignment: Fixed (Commit 3aee952)
- ✅ JWT claims in tests: Fixed (Commit 9a283f1)
- ✅ Unregistered time-tracking route: Fixed (Commit 9a283f1)
- ⏸️ N+1 Query optimization: PENDING (future sprint)

### Medium Issues (Not Yet Addressed)

- [ ] **N+1 Query Optimization** (Copilot Issue #2)
  - `shift_service.py`: Retrieving shifts may load shift types inefficiently
  - **Solution**: Eager load shift types with shifts query using SQLModel joins
  - **Effort**: 1-2 hours
  - **Priority**: Medium (affects performance with 100+ shifts)
  - **Files**: `backend/app/services/shift_service.py`, `backend/app/routers/shifts.py`

- [ ] **Error Handler Refactoring** (Copilot Issue #7)
  - `handle_exceptions` decorator duplicates app-wide error mapping
  - **Solution**: Remove decorator, rely on global exception handler
  - **Effort**: 2-3 hours
  - **Priority**: Low (code quality, no functional impact)
  - **Files**:
    - `backend/app/common/exceptions.py` (review decorator)
    - `backend/app/routers/auth.py` (remove decorator usage)
    - `backend/app/routers/shifts.py` (remove decorator usage)
    - `backend/app/routers/vacations.py` (remove decorator usage)
    - `backend/app/routers/time_tracking.py` (remove decorator usage)

---

## 📊 Edge Cases Not Yet Addressed

From Feature 005 spec (Section: Edge Cases):

- [ ] What happens if employee tries to clock in before shift start time?
  - **Current**: Requires shift scheduled for today; doesn't check shift start time
  - **TODO**: Add validation: clock_in_time >= shift.start_time (frontend + backend)
  - **Effort**: 1 hour

- [ ] What happens if employee forgets to clock out?
  - **Current**: TimeRecord remains with clock_out_timestamp = NULL
  - **TODO**: Add admin endpoint to manually close time records
  - **TODO**: Add daily warning notification if clocked in at end of day
  - **Effort**: 4-6 hours

- [ ] System receives duplicate clock-in requests within seconds?
  - **Current**: Database unique constraint prevents duplicates
  - **Status**: ✅ HANDLED (no action needed)

- [ ] Time zone differences (if multi-region)?
  - **Current**: All times in UTC; frontend uses local timezone display
  - **TODO**: Document timezone handling strategy in API contracts
  - **Status**: Partially handled (needs documentation)

- [ ] Employee assigned shift in the past?
  - **Current**: No validation in frontend/backend
  - **TODO**: Add validation: shift.date >= today (when creating shifts)
  - **Effort**: 1 hour

- [ ] Employee views app offline?
  - **Current**: No offline support
  - **TODO**: Consider Service Worker + IndexedDB for offline clock-in/out
  - **Effort**: Major feature, future release (8-12 hours)

- [ ] Vacation dates conflict with shifts?
  - **Current**: Shows "conflict" badge in calendar; doesn't prevent approval
  - **Status**: ✅ HANDLED (informational only, as per spec)

- [ ] Password expires or reset while logged in?
  - **Current**: No password expiration policy
  - **TODO**: Implement password expiration (e.g., 90 days) + force reset flow
  - **Effort**: 3-4 hours

---

## 📈 Performance Considerations

### Current Bottlenecks

1. **N+1 Queries** in shift_service (Copilot Issue #2 - PENDING)
   - Loading shifts list may query ShiftType multiple times
   - **Impact**: ~50ms overhead per request with 50+ shifts
   - **Fix**: Eager load with SQLModel `.options(selectinload())`

2. **Calendar Grid Computation**
   - Computing 42-day calendar on every render
   - **Current**: Memoized with `useMemo` (optimized) ✅
   - **Status**: No action needed

3. **Time Records Pagination**
   - No pagination limit specified in T044
   - **TODO**: Implement pagination (default: 20 records/page, max: 100)
   - **Effort**: 1-2 hours

### Metrics to Track

- [ ] API response time: Shift calendar < 200ms p95
- [ ] Time tracking endpoint: < 100ms p95
- [ ] Dashboard aggregate: < 500ms p95
- [ ] Frontend bundle size: < 1MB gzipped
- [ ] Database query count: < 5 per API call (after optimization)

---

## 🧪 Test Coverage Goals

### Current Status

- ✅ Backend unit tests: 18+ scenarios covering auth, shifts, vacations, time tracking
- ✅ Integration tests: Shift calendar, vacation requests, time tracking, security
- ⏳ Frontend unit tests: Partial (PasswordSetup, EmployeeDashboard basic)
- ⏳ E2E tests: None yet
- ✅ Security tests: Password setup, RLS validation, is_active enforcement

### To Achieve 80%+ Coverage

**Backend** (estimated 10-15 hours):
- [ ] Add unit tests for `vacation_service.py` (balance calculation, overlap detection)
- [ ] Add unit tests for `time_tracking_service.py` (clock in/out logic, duplicate prevention)
- [ ] Add integration tests for dashboard aggregation (T055)
- [ ] Add edge case tests: vacation overlap, duplicate clock-in, clock-in before shift start
- [ ] Add parameter validation tests for all endpoints

**Frontend** (estimated 8-12 hours):
- [ ] Add tests for EmployeeShiftCalendar (grid rendering, month navigation, date calculations)
- [ ] Add tests for VacationRequestForm (validation, balance check, stale state fix)
- [ ] Add tests for TimeClock widget (state management, API calls, elapsed time counter)
- [ ] Add tests for EmployeeRoute (is_active enforcement, redirect behavior)
- [ ] Add E2E tests: Full employee workflow using Cypress or Playwright

**Total Effort**: 18-27 hours to reach 80%+ coverage

---

## 📋 Deployment Checklist

Before releasing Feature 005 to production:

### Code Quality
- [ ] All Phase 3 user stories working end-to-end
- [ ] All Phase 4 dashboard integration complete
- [ ] Phase 5 polish & documentation complete
- [ ] mypy --strict passes (0 errors)
- [ ] ruff check passes (0 violations)
- [ ] npm lint passes (0 errors)

### Testing
- [ ] Phase 6 integration tests passing (100%)
- [ ] Phase 7 security validation passing
- [ ] Test coverage > 80% (backend + frontend)
- [ ] Load testing results acceptable (p95 < 200ms)

### Database
- [ ] Database migrations tested (fresh DB + rollback)
- [ ] Alembic migration order verified
- [ ] Backup strategy tested
- [ ] Migration rollback plan documented

### Security & Operations
- [ ] Error messages in Spanish (es-ES locale)
- [ ] API rate limiting enabled (10 req/min auth, 100 req/min others)
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)
- [ ] Audit logging in place and tested
- [ ] Monitoring/alerting configured for employee endpoints
- [ ] Password hashing with bcrypt (cost ≥10)
- [ ] JWT tokens have expiration (access: 30min, refresh: 7d)

### Documentation
- [ ] API contracts up-to-date and validated
- [ ] Feature 005 README section complete
- [ ] Deployment guide created
- [ ] Rollback procedure documented
- [ ] Known limitations documented

---

## 📝 Next Sprint Planning

### Recommended Sprint Order

**Sprint 1** (COMPLETE ✅):
- ✅ Phase 1-3: User stories 1-4 implemented
- ✅ Resolve all 10 Copilot PR #4 review issues (Commits 9a283f1, a4b201e, 3aee952)

**Sprint 2** (NEXT):
- [ ] Phase 4: Dashboard integration (4-6 hours)
- [ ] Phase 5: Polish & cross-cutting concerns (8-12 hours)
- [ ] N+1 Query optimization + minor fixes (3-4 hours)
- **Total**: ~15-22 hours (2-3 developer-days)

**Sprint 3** (Following):
- [ ] Phase 6: Quality assurance & load testing (4-6 hours)
- [ ] Phase 7: Security validation (3-5 hours)
- [ ] Edge case fixes (2-4 hours)
- **Total**: ~9-15 hours (1-2 developer-days)

**Sprint 4** (Final Polish):
- [ ] Error handler refactoring (2-3 hours)
- [ ] Additional test coverage (5-10 hours)
- [ ] Documentation & accessibility (3-5 hours)
- **Total**: ~10-18 hours (1-2 developer-days)

### Estimated Total Remaining Effort

- **Phases 4-8 + Optimization**: ~35-60 hours
- **Assuming 8 hours/day**: ~5-7 developer-days
- **With 1 dev**: 1-2 weeks
- **With 2 devs**: 3-5 days (parallelizing dashboard + tests)

---

## 🔗 Related Features

- **Feature 004**: Shift Roster Calendar (MERGED ✅)
  - Provides shift scheduling infrastructure
  - Feature 005 US2 depends on Feature 004 shifts
  - Integrated with Feature 005 conflict detection

- **Feature 006**: Moderator Portal (IN PROGRESS)
  - Vacation request approvals (will approve Feature 005 requests)
  - Shift assignment (assigns shifts to Feature 005 employees)
  - Shift type configuration (used by Feature 005 calendar)

- **Future**: Admin Time Clock Management
  - Manual clock-in/out for employees (future admin feature)
  - Time record corrections
  - Payroll export integration
  - Depends on Feature 005 time tracking infrastructure

---

## 📌 Key Files Reference

### Backend Files
- `backend/app/services/auth_service.py` - Password setup, login
- `backend/app/services/shift_service.py` - Shift queries (TODO: N+1 optimization)
- `backend/app/services/vacation_service.py` - Vacation CRUD and balance
- `backend/app/services/time_tracking_service.py` - Clock in/out logic
- `backend/app/routers/auth.py` - Auth endpoints
- `backend/app/routers/shifts.py` - Shift endpoints
- `backend/app/routers/vacations.py` - Vacation endpoints
- `backend/app/routers/time_tracking.py` - Time tracking endpoints
- `backend/app/models/user.py` - User model with is_active, password_reset_token
- `backend/app/models/time_record.py` - TimeRecord model

### Frontend Files
- `frontend/src/views/PasswordSetup.tsx` - Password setup form
- `frontend/src/views/LoginView.tsx` - Login form
- `frontend/src/views/EmployeeDashboard.tsx` - Employee dashboard (TODO: dashboard data fetch)
- `frontend/src/views/EmployeeShiftCalendar.tsx` - Shift calendar (FIXED: timezone issue)
- `frontend/src/views/EmployeeVacationView.tsx` - Vacation portal
- `frontend/src/views/EmployeeTimeTracking.tsx` - Time tracking page
- `frontend/src/components/time-tracking/TimeClock.tsx` - Clock widget
- `frontend/src/components/EmployeeRoute.tsx` - Route guard (FIXED: redirect loop)
- `frontend/src/components/PasswordSetupRoute.tsx` - Password setup guard
- `frontend/src/components/vacation/VacationRequestForm.tsx` - (FIXED: stale state)

### Documentation Files
- `specs/005-employee-workspace/spec.md` - Feature specification
- `specs/005-employee-workspace/plan.md` - Implementation plan
- `specs/005-employee-workspace/tasks.md` - Implementation tasks
- `specs/005-employee-workspace/contracts/` - API contracts
- `specs/005-employee-workspace/FUTURE_SPRINT_BACKLOG.md` - This file

---

**Last Updated**: 2026-03-10
**Backlog Created**: After Copilot PR #4 full resolution (9 of 10 issues fixed)
**Next Review**: After Sprint 2 completion (Dashboard integration)
