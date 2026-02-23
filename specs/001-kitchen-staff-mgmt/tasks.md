# Tasks: Kitchen Staff Management MVP

**Input**: Design documents from `/specs/001-kitchen-staff-mgmt/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-v1.md, quickstart.md

**Tests**: Included per constitution Quality Gate 3 ("New features MUST include corresponding tests"). Unit tests for services, integration tests for endpoints.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- All file paths are relative to repository root

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Create project structure, install dependencies, configure tooling

- [X] T001 Create backend directory structure per plan.md: `backend/app/{common,models,schemas,services,routers}/`, `backend/alembic/versions/`, `backend/tests/{unit,integration}/`
- [X] T002 Create `backend/pyproject.toml` with Python 3.12, project metadata, ruff config, mypy strict mode config
- [X] T003 Create `backend/requirements.txt` with pinned versions: fastapi, uvicorn[standard], sqlmodel, alembic, psycopg2-binary, python-jose[cryptography], passlib[bcrypt], pydantic-settings, python-json-logger, slowapi, httpx (dev), pytest (dev), pytest-asyncio (dev)
- [X] T004 [P] Create frontend project with Vite: `frontend/` with React 19 + TypeScript template, install dependencies: react-router-dom, recharts, lucide-react, date-fns, react-big-calendar, @dnd-kit/core, @dnd-kit/sortable, html5-qrcode, axios
- [X] T005 [P] Create `frontend/src/types/models.ts` with all TypeScript interfaces and enums from design reference (Employee, ShiftRecord, Team, VacationRequest, VacationBalance, Role, Department, StaffStatus, MaritalStatus, Gender, VacationStatus)
- [X] T006 [P] Create `frontend/src/types/api.ts` with API response types (PaginatedResponse<T>, ErrorResponse, LoginResponse, DashboardStats) matching contracts/api-v1.md
- [X] T007 [P] Create `frontend/src/types/index.ts` re-exporting all types
- [X] T008 [P] Create `frontend/src/config/constants.ts` with API_BASE_URL (from env), ROLE_PERMISSIONS map, DEPARTMENTS array, SHIFT_TYPES, ROUTES config
- [X] T009 [P] Configure `frontend/eslint.config.js` with TypeScript strict rules
- [X] T010 [P] Create `docker-compose.yml` at repo root with services: db (PostgreSQL 16, port 5432, volume), backend (Dockerfile, port 8000), frontend (Dockerfile, port 5173)
- [X] T011 [P] Create `backend/.env.example` and `frontend/.env.example` with all environment variables from quickstart.md

**Checkpoint**: Both projects initialized, dependencies installed, tooling configured.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**CRITICAL**: No user story work can begin until this phase is complete.

### Backend Foundation

- [X] T012 Implement app settings in `backend/app/config.py` using pydantic-settings: DATABASE_URL, SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES (30), REFRESH_TOKEN_EXPIRE_DAYS (7), CORS_ORIGINS, LOG_LEVEL
- [X] T013 Implement database engine and async session factory in `backend/app/database.py` using SQLModel with PostgreSQL connection from config
- [X] T014 Initialize Alembic in `backend/alembic/` with `env.py` configured to use SQLModel.metadata and `compare_type=True`
- [X] T015 [P] Create domain exception hierarchy in `backend/app/common/exceptions.py`: base DomainException, NotFoundError, DuplicateError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError, BalanceExceededError — each with error code string
- [X] T016 [P] Create shared response/error DTOs in `backend/app/common/schemas.py`: ErrorDetail, ErrorResponse (`{error: {code, message, details}}`), PaginatedResponse[T] generic
- [X] T017 [P] Implement JWT utilities in `backend/app/common/security.py`: create_access_token(), create_refresh_token(), verify_token(), hash_password(), verify_password() using python-jose and passlib
- [X] T018 Create Tenant model in `backend/app/models/tenant.py` with fields from data-model.md: id (UUID), name, slug (unique), timezone, locale, is_active, created_at, updated_at
- [X] T019 Create `backend/app/models/__init__.py` importing all models for Alembic metadata discovery
- [X] T020 Generate and run initial Alembic migration for Tenant table: `alembic revision --autogenerate -m "create_tenant_table"` and `alembic upgrade head`
- [X] T021 Create seed script in `backend/app/seed.py` that creates default ILPI tenant (name="ILPI", slug="ilpi", timezone="Europe/Madrid", locale="es")
- [X] T022 Implement FastAPI app factory in `backend/app/main.py`: create_app() with CORS middleware (origins from config, no wildcard), security headers middleware, rate limiting (slowapi), global exception handler mapping DomainExceptions to HTTP responses, structured JSON logging setup, router inclusion with `/api/v1` prefix
- [X] T023 Implement FastAPI dependencies in `backend/app/dependencies.py`: get_db() session dependency, get_current_user() JWT extraction from Bearer header, get_current_tenant() tenant_id from JWT, require_role() role-checking dependency factory
- [X] T023b [P] Create test infrastructure in `backend/tests/conftest.py`: test PostgreSQL database fixture (SQLite in-memory or test DB), async session factory, test client (httpx.AsyncClient), auth helper fixtures (create_test_user, get_auth_headers for each role: admin, moderador, empleado), test tenant fixture

### Frontend Foundation

- [X] T024 [P] Implement API client in `frontend/src/services/apiClient.ts`: axios instance with baseURL from env, JWT interceptor that attaches Bearer token from memory, response interceptor for 401 → silent refresh attempt, typed request/response helpers
- [X] T025 [P] Implement AuthContext in `frontend/src/context/AuthContext.tsx`: AuthProvider with state (user, accessToken, isAuthenticated), login() calls /auth/login and stores token in memory + refresh in cookie, logout() calls /auth/logout, hasRole() check, silent refresh on mount
- [X] T026 [P] Implement useAuth hook in `frontend/src/hooks/useAuth.ts` consuming AuthContext
- [X] T027 [P] Implement useApi hook in `frontend/src/hooks/useApi.ts`: generic wrapper with loading, error, data states for API calls
- [X] T028 Implement Layout component in `frontend/src/components/Layout.tsx` from design reference: sidebar with navigation items filtered by role (Admin sees all 7, Moderador hides Configuración, Empleado sees only profile/shifts/vacations), header with user info, "Cerrar Sesión" button calling logout(), responsive mobile sidebar
- [X] T029 [P] Implement reusable components from design reference in `frontend/src/components/`: StatCard.tsx, StatusBadge.tsx (color-coded by status), SearchFilter.tsx (search input + department dropdown), ConfirmDialog.tsx (modal confirmation), FormField.tsx (labeled input)
- [X] T030 Implement ProtectedRoute component in `frontend/src/components/ProtectedRoute.tsx`: checks isAuthenticated (redirect to /login if not), checks role against allowed roles (redirect to /dashboard if forbidden)
- [X] T031 Implement routing in `frontend/src/App.tsx` with react-router-dom: /login (public), /dashboard, /employees, /teams, /attendance, /vacations, /reports, /settings (all protected with role guards per spec)
- [X] T032 Implement entry point in `frontend/src/main.tsx`: BrowserRouter, AuthProvider wrapping App

**Checkpoint**: Foundation ready — database configured, auth framework in place, frontend shell with routing and layout. User story implementation can now begin.

---

## Phase 3: User Story 1 — User Authentication & Role-Based Access (Priority: P1)

**Goal**: Users can log in with credentials, see role-filtered navigation, and log out. Admin sees all sections, Moderador sees all except Configuración, Empleado sees only own profile/shifts/vacations.

**Independent Test**: Log in with each role (admin, moderador, empleado) and verify navigation options and accessible data match the role's permissions. Verify invalid credentials show generic error. Verify logout redirects to login.

### Implementation for User Story 1

- [X] T033 [P] [US1] Create User model in `backend/app/models/user.py` with fields from data-model.md: id (UUID), tenant_id (FK→Tenant), email, hashed_password, role (Role enum), employee_id (FK→Employee, nullable, unique), is_active, created_at, updated_at. Unique constraint: (tenant_id, email)
- [X] T034 [P] [US1] Create auth Pydantic DTOs in `backend/app/schemas/auth.py`: LoginRequest (email, password), LoginResponse (access_token, token_type, user), TokenPayload (sub, tenant_id, role, exp, iat), UserResponse (id, email, role, tenant_id, employee_id)
- [X] T035 [US1] Generate Alembic migration for User table and run it
- [X] T036 [US1] Update seed script `backend/app/seed.py` to create default admin user (email: admin@ilpi.es, password: Admin123!, role: Admin) linked to ILPI tenant
- [X] T037 [US1] Implement AuthService in `backend/app/services/auth_service.py`: login(email, password, tenant_id) → validates credentials, returns access+refresh tokens; refresh(refresh_token) → validates and returns new access token; logout(refresh_token) → blacklists token. Service-level password verification and role validation
- [X] T038 [US1] Implement auth router in `backend/app/routers/auth.py`: POST /auth/login, POST /auth/refresh (reads HttpOnly cookie), POST /auth/logout. Set refresh token as HttpOnly secure cookie on login. Rate limit: 10 req/min on login
- [X] T039 [US1] Implement auth API service in `frontend/src/services/authService.ts`: login(email, password), refresh(), logout() calling backend endpoints per contract
- [X] T040 [US1] Implement LoginView in `frontend/src/views/LoginView.tsx`: email + password form, submit calls authService.login(), on success redirect to /dashboard, on error show generic "Credenciales inválidas" message (no email/password hint per spec). Spanish UI labels
- [X] T041 [US1] Wire Layout sidebar navigation filtering in `frontend/src/components/Layout.tsx`: use useAuth().user.role to filter nav items per spec (Admin: all 7 items, Moderador: exclude Configuración, Empleado: only Mi Perfil, Mis Turnos, Mis Vacaciones)
- [X] T041b [US1] Implement unit tests for AuthService in `backend/tests/unit/test_auth_service.py`: test login with valid/invalid credentials, token generation, refresh token validation, logout token blacklisting, password verification
- [X] T041c [US1] Implement integration tests for auth endpoints in `backend/tests/integration/test_auth_endpoints.py`: test complete login flow, token refresh, logout, session management, rate limiting on login endpoint

**Checkpoint**: Authentication fully functional. Three roles can log in, see appropriate navigation, and log out. Invalid credentials are rejected with generic error. Auth flows covered by unit and integration tests.

---

## Phase 4: User Story 2 — Employee Management (Priority: P2)

**Goal**: Admins can create, search, filter, edit, and soft-delete employees. Employee cards show status badges. Moderators can view and edit but not delete. DNI and email are unique per tenant.

**Independent Test**: Create an employee, verify it appears in the card grid. Search by DNI, filter by department, edit department field. Delete the employee and verify it disappears from active list (soft delete). Attempt duplicate DNI — verify rejection.

### Implementation for User Story 2

- [X] T042 [P] [US2] Create Employee model in `backend/app/models/employee.py` with all fields from data-model.md: id, tenant_id (FK), first_name, last_name, email, phone, dni, address, birth_date, marital_status, gender, role, department, status (default Activo), hire_date, profile_image, emergency_contact, is_active (default True), team_id (FK→Team, nullable), created_at, updated_at. Unique constraints: (tenant_id, dni), (tenant_id, email). Indexes per data-model.md
- [X] T043 [P] [US2] Create employee Pydantic DTOs in `backend/app/schemas/employee.py`: EmployeeCreate (all required fields from contract POST), EmployeeUpdate (all optional), EmployeeResponse (full shape from contract GET), EmployeeListResponse (paginated). Validate DNI format, email format, phone format
- [X] T044 [US2] Generate Alembic migration for Employee table and run it
- [X] T045 [US2] Update seed script to create seed employee (Juan García, admin@ilpi.es, DNI: 12345678A, Dirección, Activo) and link to admin User via employee_id
- [X] T046 [US2] Implement EmployeeService in `backend/app/services/employee_service.py`: create(data, tenant_id) with DNI/email uniqueness check, list(tenant_id, search?, department?, include_inactive?, page, size) with pagination, get_by_id(id, tenant_id), update(id, data, tenant_id) with uniqueness re-check, soft_delete(id, tenant_id) setting is_active=False + status=Inactivo + auto-reject pending vacations. All queries filtered by tenant_id. Role checks: only Admin can delete
- [X] T047 [US2] Implement employees router in `backend/app/routers/employees.py`: GET /employees (list with search/filter/pagination), POST /employees (Admin only), GET /employees/{id}, PUT /employees/{id} (Admin+Mod), DELETE /employees/{id} (Admin only). Empleado role: GET own profile only via /employees/me endpoint
- [X] T047b [P] [US2] Create user management Pydantic DTOs in `backend/app/schemas/user.py`: UserCreate (email, password, role, employee_id?), UserUpdate (role?, password?, employee_id?, is_active?), UserListResponse (paginated). Password strength validation (min 8 chars, mixed case, digit)
- [X] T047c [US2] Implement UserService in `backend/app/services/user_service.py`: create_user(data, tenant_id) with email uniqueness check per tenant, hash password, link to employee if provided. list_users(tenant_id, role_filter?, page, size). update_user(id, data, tenant_id). deactivate_user(id, tenant_id). Admin-only access enforced at service layer
- [X] T047d [US2] Implement users router in `backend/app/routers/users.py`: GET /users (Admin only, list with role filter), POST /users (Admin only, create user account), PUT /users/{id} (Admin only), DELETE /users/{id} (Admin only, soft deactivate). Per contracts/api-v1.md Users section
- [X] T048 [P] [US2] Implement employee API service in `frontend/src/services/employeeService.ts`: getEmployees(params), createEmployee(data), getEmployee(id), updateEmployee(id, data), deleteEmployee(id) calling backend per contract
- [X] T049 [US2] Implement EmployeeListView in `frontend/src/views/EmployeeListView.tsx` from design reference: card grid displaying employees with status badges (color-coded), search bar (name/DNI), department filter dropdown, "Nuevo Empleado" button (Admin only). Each card shows photo placeholder, name, department, status badge, edit/delete icons (delete only for Admin, hidden for Moderador per spec)
- [X] T050 [US2] Implement employee create/edit modal in `frontend/src/views/EmployeeListView.tsx`: 2-column form with all fields from spec (personal info: name, email, phone, DNI, birth date, address, gender, marital status; company data: department, role, status, hire date, emergency contact, profile image URL). Form validation matching backend DTOs. On submit: call create or update API, refresh list. Show duplicate DNI/email errors inline
- [X] T050b [US2] Implement unit tests for EmployeeService in `backend/tests/unit/test_employee_service.py`: test create with DNI/email uniqueness validation, list with search/filter/pagination, soft delete with pending vacation auto-rejection, role-based access checks
- [X] T050c [US2] Implement integration tests for employee endpoints in `backend/tests/integration/test_employee_endpoints.py`: test full employee CRUD flow, duplicate DNI/email rejection, soft delete and archive, search/filter functionality, tenant isolation, role-based access (Admin full, Mod no-delete, Empleado own-profile only)

**Checkpoint**: Full employee CRUD functional. Search by name/DNI, filter by department, soft delete. Uniqueness enforced. Role-based access (Admin full, Mod no-delete, Empleado own-profile). POST /users endpoint allows admin employee registration. All flows tested with unit and integration tests.

---

## Phase 5: User Story 3 — Vacation & Leave Management (Priority: P3)

**Goal**: Employees submit vacation requests with date range. System validates calendar-day balance. Admins/Mods approve or reject. Status badges on cards. Balance tracking per year. Employees can cancel own pending requests. Optimistic concurrency on approval.

**Independent Test**: Set employee to 30 annual days. Submit 10-day request (succeeds as Pendiente). Approve it (balance = 20). Submit 25-day request (rejected: "Saldo insuficiente. Días disponibles: 20"). Cancel a pending request (no balance change). Concurrent approval test: approve same request from two sessions (second fails with conflict).

### Implementation for User Story 3

- [X] T051 [P] [US3] Create VacationRequest model in `backend/app/models/vacation_request.py` with fields from data-model.md: id, tenant_id, employee_id (FK), start_date, end_date, requested_days, status (VacationStatus enum, default PENDIENTE), reviewed_by (FK→User, nullable), reviewed_at, version (default 1), created_at, updated_at
- [X] T052 [P] [US3] Create VacationBalance model in `backend/app/models/vacation_balance.py` with fields: id, tenant_id, employee_id (FK), year, total_days (default 30), used_days (default 0), created_at, updated_at. Unique constraint: (tenant_id, employee_id, year)
- [X] T053 [P] [US3] Create vacation Pydantic DTOs in `backend/app/schemas/vacation.py`: VacationRequestCreate (employee_id, start_date, end_date), VacationActionRequest (version for optimistic concurrency), VacationRequestResponse (all fields + computed employee_name, employee_image, employee_department from join), VacationBalanceResponse (employee_id, year, total_days, used_days, remaining_days), VacationListResponse (paginated). Validate start_date <= end_date, start_date >= today
- [X] T054 [US3] Generate Alembic migration for VacationRequest + VacationBalance tables and run it
- [X] T055 [US3] Implement VacationService in `backend/app/services/vacation_service.py`: create_request(employee_id, start_date, end_date, tenant_id) → compute requested_days = (end-start).days+1, get/create balance for year, validate remaining >= requested, reject if insufficient with BalanceExceededError("Saldo insuficiente. Días disponibles: {remaining}"). approve(id, version, reviewer_user_id, tenant_id) → check version match (ConflictError if mismatch), set status=Aprobado, increment used_days, increment version. reject(id, version, reviewer_user_id, tenant_id) → check version, set Rechazado, restore used_days if was Aprobado, increment version. cancel(id, version, employee_id, tenant_id) → only if Pendiente and own request. get_balance(employee_id, year, tenant_id). list_requests(tenant_id, filters, pagination)
- [X] T056 [US3] Implement vacations router in `backend/app/routers/vacations.py`: GET /vacations (Admin/Mod: all, Empleado: own), POST /vacations, PUT /vacations/{id}/approve (Admin/Mod), PUT /vacations/{id}/reject (Admin/Mod), PUT /vacations/{id}/cancel (own pending only + Admin/Mod), GET /vacations/balance/{employee_id}
- [X] T057 [P] [US3] Implement vacation API service in `frontend/src/services/vacationService.ts`: getVacations(params), createVacation(data), approveVacation(id, version), rejectVacation(id, version), cancelVacation(id, version), getBalance(employeeId, year) per contract
- [X] T058 [US3] Implement VacationView "Solicitudes" tab in `frontend/src/views/VacationView.tsx` from design reference: card grid showing requests with employee photo, name, department, date range, requested days, status badge (Pendiente=yellow, Aprobado=green, Rechazado=red, Cancelado=gray). Admin/Mod: approve/reject buttons on Pendiente cards. Employee: cancel button on own Pendiente cards. "Nueva Solicitud" button opens form with date range picker, shows computed days and remaining balance in real time
- [X] T058b [US3] Implement unit tests for VacationService in `backend/tests/unit/test_vacation_service.py`: test create_request with valid/invalid dates, balance validation, insufficient balance rejection, approve/reject with version checking, cancel on pending-only, correct balance deduction
- [X] T058c [US3] Implement integration tests for vacation endpoints in `backend/tests/integration/test_vacation_endpoints.py`: test full vacation request flow (create → approve → verify balance), concurrent approval conflicts (optimistic concurrency), tenant isolation, role-based access control (Admin/Mod approve, Empleado own requests only)

**Checkpoint**: Vacation management fully functional. Balance validation, calendar-day counting, approve/reject/cancel flows, optimistic concurrency. All flows tested with unit and integration tests.

---

## Phase 6: User Story 4 — Shift Rostering & Task Assignment (Priority: P4)

**Goal**: Admins create teams per department with shift types. Employees assigned to teams via drag-and-drop. Clock-in/clock-out records timestamps and optional GPS. Shift history table with badges. Task labels assignable to shifts. Prevent duplicate active shifts and assignment of employees on vacation.

**Independent Test**: Create a team in Cocina (Mañana 09:00-17:00). Assign two employees. Have one clock in — verify record appears. Clock out — verify exit time shown. Attempt double clock-in — verify rejection. Assign task label "Parrilla" to a shift.

### Implementation for User Story 4

- [X] T060 [P] [US4] Create Team model in `backend/app/models/team.py` with fields: id, tenant_id (FK), name, department (enum), shift_type, shift_start (time), shift_end (time), is_active (default True), created_at, updated_at. Unique constraint: (tenant_id, name, department)
- [X] T061 [P] [US4] Create ShiftRecord model in `backend/app/models/shift_record.py` with fields: id, tenant_id (FK), employee_id (FK), date, entry_time (datetime), exit_time (datetime, nullable), location_lat (float, nullable), location_lng (float, nullable), task_label (str, nullable), created_at, updated_at. Indexes per data-model.md
- [X] T062 [P] [US4] Create team Pydantic DTOs in `backend/app/schemas/team.py`: TeamCreate (name, department, shift_type, shift_start, shift_end), TeamUpdate, TeamResponse (with members list: id, first_name, last_name, profile_image), TeamMemberAdd (employee_id)
- [X] T063 [P] [US4] Create shift Pydantic DTOs in `backend/app/schemas/shift.py`: ClockInRequest (employee_id, location_lat?, location_lng?, task_label?), ClockOutRequest (location_lat?, location_lng?), ShiftRecordResponse (all fields + employee_name, employee_image from join), ShiftListResponse (paginated)
- [X] T064 [US4] Generate Alembic migration for Team + ShiftRecord tables and run it
- [X] T065 [US4] Implement TeamService in `backend/app/services/team_service.py`: create(data, tenant_id), list(tenant_id, department?), get_by_id(id, tenant_id) with members, update(id, data, tenant_id), delete(id, tenant_id), add_member(team_id, employee_id, tenant_id) → check employee not on vacation (EMPLOYEE_ON_VACATION error), remove_member(team_id, employee_id, tenant_id). Update Employee.team_id on add/remove
- [X] T066 [US4] Implement ShiftService in `backend/app/services/shift_service.py`: clock_in(employee_id, location?, task_label?, tenant_id) → check no active shift exists (ACTIVE_SHIFT_EXISTS error), create record with entry_time=now. clock_out(shift_id, location?, tenant_id) → set exit_time=now, validate shift belongs to employee. list(tenant_id, employee_id?, date_from?, date_to?, page, size)
- [X] T067 [US4] Implement teams router in `backend/app/routers/teams.py`: GET /teams (Admin/Mod), POST /teams (Admin/Mod), PUT /teams/{id}, DELETE /teams/{id} (Admin), POST /teams/{id}/members (Admin/Mod), DELETE /teams/{id}/members/{employee_id}
- [X] T068 [US4] Implement shifts router in `backend/app/routers/shifts.py`: GET /shifts (Admin/Mod all, Empleado own), POST /shifts/clock-in, POST /shifts/{id}/clock-out
- [X] T069 [P] [US4] Implement team API service in `frontend/src/services/teamService.ts`: getTeams(params), createTeam(data), updateTeam(id, data), deleteTeam(id), addMember(teamId, employeeId), removeMember(teamId, employeeId) per contract
- [X] T070 [P] [US4] Implement shift API service in `frontend/src/services/shiftService.ts`: getShifts(params), clockIn(data), clockOut(id, data) per contract
- [X] T071 [US4] Implement RotaryView in `frontend/src/views/RotaryView.tsx` from design reference: department tab selector (Cocina, Atención al Público, Barra, Dirección), Team A (Mañana) and Team B (Tarde/Noche) sections showing member chips with avatar, @dnd-kit drag-and-drop for moving employees from available pool (right panel) to team slots. Create/edit team functionality
- [X] T072 [US4] Implement AttendanceView in `frontend/src/views/AttendanceView.tsx` from design reference: hero banner with simulated QR scanner (employee dropdown selector + "Confirmar Fichaje" button for MVP), shift history table with columns: employee photo, name, date, entry time (green badge), exit time (orange badge or "En turno..."), "Ver GPS" link. Clock-in creates record, clock-out updates it
- [X] T072b [US4] Implement unit tests for TeamService and ShiftService in `backend/tests/unit/test_team_service.py` and `backend/tests/unit/test_shift_service.py`: test team creation/member management, vacation conflict detection on member add, shift clock-in/out, duplicate active shift prevention, task label assignment
- [X] T072c [US4] Implement integration tests for team and shift endpoints in `backend/tests/integration/test_team_endpoints.py` and `backend/tests/integration/test_shift_endpoints.py`: test complete shift workflow (clock-in → work → clock-out), team management with drag-and-drop simulation, vacation conflict blocking, role-based access (Admin/Mod manage, Empleado clock-in/out own shifts), tenant isolation

**Checkpoint**: Full shift rostering. Teams created per department, employees assigned via drag-drop, clock-in/out with history, task labels, duplicate shift prevention, vacation conflict detection. All flows tested with unit and integration tests.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Dashboard, reports, settings, and improvements across all stories

- [X] T073 [P] Implement DashboardService in `backend/app/services/dashboard_service.py`: get_stats(tenant_id) → aggregate total_employees (active), on_shift (active shifts), on_vacation (approved current vacations), pending_requests count
- [X] T074 [P] Implement dashboard router in `backend/app/routers/dashboard.py`: GET /dashboard/stats (Admin/Mod)
- [X] T075 [P] Implement reports endpoints in `backend/app/routers/dashboard.py` (or separate reports router): GET /reports/hours-by-day (aggregate shift hours by weekday), GET /reports/department-distribution (employee count by department)
- [X] T076 [P] Implement dashboard API service in `frontend/src/services/dashboardService.ts`: getStats(), getHoursByDay(params), getDepartmentDistribution()
- [X] T077 Implement DashboardView in `frontend/src/views/DashboardView.tsx` from design reference: 4 StatCards (Total Staff, On Shift, On Vacation, Pending Requests), today's shifts list (right panel). Wire to dashboard API
- [X] T078 Implement ReportsView in `frontend/src/views/ReportsView.tsx` from design reference: Recharts LineChart (hours by day of week), BarChart (department distribution), "Top Monthly Hours" table. Wire to reports API. Export PDF/Excel button as disabled placeholder ("Próximamente")
- [X] T079 [P] Implement SettingsView in `frontend/src/views/SettingsView.tsx` from design reference: database info panel (server version, last sync), security & roles panel (display RBAC info). Admin-only access
- [X] T080 Add audit logging middleware in `backend/app/main.py`: log security-relevant events (login, access denied, employee create/update/delete, vacation approve/reject) with structured JSON format including timestamp, actor, action, target resource per constitution Security Requirements
- [X] T081 Add security headers middleware verification in `backend/app/main.py`: ensure all responses include X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, Content-Security-Policy, Referrer-Policy per contract
- [X] T082 Validate complete flow using `specs/001-kitchen-staff-mgmt/quickstart.md`: verify all 6 verification steps pass end-to-end (login, seed employee visible, create employee, submit vacation, clock-in)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 Auth (Phase 3)**: Depends on Foundational (Phase 2) — BLOCKS US2, US3, US4 (all need auth)
- **US2 Employees (Phase 4)**: Depends on US1 (needs authenticated users). No dependency on US3/US4
- **US3 Vacations (Phase 5)**: Depends on US2 (needs Employee records). Independent of US4
- **US4 Shifts (Phase 6)**: Depends on US2 (needs Employee records). Independent of US3
- **Polish (Phase 7)**: Depends on US2 + US3 + US4 (aggregates data from all)

### User Story Dependencies

```text
Phase 1: Setup
    ↓
