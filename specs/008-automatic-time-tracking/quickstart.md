# Quickstart: Automatic Shift-Based Time Tracking

**Feature**: 008-automatic-time-tracking
**Branch**: `008-automatic-time-tracking`
**Status**: Implementation Phase (spec + plan complete)

Quick reference for developers implementing this feature.

---

## What Gets Built

1. **TimeEntry Model** — New SQLModel entity for automatic time tracking records
2. **Batch Job** — Nightly scheduler to auto-generate TimeEntry from ShiftRecord assignments
3. **Statistics Service** — Query methods for employee/department statistics
4. **Admin API Endpoints** — Read-only stats endpoints (GET endpoints only)
5. **Admin Dashboard** — Frontend component to display statistics

**What Does NOT Get Built in Phase 1**:
- Manual clock in/out (deferred to Phase 2)
- Employee-facing UI (on hold)
- Corrections/amendments
- Payroll integration

---

## Key Architectural Decisions

### 1. Batch Job Timing
**Strategy**: Nightly batch job runs at 01:00 AM (configurable via `.env`)
```env
BATCH_TIME_TRACKING_HOUR=1
```
**Why**: Reduces DB load, sufficient for statistics (not real-time). Job processes all shifts for previous day.

### 2. Idempotency
**Strategy**: Unique constraint `(tenant_id, employee_id, shift_date, shift_type_id)` prevents duplicates
```python
TimeEntry.__table_args__ = (
    UniqueConstraint("tenant_id", "employee_id", "shift_date", "shift_type_id",
                    name="uq_time_entry_employee_date_shift"),
)
```
**Why**: Safe re-runs if batch job crashes/restarts.

### 3. Multi-Shift Days
**Strategy**: One TimeEntry per ShiftRecord (separate entries)
```python
# If employee has Mañana (06:00-14:00) + Noche (22:00-06:00) on same day
# → Two TimeEntry records created (8h + 8h = 16h total)
```
**Why**: Better auditability, aligns with per-shift tracking model.

### 4. Timezone Handling
**Strategy**: Store times in tenant timezone; DB timestamps in UTC
```python
# Shift: 22:00-06:00 (tenant: Europe/Madrid)
# → hours_worked = 8.0 (correct across DST)
# → created_at stored in UTC
```
**Why**: Matches production requirement (Principle IV).

### 5. Statistics Aggregation
**Strategy**: Computed on-demand from TimeEntry table with proper indexes
```python
# Indexes on: (tenant_id, employee_id, shift_date), (tenant_id, shift_date)
# Queries use filters: WHERE tenant_id=? AND source='shift'
```
**Why**: Meets <2sec requirement; avoids materialized view complexity.

---

## Implementation Checklist

### Backend

- [ ] **T001**: Create TimeEntry SQLModel entity
  - File: `backend/app/models/time_entry.py`
  - Fields: id, tenant_id, employee_id, shift_date, start_time, end_time, hours_worked, source, created_at, updated_at
  - Relationships: employee, shift_record, shift_type
  - Unique constraint: (tenant_id, employee_id, shift_date, shift_type_id)

- [ ] **T002**: Update Employee model with relationship
  - File: `backend/app/models/employee.py`
  - Add: `time_entries: Optional[List["TimeEntry"]]`

- [ ] **T003**: Create Alembic migration
  - File: `backend/alembic/versions/[timestamp]_create_time_entry.py`
  - Run: `alembic revision --autogenerate -m "Create time_entry table"`
  - Apply: `alembic upgrade head`

- [ ] **T004**: Extend time_tracking_service.py
  - Add method: `generate_time_entries_for_date(tenant_id: int, date: date) -> int`
  - Add method: `get_employee_statistics(tenant_id, employee_id, year, month) -> EmployeeStats`
  - Add method: `get_department_statistics(tenant_id, year, month, department=None) -> List[DepartmentStats]`
  - Add method: `get_time_entries(tenant_id, filters) -> List[TimeEntry]`

- [ ] **T005**: Create statistics schemas
  - File: `backend/app/schemas/time_tracking.py`
  - DTOs: TimeEntryResponse, EmployeeStatisticsResponse, DepartmentStatisticsResponse, etc.

- [ ] **T006**: Add FastAPI router endpoints
  - File: `backend/app/routers/time_tracking.py`
  - Routes: GET /statistics/employee/{id}, GET /statistics/department, GET /entries, POST /batch-process
  - RBAC: Require Admin/Moderator (except batch-process requires Admin only)

- [ ] **T007**: Setup batch job scheduler
  - File: `backend/app/main.py` or new `backend/app/jobs/scheduler.py`
  - Use: APScheduler or Celery
  - Schedule: Daily at BATCH_TIME_TRACKING_HOUR
  - Action: Call `generate_time_entries_for_date(tenant_id, yesterday)`

- [ ] **T008**: Add exception types
  - File: `backend/app/common/exceptions.py`
  - New: `InvalidShiftError`, `DuplicateTimeEntryError`, `StatisticsCalculationError`

- [ ] **T009**: Write integration tests
  - File: `backend/tests/integration/test_time_tracking.py`
  - Tests:
    - Automatic entry creation for shifts
    - Idempotency (no duplicates on re-run)
    - Employee statistics calculation
    - Department statistics aggregation
    - Timezone handling (DST edge cases)

