# Tasks: Shift Schedule Configuration & Auto Calculation

**Feature**: `002-shift-schedules` | **Branch**: `002-shift-schedules`
**Input**: Design documents from `/specs/002-shift-schedules/` (spec.md, plan.md, data-model.md, contracts/, research.md, quickstart.md)
**Status**: Phase 1 Setup

**Tests**: Tasks are organized for TDD approach (tests written FIRST, marked [P] for parallelization within user story)

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story. All 3 user stories are P1 (MVP).

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no cross-file dependencies)
- **[Story]**: Which user story (US1, US2, US3) or SETUP/FOUNDATIONAL
- **File paths**: Exact locations in backend/ or frontend/

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and code generation scaffolding

- [ ] T001 Create ShiftType model file `backend/app/models/shift_type.py` with SQLModel, JSON time_windows, calculated total_hours property
- [ ] T002 [P] Create Pydantic schemas in `backend/app/schemas/shift_type.py` (ShiftTypeCreate, ShiftTypeUpdate, ShiftTypeResponse, TimeWindow)
- [ ] T003 [P] Add ShiftTypeEnum to `backend/app/common/enums.py` (MAÑANA, NOCHE, CORTADO, CORRIDO)
- [ ] T004 [P] Add custom exceptions to `backend/app/common/exceptions.py` (ShiftTypeInUseError, InvalidShiftTypeError)
- [ ] T005 Update `backend/app/models/__init__.py` to export ShiftType for Alembic metadata discovery

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before any user story work

**⚠️ CRITICAL**: No user story can proceed until ALL foundational tasks are complete

- [ ] T006 Create Alembic migration `backend/alembic/versions/[VERSION]_add_shift_types_table.py` with shift_type table, indices, constraints
- [ ] T007 [P] Implement shift_type_service functions in `backend/app/services/shift_type_service.py`: create, list, get, delete (soft), with validation
- [ ] T008 [P] Create shift_types router in `backend/app/routers/shift_types.py` with GET/POST/PUT/DELETE endpoints (RBAC checks)
- [ ] T009 [P] Update `backend/app/main.py` to include shift_types router
- [ ] T010 [P] Seed default shift types in `backend/app/seed.py` (Mañana, Noche, Cortado, Corrido with correct time_windows)
- [ ] T011 Run `alembic upgrade head` to verify migration applies cleanly

**Checkpoint**: Foundation ready - user story implementation can proceed in parallel

---

## Phase 3: User Story 1 - Admin Configures Predefined Shift Types (Priority: P1) 🎯 MVP

**Goal**: Admins can create, read, update, delete shift type configurations with validation

**Independent Test**: Admin navigates to shift configuration, creates 4 standard shift types (Mañana single-window, Cortado split-window, Noche dynamic-close, Corrido dynamic-close), verifies they're persisted and retrievable

### Tests for User Story 1 ⚠️

- [ ] T012 [P] [US1] Contract test for POST /shift-types endpoint in `backend/tests/test_shift_types_contract.py`
- [ ] T013 [P] [US1] Contract test for GET /shift-types (paginated) in `backend/tests/test_shift_types_contract.py`
- [ ] T014 [P] [US1] Contract test for GET /shift-types/{id} in `backend/tests/test_shift_types_contract.py`
- [ ] T015 [P] [US1] Contract test for PUT /shift-types/{id} in `backend/tests/test_shift_types_contract.py`
- [ ] T016 [P] [US1] Contract test for DELETE /shift-types/{id} with safety checks in `backend/tests/test_shift_types_contract.py`
- [ ] T017 [P] [US1] Unit test for ShiftType.total_hours calculation (single-window, split-window, midnight span) in `backend/tests/test_shift_type_model.py`
- [ ] T018 [P] [US1] Integration test for creating Cortado split shift with 2 time windows in `backend/tests/test_shift_types_integration.py`

### Implementation for User Story 1