Phase 2: Foundational
    ↓
Phase 3: US1 - Auth & RBAC (P1)
    ↓
Phase 4: US2 - Employee Management (P2)
    ↓ ↘
Phase 5: US3 - Vacations (P3)    Phase 6: US4 - Shifts (P4)
    ↓                                  ↓
    └──────── Phase 7: Polish ─────────┘
```

Note: US3 and US4 can run in **parallel** after US2 completes.

### Within Each User Story

1. Models (can be parallel within story) → DTOs (parallel)
2. Alembic migration (depends on models)
3. Service layer (depends on models + DTOs)
4. Router/API (depends on service)
5. Frontend service (parallel with backend router)
6. Frontend views (depends on frontend service + backend router)

### Parallel Opportunities

**Phase 1**: T004-T011 all parallel (independent files)
**Phase 2**: T015-T017 parallel (backend common/), T024-T027 + T029 parallel (frontend)
**Phase 3**: T033-T034 parallel (model + DTOs), T039-T041 parallel with T037-T038 (frontend while backend)
**Phase 4**: T042-T043 parallel (model + DTOs), T048 parallel with T047 (frontend service while backend router)
**Phase 5**: T051-T053 all parallel (3 files), T057 parallel with T056 (frontend while backend)
**Phase 6**: T060-T063 all parallel (4 files), T069-T070 parallel with T067-T068 (frontend while backend)
**Phase 7**: T073-T076 + T079 all parallel (independent files)

---

## Parallel Example: User Story 2 (Employee Management)

```text
# Step 1 — Launch models + DTOs in parallel:
Task T042: "Create Employee model in backend/app/models/employee.py"
Task T043: "Create employee DTOs in backend/app/schemas/employee.py"

