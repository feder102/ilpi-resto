# Research & Design Decisions: Automatic Shift-Based Time Tracking

**Feature**: 008-automatic-time-tracking
**Date**: 2026-03-13
**Status**: Phase 0 Complete

---

## Summary

All design decisions documented below. No external research required; architecture follows existing project patterns and constitutional principles.

---

## Research Topics & Decisions

### 1. Automatic Entry Generation Strategy

**Question**: Should TimeEntry records be generated in real-time (on shift date arrival) or via batch job?

**Decision**: **Nightly Batch Job** at 01:00 AM

**Rationale**:
- **Batch approach advantages**:
  - Reduces database load (single operation per day instead of per-shift)
  - Simpler error handling (retry mechanism if job fails)
  - Better for statistics (data consistency guaranteed at end of day)
  - Aligns with "on hold" MVP status (not real-time clock tracking)

- **Real-time alternative rejected**:
  - Would require per-shift triggers or complex scheduling
  - Harder to handle shifts spanning midnight
  - Not necessary for statistics use case
  - More complex error recovery

**Implementation**:
- APScheduler running in FastAPI startup
- Job: `time_tracking_service.generate_time_entries_for_date(tenant_id, yesterday)`
- Runs at configurable hour: `BATCH_TIME_TRACKING_HOUR` env var (default: 1)
- Logs all operations for audit trail

**Related Code**:
```python
# In app/main.py or app/jobs/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()
scheduler.add_job(
    generate_daily_time_entries,
    'cron',
    hour=BATCH_TIME_TRACKING_HOUR,
    minute=0,
    id='daily_time_tracking'
)
scheduler.start()
```

---

### 2. Idempotency & Duplicate Prevention

**Question**: How to prevent duplicate TimeEntry records if batch job runs twice?

**Decision**: **Unique Constraint + Get-or-Create Pattern**

**Rationale**:
- Database constraint prevents duplicates at storage level
- Service-level check prevents unnecessary DB operations
- Unique key: `(tenant_id, employee_id, shift_date, shift_type_id)`
  - Identifies single instance of work (same employee, same shift type, same day)

**Implementation**:
```python
# In SQLModel definition
__table_args__ = (
    UniqueConstraint("tenant_id", "employee_id", "shift_date", "shift_type_id",
                    name="uq_time_entry_employee_date_shift"),
)

# In service
entry, created = TimeEntry.get_or_create(
    tenant_id=tenant_id,
    employee_id=shift.employee_id,
    shift_date=shift.shift_date,
    shift_type_id=shift.shift_type_id,
    defaults={...}
)
if created:
    logger.info(f"Created TimeEntry: {entry.id}")
else:
    logger.debug(f"TimeEntry already exists: {entry.id}")
```

**Testing**:
- Integration test: Run batch job twice, verify no duplicate entries
- Idempotency test: Call service 100+ times, count should not increase

---

### 3. Multi-Shift Days Handling

**Question**: If an employee has multiple shifts on the same day (Mañana + Noche), how to track?

**Decision**: **Separate TimeEntry per Shift**

**Rationale**:
- Maintains 1:1 mapping between ShiftRecord and TimeEntry
- Better auditability (know which shifts were worked)
- Supports future manual tracking (can clock in/out per shift)
- Simplifies statistics (SUM hours naturally handles multiple entries)

**Example**:
```python
# Input: Employee with 2 shifts on 2026-03-15
shifts = [
    ShiftRecord(employee_id=1, shift_type=Mañana, shift_date=2026-03-15),
    ShiftRecord(employee_id=1, shift_type=Noche, shift_date=2026-03-15)
]

# Output: 2 TimeEntry records
entry1 = TimeEntry(employee_id=1, shift_date=2026-03-15,
                   start_time=06:00, end_time=14:00, hours_worked=8.0)
entry2 = TimeEntry(employee_id=1, shift_date=2026-03-15,
                   start_time=22:00, end_time=06:00, hours_worked=8.0)

# Statistics: total = 16.0 hours
```