- [ ] T019 [US1] Validate time_window format in ShiftTypeCreate (HH:MM, 00:00-23:59) in `backend/app/schemas/shift_type.py`
- [ ] T020 [US1] Validate expected_hours matches calculated total_hours (±0.01 tolerance) in `backend/app/services/shift_type_service.py`
- [ ] T021 [US1] Validate windows are chronologically ordered (earliest first) in `backend/app/services/shift_type_service.py`
- [ ] T022 [US1] Enforce unique (tenant_id, name) constraint with clear error message in `backend/app/services/shift_type_service.py`
- [ ] T023 [US1] Add RBAC check (Admin/Moderador only) to shift type creation/update in `backend/app/routers/shift_types.py`
- [ ] T024 [US1] Add RBAC check (Admin only) to shift type deletion in `backend/app/routers/shift_types.py`
- [ ] T025 [US1] Add structured JSON logging for shift type CRUD operations in `backend/app/services/shift_type_service.py`
- [ ] T026 [US1] Test manually: Create Mañana (10:30-18:00, 7.5 hrs), verify in API response

**Checkpoint**: User Story 1 complete — Admins can fully manage shift type configurations

---

## Phase 4: User Story 2 - System Automatically Calculates Total Hours (Priority: P1) 🎯 MVP

**Goal**: Shift types automatically calculate total hours for single-window, split-window, and dynamic-close shifts

**Independent Test**: Create Cortado shift type with 2 windows (12:30-16:30, 18:30-22:30), verify API returns total_hours=8.0; Create Noche with uses_dynamic_close=true and expected_hours=7.7, verify API returns 7.7

### Tests for User Story 2 ⚠️

- [ ] T027 [P] [US2] Unit test: Single-window shift total_hours (Mañana 10:30-18:00 = 7.5) in `backend/tests/test_shift_type_model.py`
- [ ] T028 [P] [US2] Unit test: Split-window shift total_hours (Cortado 12:30-16:30 + 18:30-22:30 = 8.0) in `backend/tests/test_shift_type_model.py`
- [ ] T029 [P] [US2] Unit test: Midnight-spanning shift total_hours (23:00 to 06:00 = 7.0) in `backend/tests/test_shift_type_model.py`
- [ ] T030 [P] [US2] Integration test: GET /shift-types/{id} returns total_hours field in `backend/tests/test_shift_types_integration.py`
- [ ] T031 [P] [US2] Integration test: Cortado split shift displays correct 8.0 hours in `backend/tests/test_shift_types_integration.py`

### Implementation for User Story 2

- [ ] T032 [US2] Implement total_hours property on ShiftType model (sums all time_windows, handles midnight spans) in `backend/app/models/shift_type.py`
- [ ] T033 [US2] Include total_hours in ShiftTypeResponse Pydantic schema in `backend/app/schemas/shift_type.py`
- [ ] T034 [US2] Verify total_hours is returned in all GET endpoints (/shift-types, /shift-types/{id}) in `backend/app/routers/shift_types.py`
- [ ] T035 [US2] Test manually: Create Noche (17:00 to 23:59, 7.7 hrs), verify API returns expected_hours=7.7
- [ ] T036 [US2] Test manually: Update Mañana end time, verify total_hours recalculates immediately

**Checkpoint**: User Story 2 complete — System calculates hours for all shift types automatically

---

## Phase 5: User Story 3 - Team CRUD Integration with Shift Types (Priority: P1) 🎯 MVP

**Goal**: Teams reference ShiftType instead of storing raw times; Team responses include full shift details and calculated total_hours

**Independent Test**: Create team with shift_type="Cortado", verify response includes time_windows array and total_hours=8.0; Attempt to create team with invalid shift_type, verify validation error

### Tests for User Story 3 ⚠️

- [ ] T037 [P] [US3] Contract test for POST /teams with shift_type in `backend/tests/test_teams_contract.py`
- [ ] T037b [P] [US3] Contract test for GET /teams returns shift details in `backend/tests/test_teams_contract.py`
- [ ] T037c [P] [US3] Contract test for PUT /teams/{id} with shift_type change in `backend/tests/test_teams_contract.py`
- [ ] T038 [P] [US3] Integration test: Create team with Cortado shift, verify response includes time_windows + total_hours in `backend/tests/test_teams_integration.py`
- [ ] T039 [P] [US3] Integration test: Reject team creation with invalid shift_type in `backend/tests/test_teams_integration.py`