- [ ] **T010**: Write unit tests
  - File: `backend/tests/unit/test_time_tracking_service.py`
  - Tests: Service methods in isolation

### Frontend

- [ ] **T011**: Create TimeTracking types file
  - File: `frontend/src/types/timeTracking.ts`
  - Types: TimeEntry, TimeEntrySource, EmployeeStatistics, DepartmentStatistics, etc.

- [ ] **T012**: Create statistics service
  - File: `frontend/src/services/statisticsService.ts`
  - Methods: getEmployeeStats(), getDepartmentStats(), getTimeEntries(), triggerBatchProcess()
  - Error handling: Map API errors to user-friendly messages

- [ ] **T013**: Create statistics components
  - File: `frontend/src/components/time-tracking/EmployeeStatisticsCard.tsx`
  - Display: Employee name, total hours, days worked, breakdown by shift type
  - Features: Date picker (month/year selection)

- [ ] **T014**: Create admin statistics view
  - File: `frontend/src/views/AdminStatistics.tsx`
  - Sections: Employee list, department breakdown, time entries table
  - Features: Filter by employee, department, date range

- [ ] **T015**: Integrate stats view into App routing
  - File: `frontend/src/App.tsx`
  - Route: `/admin/statistics` (AdminRoute protection)
  - Import: AdminStatistics component

- [ ] **T016**: Write frontend tests
  - File: `frontend/src/components/time-tracking/__tests__/StatisticsCard.test.tsx`
  - Tests: Component rendering, error handling, date navigation

---

## Database Setup

### Run Migration
```bash
cd backend
alembic upgrade head
```

### Verify Table Creation
```bash
docker exec -it ilpi-db-dev psql -U ilpi -d ilpi
SELECT * FROM information_schema.tables WHERE table_name='time_entries';
```

### Check Indexes
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'time_entries';
```

---

## Testing the Feature

### 1. Manual Batch Trigger (for testing)
```bash
POST /api/v1/time-tracking/batch-process
{
  "process_date": "2026-03-13",
  "overwrite_existing": false
}
```

### 2. Verify Entries Created
```bash
GET /api/v1/time-tracking/entries?start_date=2026-03-13&end_date=2026-03-13&employee_id=1
```

### 3. Check Statistics
```bash
GET /api/v1/time-tracking/statistics/employee/1?year=2026&month=3
```

### 4. Full Integration Test
```bash
cd backend
pytest tests/integration/test_time_tracking.py -v
```

---

## Configuration

### Environment Variables (add to `.env`)
```env
# Time Tracking
BATCH_TIME_TRACKING_HOUR=1              # Hour of day to run batch job (0-23)
BATCH_TIME_TRACKING_MINUTE=0            # Minute of hour
TIME_TRACKING_LOG_LEVEL=INFO            # Logging level for batch jobs
```

### Logging Setup
**Backend**: Structured JSON logging to console/file
```python
# In time_tracking_service.py
logger.info(
    "Time entries created",
    extra={
        "tenant_id": tenant_id,
        "date": shift_date,
        "entries_created": count,
        "action": "batch_time_tracking"
    }
)
```

---

## Deployment Checklist

- [ ] Migration tested in dev environment
- [ ] Batch job scheduler tested (cron or APScheduler)
- [ ] Statistics queries tested for performance (<2 seconds)
- [ ] RBAC verified (Admin/Moderator access, Empleado denied)
- [ ] Error handling tested (invalid dates, missing employee, etc.)
- [ ] Frontend deployed with Admin Statistics view
- [ ] Documentation updated (API docs, user guide)
- [ ] Monitoring set up (batch job logs, stats query latency)

---

## Common Issues & Solutions

### Issue: Batch job not running
**Solution**: Check APScheduler/Celery logs, verify `BATCH_TIME_TRACKING_HOUR` in `.env`, restart service

### Issue: Duplicate time entries created
**Solution**: Check unique constraint in migration, verify `get_or_create` logic in service

### Issue: Statistics query slow
**Solution**: Add indexes, check query plan with `EXPLAIN ANALYZE`, consider caching if needed

### Issue: Overnight shifts (22:00-06:00) calculate wrong hours
**Solution**: Ensure hours_worked calculation handles day boundary correctly (use timedelta or duration field)

### Issue: Timezone mismatch in statistics
**Solution**: Verify tenant timezone is set correctly, check UTC conversion in batch job, test with DST transitions

---

## Links & References

- **Spec**: [spec.md](spec.md)
- **Data Model**: [data-model.md](data-model.md)
- **API Contracts**: [contracts/api-endpoints.md](contracts/api-endpoints.md)
- **Existing ShiftRecord Service**: `backend/app/services/shift_service.py`
- **Constitution**: See CLAUDE.md for 5 principles
- **Project Structure**: See CLAUDE.md project structure section

---

## Future Phases (Phase 2+)

- **Phase 2**: Manual clock in/out (user-initiated time entries with same TimeEntry table)
- **Phase 2**: Corrections/amendments audit log
- **Phase 3**: Overtime calculations and rate tracking
- **Phase 4**: Payroll system integration