**Alternative Rejected**:
- Single daily entry: Would lose shift-type information, harder to debug

---

### 4. Handling Overnight Shifts (e.g., 22:00-06:00 next day)

**Question**: How to calculate hours when shift spans midnight?

**Decision**: **Store shift_date as start date; calculate hours considering duration**

**Rationale**:
- `shift_date` = day shift starts
- `end_time` on same date even if it's after midnight (example: 22:00-06:00)
- `hours_worked = (end_time - start_time)` with wrap-around logic
- Simpler than storing end_date separately

**Implementation**:
```python
from datetime import time, timedelta

def calculate_hours(start_time: time, end_time: time) -> float:
    """Calculate hours between two times, handling day boundary"""
    start_minutes = start_time.hour * 60 + start_time.minute
    end_minutes = end_time.hour * 60 + end_time.minute

    if end_minutes < start_minutes:
        # Shift crosses midnight
        duration_minutes = (24 * 60) - start_minutes + end_minutes
    else:
        duration_minutes = end_minutes - start_minutes

    return duration_minutes / 60.0

# Example: 22:00 - 06:00
assert calculate_hours(time(22, 0), time(6, 0)) == 8.0
```

---

### 5. Timezone Handling in Shift Times

**Question**: How to handle timezone-aware shift definitions (e.g., tenant in Madrid)?

**Decision**: **Store times in tenant timezone; DB timestamps in UTC**

**Rationale**:
- Shift times defined in tenant timezone (e.g., "22:00 Madrid time")
- Database stores UTC timestamps for consistency across regions
- Batch job converts: Local → UTC for DB storage
- Statistics reported in tenant timezone
- Aligns with Principle IV (Production-Ready Deployment)

**Implementation**:
```python
from datetime import datetime
from zoneinfo import ZoneInfo

tenant_tz = ZoneInfo(tenant.timezone)  # "Europe/Madrid"

# Shift definition: 22:00 Madrid time
shift_start = datetime(2026, 3, 15, 22, 0, 0, tzinfo=tenant_tz)

# Convert to UTC for DB
shift_start_utc = shift_start.astimezone(ZoneInfo("UTC"))

# Store in TimeEntry
entry.created_at = datetime.now(ZoneInfo("UTC"))
```

**DST Edge Case**:
- When Spain changes to summer time (Mar 31 02:00 → 03:00)
- Shift duration unchanged (still 8 hours)
- Calculation handles automatically via datetime arithmetic

**Testing**:
- Test shifts during DST transition weeks
- Verify hours_worked remains correct

---

### 6. Statistics Query Performance

**Question**: Can on-demand statistics queries meet <2 second requirement?

**Decision**: **Yes, with proper indexes**

**Rationale**:
- TimeEntry table expected: ~20 employees × 25 days/month = 500 rows/month
- With 12 months: ~6,000 rows per tenant
- Department aggregation: GROUP BY across few departments
- Indexes on: (tenant_id, employee_id, shift_date), (tenant_id, shift_date)
- <2 second query time easily achieved

**Alternative Rejected**:
- Materialized views: Over-engineering for MVP, harder to maintain
- Redis cache: Adds complexity, need invalidation strategy
- Pre-computed summaries: Requires batch update logic

**Optimization Strategy**:
```sql
-- Index for employee statistics
CREATE INDEX idx_time_entries_tenant_employee_date
ON time_entries(tenant_id, employee_id, shift_date);

-- Index for batch processing by date
CREATE INDEX idx_time_entries_tenant_date
ON time_entries(tenant_id, shift_date);

-- Query plan check after implementation
EXPLAIN ANALYZE
SELECT SUM(hours_worked), COUNT(DISTINCT shift_date)
FROM time_entries
WHERE tenant_id = ? AND employee_id = ?
  AND EXTRACT(YEAR FROM shift_date) = ?
  AND EXTRACT(MONTH FROM shift_date) = ?;
```

---

### 7. Future Manual Tracking Support