### Implementation for User Story 3

- [ ] T040 [US3] Update Team model in `backend/app/models/team.py`: Add shift_type_id FK, remove shift_start/shift_end columns
- [ ] T041 [US3] Create Team.total_hours property (returns shift_type.expected_hours) in `backend/app/models/team.py`
- [ ] T042 [US3] Update TeamCreate schema in `backend/app/schemas/team.py` to accept shift_type (enum or UUID)
- [ ] T043 [US3] Update TeamUpdate schema in `backend/app/schemas/team.py` to support shift_type changes
- [ ] T044 [US3] Update TeamResponse schema to include shift_type, time_windows, total_hours, expected_hours, uses_dynamic_close in `backend/app/schemas/team.py`
- [ ] T045 [US3] Enhance team_service.create() to validate shift_type reference exists in `backend/app/services/team_service.py`
- [ ] T046 [US3] Enhance team_service.update() to validate shift_type reference on changes in `backend/app/services/team_service.py`
- [ ] T047 [US3] Update POST /teams endpoint to include shift details in response in `backend/app/routers/teams.py`
- [ ] T048 [US3] Update GET /teams endpoint to include shift details in response in `backend/app/routers/teams.py`
- [ ] T049 [US3] Update GET /teams/{id} endpoint to include shift details in response in `backend/app/routers/teams.py`
- [ ] T050 [US3] Update PUT /teams/{id} endpoint to allow shift_type changes in `backend/app/routers/teams.py`
- [ ] T051 [US3] Add validation: Reject team creation if shift_type doesn't exist or is inactive in `backend/app/services/team_service.py`
- [ ] T052 [US3] Test manually: Create team with Mañana, verify response shows 7.5 hours
- [ ] T053 [US3] Test manually: Try creating team with invalid shift_type, verify error message lists valid options

**Checkpoint**: User Story 3 complete — Teams now use ShiftType references with automatic hour calculation

---

## Phase 6: Frontend Implementation

**Purpose**: Implement admin UI for shift type configuration and team viewing

- [ ] T054 [P] Create ShiftTypeForm component in `frontend/src/components/ShiftTypeForm.tsx` with:
  - Form fields: name, type enum, time_windows array, uses_dynamic_close checkbox, expected_hours, description
  - Support for adding/removing time windows (especially 2nd window for Cortado)
  - Real-time total_hours display from time_windows
  - Form validation (HH:MM format, window ordering, expected_hours match)

- [ ] T055 [P] Create ShiftConfiguration page in `frontend/src/views/ShiftConfiguration.tsx` with:
  - List of shift types (GET /shift-types)
  - Create button → opens ShiftTypeForm modal
  - Edit button per shift type → modal with pre-filled form
  - Delete button with confirmation
  - Show team count using each shift type (prevent deletion if > 0)

- [ ] T056 [P] Create shiftTypesApi service in `frontend/src/services/shiftTypesApi.ts` with:
  - GET /shift-types (list, paginated)
  - GET /shift-types/{id} (detail)
  - POST /shift-types (create)
  - PUT /shift-types/{id} (update)
  - DELETE /shift-types/{id} (soft delete)

- [ ] T057 [P] Create TypeScript types in `frontend/src/types/shift-types.ts`:
  - TimeWindow interface {start, end}
  - ShiftType interface
  - ShiftTypeForm request/response types

- [ ] T058 [P] Update Team types in `frontend/src/types/team.ts` to include:
  - shift_type, shift_type_id, time_windows, total_hours, expected_hours, uses_dynamic_close

- [ ] T059 Update team list/detail views to display shift type details and total_hours in `frontend/src/views/TeamsView.tsx`

- [ ] T060 Add ShiftConfiguration route to main routing in `frontend/src/App.tsx`

**Checkpoint**: Admin UI fully functional for shift type management

---

## Phase 7: Database Migration & Data Transition

**Purpose**: Migrate existing teams from old schema to new ShiftType references

- [ ] T061 Create migration part 2 in `backend/alembic/versions/[VERSION]_migrate_team_shifts.py`:
  - Add shift_type_id column to team (nullable)
  - For each unique (shift_start, shift_end) pair in existing teams:
    - Create matching ShiftType
    - Assign team.shift_type_id to that ShiftType
  - Make shift_type_id NOT NULL
  - Drop shift_start and shift_end columns