# Step 2 — After T042+T043, migration:
Task T044: "Generate Alembic migration for Employee table"

# Step 3 — After T044, seed + service:
Task T045: "Update seed script with employee data"
Task T046: "Implement EmployeeService in backend/app/services/employee_service.py"

# Step 4 — After T046, router + frontend service in parallel:
Task T047: "Implement employees router in backend/app/routers/employees.py"
Task T048: "Implement employee API service in frontend/src/services/employeeService.ts"

# Step 5 — After T047+T048, frontend views:
Task T049: "Implement EmployeeListView"
Task T050: "Implement employee create/edit modal"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 — Auth & RBAC
4. **STOP and VALIDATE**: Log in with admin, moderador, empleado roles. Verify navigation filtering. Verify logout.
5. Deploy/demo if ready — auth is the foundation.

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Auth) → Test → Deploy (Auth MVP!)
3. Add US2 (Employees) → Test → Deploy (Staff directory)
4. Add US3 (Vacations) → Test → Deploy (Leave management)
5. Add US4 (Shifts) → Test → Deploy (Full rostering)
6. Add Polish → Test → Deploy (Dashboard + Reports)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

After US1 (Auth) + US2 (Employees) are complete:
- **Developer A**: US3 — Vacation Management
- **Developer B**: US4 — Shift Rostering
- Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps each task to its user story for traceability
- Each user story is independently completable and testable at its checkpoint
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- All backend routes prefixed with `/api/v1`
- All queries MUST filter by `tenant_id` from JWT — never trust client-provided tenant
- Frontend design reference: `C:\Users\Fede\ILPI\diseño\` (views, components, types)