**Question**: How to prepare for Phase 2 (manual clock in/out) without rework?

**Decision**: **Add `source` field to TimeEntry; design service to handle both**

**Rationale**:
- Phase 1: Only `source='shift'` entries created
- Phase 2: Manual clock-in creates `source='manual'` entries
- Statistics aggregated across both sources (configurable)
- No data migration needed
- Service methods already prepared for source filtering

**Implementation**:
```python
class TimeEntrySource(str, Enum):
    SHIFT = "shift"      # Automatic from ShiftRecord
    MANUAL = "manual"    # User-clocked in Phase 2

# Statistics method signature (already prepared for Phase 2)
def get_employee_statistics(
    self,
    tenant_id: int,
    employee_id: int,
    year: int,
    month: int,
    include_manual: bool = False  # Phase 2 parameter
) -> EmployeeStatistics:
    sources = [TimeEntrySource.SHIFT]
    if include_manual:
        sources.append(TimeEntrySource.MANUAL)

    query = TimeEntry.filter(
        tenant_id=tenant_id,
        employee_id=employee_id,
        source__in=sources
    )
    # ... calculate statistics
```

---

### 8. RBAC: Admin/Moderator vs. Empleado Access

**Question**: Who can view automatic time tracking statistics?

**Decision**: **Admin/Moderador can view all statistics; Empleado cannot access**

**Rationale**:
- Automatic tracking is for internal operations (on-hold MVP)
- Not yet production-ready for employee-facing portal
- Prevents confusion with future manual tracking
- Admin/Moderador need stats for payroll/reporting
- Aligns with existing RBAC model (Principle V)

**Implementation**:
```python
# In routers/time_tracking.py
@router.get("/statistics/employee/{employee_id}")
async def get_employee_statistics(
    employee_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # RBAC check at service layer
    if current_user.role not in [Role.ADMIN, Role.MODERADOR]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Service method enforces tenant isolation
    stats = time_tracking_service.get_employee_statistics(
        tenant_id=current_user.tenant_id,
        employee_id=employee_id,
        year=year,
        month=month
    )
    return stats
```

---

## Technology Choices

### Backend: APScheduler (not Celery)

**Decision**: Use APScheduler for background job scheduling

**Rationale**:
- Already used in project (if present) or lightweight choice
- No external service dependency (no Redis/RabbitMQ)
- Sufficient for MVP with single server
- Easy to replace with Celery later if needed

**Alternative Considered**:
- Celery + RabbitMQ: Over-engineered for MVP, adds operational complexity

### Database: PostgreSQL Constraints (not application-level validation)

**Decision**: Enforce unique constraint in database

**Rationale**:
- Prevents race conditions (concurrent batch jobs)
- Single source of truth
- Application logic as backup check only

---

## Testing Strategy

**Phase 0 Research Result**:
✅ All critical design decisions documented.
✅ No unresolved [NEEDS CLARIFICATION] items.
✅ Ready for Phase 1 implementation planning.

**Key Tests to Implement**:
1. Automatic entry creation: Happy path + multiple shifts
2. Idempotency: Batch job run twice = no duplicates
3. Timezone correctness: Shifts in DST boundaries
4. Statistics accuracy: Manual calculation vs. query results
5. RBAC: Admin can view, Empleado cannot
6. Performance: Statistics queries <2 seconds

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Batch job fails silently | Structured logging to file; alert on missing entries |
| DST shifts cause hour miscalculation | Thorough unit tests with DST boundary dates |
| Statistics query timeout with larger dataset | Monitor query performance; add indexes if needed |
| Employee confusion (sees automatic stats in future) | Phase 1 = admin-only; Phase 2 = opt-in UI |
| Multi-shift day duplication | Unique constraint + integration test |

---

## Conclusion

✅ **Phase 0 Complete**: All design decisions documented and justified.
✅ **No blockers** for Phase 1 implementation.
✅ **Constitutional alignment** verified: All 5 principles supported.
✅ **Ready for code generation** in Phase 2 (tasks.md).