- [ ] T062 Test migration with existing team data in local database

**Checkpoint**: Existing data successfully migrated to new schema

---

## Phase 8: Integration Testing & Polish

**Purpose**: Cross-user story validation and edge case handling

- [ ] T063 [P] Test shift type deletion prevented when teams assigned in `backend/tests/test_shift_types_integration.py`
- [ ] T064 [P] Test team view reflects shift type changes in real-time in `backend/tests/test_teams_integration.py`
- [ ] T065 [P] Test timezone handling for shift times (Europe/Madrid) in `backend/tests/test_shift_type_model.py`
- [ ] T066 [P] Test pagination on GET /shift-types (page, size params) in `backend/tests/test_shift_types_integration.py`
- [ ] T067 [P] Test RBAC: Empleado cannot access shift type endpoints in `backend/tests/test_shift_types_security.py`
- [ ] T068 [P] Test RBAC: Moderador cannot delete shift types in `backend/tests/test_shift_types_security.py`
- [ ] T069 [P] Test error messages for duplicate names, invalid windows, hour mismatches in `backend/tests/test_shift_types_contract.py`
- [ ] T070 [P] Test performance: GET /teams with 50+ shift types returns <200ms in `backend/tests/test_shift_types_performance.py`
- [ ] T071 Test frontend: Create Cortado with 2 windows, verify form validation + API success in browser
- [ ] T072 Test frontend: Edit Mañana times, verify total_hours updates immediately
- [ ] T073 Test frontend: Attempt to delete shift type with teams, verify error + team list shown

- [ ] T074 [P] Update backend README with new shift types API documentation
- [ ] T075 [P] Update frontend README with ShiftConfiguration component usage
- [ ] T076 [P] Run `mypy app --strict` to verify type safety
- [ ] T077 [P] Run `ruff check backend/ --fix` for linting compliance
- [ ] T078 [P] Run `pytest backend/tests/` for full test suite
- [ ] T079 Run quickstart.md validation (create 4 shifts, create team, verify calculations)

**Checkpoint**: Feature complete, tested, documented, production-ready

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
  ↓ (depends on)
Phase 2: Foundational (BLOCKS all user stories)
  ↓ (depends on)
Phase 3,4,5: User Stories 1,2,3 (can run in PARALLEL)
  ↓ (depends on)
Phase 6: Frontend (all user stories complete)
  ↓ (depends on)
Phase 7: Migration (after US3 backend)
  ↓ (depends on)
Phase 8: Integration & Polish (all stories)
```

### User Story Dependencies

- **User Story 1 (Admin Configuration)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 2 (Auto Calculation)**: Can start after Phase 2 - Depends on US1 models/services
- **User Story 3 (Team Integration)**: Can start after Phase 2 - Depends on US1 models

**Independence**: Each user story can be independently tested and deployed:
- After US1: Admins can create/manage shift types ✓
- After US2: System calculates hours automatically ✓
- After US3: Teams use shift types with full details ✓

### Parallel Opportunities per Phase

**Phase 1 Setup**:
- T002, T003, T004 can run in parallel (different files, no dependencies)

**Phase 2 Foundational**:
- T007, T008, T009, T010 can run in parallel (different files; all depend on T006 migration)

**Phase 3 User Story 1 Tests**:
- T012-T018 can run in parallel (write all tests first, should all FAIL before implementation)

**Phase 3 User Story 1 Implementation**:
- T019-T026 are sequential (each builds on previous validation/logic)

**Phase 4 User Story 2 Tests**:
- T027-T031 can run in parallel (different test files)

**Phase 4 User Story 2 Implementation**:
- T032-T036 are mostly sequential (depends on US1 being complete)

**Phase 5 User Story 3 Tests**:
- T037-T039 can run in parallel (different test files)

**Phase 5 User Story 3 Implementation**:
- T040-T053 are mostly sequential (Team model must be updated before service/router changes)

**Phase 6 Frontend**:
- T054-T058 can run in parallel (different components/services)

**Phase 8 Polish**:
- T063-T070 (tests) can run in parallel
- T074-T078 (linting/docs) can run in parallel

### Fastest Path: Team of 1

1. **Phase 1 Setup** (T001-T005): 2-3 hours
2. **Phase 2 Foundational** (T006-T011): 3-4 hours (BLOCKS all stories)
3. **Phase 3 US1** (T012-T026): 4-5 hours
4. **Phase 4 US2** (T027-T036): 2-3 hours
5. **Phase 5 US3** (T037-T053): 5-6 hours
6. **Phase 6 Frontend** (T054-T060): 6-8 hours
7. **Phase 7 Migration** (T061-T062): 2-3 hours
8. **Phase 8 Polish** (T063-T079): 3-4 hours

**Total**: ~30-36 hours

### Parallel Path: Team of 2-3

**Setup**: 1 dev completes Phase 1-2 (5-7 hours)
**Phase 3-5**: Once Phase 2 done, teams split:
- Dev A: US1 (T012-T026): 4-5 hours
- Dev B: US2 (T027-T036): 2-3 hours + help on US1 integration
- (Or 2 devs on US1 in parallel, then move to US3)

**Frontend**: Dev C starts Phase 6 once Phase 2 done (parallel to backend US stories)

**Timeline**: ~15-20 hours (parallel execution faster)

---

## Implementation Strategy

### MVP First (All 3 User Stories are P1)

1. ✅ Complete **Phase 1: Setup** (~2-3 hrs)
2. ✅ Complete **Phase 2: Foundational** (~3-4 hrs) ← **CRITICAL GATE**
3. ✅ Complete **Phase 3: User Story 1** (~4-5 hrs) → DEMO shift type configuration
4. ✅ Complete **Phase 4: User Story 2** (~2-3 hrs) → DEMO hour calculations
5. ✅ Complete **Phase 5: User Story 3** (~5-6 hrs) → DEMO team integration
6. ✅ Complete **Phase 6: Frontend** (~6-8 hrs) → DEMO admin UI
7. ✅ Complete **Phase 7: Migration** (~2-3 hrs) → Production-ready data transition
8. ✅ Complete **Phase 8: Polish** (~3-4 hrs) → Security + documentation complete

**MVP Ready**: After Phase 5 backend + Phase 6 frontend = complete feature for users

### Incremental Delivery (if reducing scope)

- **MVP v1 (Backend Only)**: After Phase 5 - Admin can use API to configure shifts (CLI/cURL)
- **MVP v2 (with Frontend)**: After Phase 6 - Admin has web UI
- **MVP v3 (Production)**: After Phase 7 + Phase 8 - Data migrated, fully tested, documented

### Risk Mitigation

- **Phase 2 is CRITICAL**: If any foundational task fails, all stories blocked
- **Phase 7 Migration**: Test thoroughly with real data before production
- **Phase 8 Security**: Run RBAC tests before release (T067-T068)

---

## Notes

- **[P] tasks** = different files, no cross-file dependencies, can parallelize
- **[Story] label** = maps task to specific user story (US1/US2/US3) for traceability
- **Each user story** is independently testable at its checkpoint
- **Verify tests FAIL** before implementing (TDD approach)
- **Commit after each task** or logical group
- **Stop at any checkpoint** to validate story independently
- **Avoid**: vague tasks, same-file conflicts, cross-story dependencies that break independence

---

## Task Status Summary

| Phase | ID Range | Count | Est. Hours | Blocker? |
|-------|----------|-------|-----------|----------|
| Setup | T001-T005 | 5 | 2-3 | No |
| Foundational | T006-T011 | 6 | 3-4 | **YES** |
| User Story 1 | T012-T026 | 15 | 4-5 | No |
| User Story 2 | T027-T036 | 10 | 2-3 | No |
| User Story 3 | T037-T053 | 17 | 5-6 | No |
| Frontend | T054-T060 | 7 | 6-8 | No |
| Migration | T061-T062 | 2 | 2-3 | No |
| Polish | T063-T079 | 17 | 3-4 | No |
| **TOTAL** | T001-T079 | **79** | **30-36** | — |

---

✅ **Tasks Generated** — Ready for implementation!
