# Phase 6: Next Steps - Reports Implementation

**Current Status**: Phase 5 Complete ✅
**Ready to Start**: Phase 6 - Reports (T072-T074)
**Estimated Duration**: 8-10 hours
**Branch**: 004-shift-roster-calendar

---

## 🎯 Phase 6 Objectives

Implement reports functionality for moderators to view vacation and attendance summaries.

### User Stories

#### US4: Vacation Summary Report
**Goal**: Moderators can view aggregated vacation data for their department

**Features**:
- [ ] View total vacation days by status (Approved, Pending, Rejected)
- [ ] Filter by employee
- [ ] Filter by year
- [ ] Export to CSV (optional)

#### US5: Attendance Report (Future)
**Goal**: Moderators can track clock in/out records

**Features**:
- [ ] View clock in/out records by date range
- [ ] Filter by employee
- [ ] Calculate hours worked
- [ ] Show shift types

---

## 📋 Implementation Plan

### Phase 6 Tasks (3 major tasks)

#### T072: Vacation Summary Report Backend
**Files to Create/Modify**:
- [ ] Backend endpoint: `GET /moderator/reports/vacations`
  - Query params: `year`, `status` (optional)
  - Response: Aggregated data by employee
  - Security: Department scoping + RLS

**Service Layer** (`services/moderator_service.py`):
```python
def get_vacation_summary(
    tenant_id: UUID,
    department: str,
    year: int,
    status_filter: str = None
) -> VacationSummaryDTO:
    """
    Aggregate vacation data by employee.

    Returns:
    {
        "year": 2026,
        "department": "Cocina",
        "summary": [
            {
                "employee_id": "uuid",
                "employee_name": "Carlos Rodríguez",
                "approved_days": 5,
                "rejected_days": 2,
                "pending_days": 3,
                "remaining_days": 20
            }
        ],
        "department_total": {
            "approved_days": 15,
            "rejected_days": 4,
            "pending_days": 8
        }
    }
    """
```

**Schema** (`schemas/moderator.py`):
- [ ] Add `VacationSummaryRowDTO`
- [ ] Add `VacationSummaryDTO`
- [ ] Add query parameter validation

**Router** (`routers/moderator.py`):
- [ ] Add `GET /reports/vacations` endpoint
- [ ] Response model: `VacationSummaryDTO`

**Test Coverage**:
- [ ] Test aggregation logic
- [ ] Test filtering by status
- [ ] Test department scoping
- [ ] Test zero-data case

---

#### T073: Attendance Report Backend
**Files to Create/Modify**:
- [ ] Backend endpoint: `GET /moderator/reports/attendance`
  - Query params: `date_from`, `date_to`
  - Response: Clock in/out records
  - Security: Department scoping + RLS

**Service Layer** (`services/time_tracking_service.py`):
```python
def get_attendance_report(
    tenant_id: UUID,
    department: str,
    date_from: date,
    date_to: date
) -> AttendanceReportDTO:
    """
    Get aggregated attendance records.

    Returns:
    {
        "date_from": "2026-03-01",
        "date_to": "2026-03-31",
        "department": "Cocina",
        "records": [
            {
                "employee_id": "uuid",
                "employee_name": "Carlos Rodríguez",
                "date": "2026-03-15",
                "clock_in": "08:00",
                "clock_out": "16:30",
                "hours_worked": 8.5,
                "shift_type": "Mañana"
            }
        ]
    }
    """
```

**Schema** (`schemas/moderator.py`):
- [ ] Add `AttendanceRecordDTO`
- [ ] Add `AttendanceReportDTO`

**Router** (`routers/moderator.py`):
- [ ] Add `GET /reports/attendance` endpoint
- [ ] Response model: `AttendanceReportDTO`

**Test Coverage**:
- [ ] Test date range filtering
- [ ] Test hours calculation
- [ ] Test employee filtering
- [ ] Test shift type mapping

---

#### T074: Reports Frontend Views
**Files to Create**:
- [ ] `views/ModeratorReports.tsx` (main container)
- [ ] `components/moderator/VacationSummaryReport.tsx` (report component)
- [ ] `components/moderator/AttendanceSummaryReport.tsx` (report component)
- [ ] `hooks/useReports.ts` (data fetching hooks)
- [ ] `services/reportService.ts` (API methods)
- [ ] `__tests__/*.test.tsx` (unit tests)

**Features**:
- [ ] Tab navigation (Vacation / Attendance)
- [ ] Filter controls (year, date range, employee)
- [ ] Data table display
- [ ] Summary statistics
- [ ] Export button (CSV)
- [ ] Loading states
- [ ] Error handling
- [ ] Responsive design

**Components Breakdown**:

1. **ModeratorReports.tsx** (Main container)
   - Tab navigation
   - Filter state management
   - Error/loading states
   - Integration of sub-components

2. **VacationSummaryReport.tsx** (Vacation table)
   - Displays aggregated vacation data
   - Shows: Employee, Approved, Pending, Rejected, Remaining
   - Filters by year and status
   - Sortable columns

3. **AttendanceSummaryReport.tsx** (Attendance table)
   - Displays clock in/out records
   - Shows: Date, Employee, Clock In, Clock Out, Hours, Shift Type
   - Filters by date range
   - Sortable columns

**Services** (`services/reportService.ts`):
```typescript
async getVacationSummary(
  year: number,
  status?: string
): Promise<VacationSummaryDTO>

async getAttendanceReport(
  dateFrom: string,
  dateTo: string
): Promise<AttendanceReportDTO>
```

---

## 🏗️ Architecture Decisions

### Data Aggregation
**Question**: Should aggregation happen in backend or frontend?
**Decision**: Backend aggregation
**Rationale**:
- Better performance (database does heavy lifting)
- Consistent calculations
- Supports large datasets
- Easier to optimize with indexes

### Report Format
**Question**: Table view or charts first?
**Decision**: Table first, charts optional
**Rationale**:
- Simpler implementation
- Better accessibility
- Users can export raw data
- Charts can be added later

### Export Format
**Question**: CSV, PDF, or both?
**Decision**: CSV (MVP)
**Rationale**:
- Easier to implement
- Compatible with Excel
- Users can create charts themselves
- PDF support in future sprint

---

## 📊 Expected Data Volume

### Vacation Summary Query
```sql
SELECT
  e.id,
  e.first_name || ' ' || e.last_name as name,
  COUNT(*) FILTER (WHERE vr.status = 'Aprobado') as approved_days,
  COUNT(*) FILTER (WHERE vr.status = 'Rechazado') as rejected_days,
  COUNT(*) FILTER (WHERE vr.status = 'Pendiente') as pending_days,
  (vb.total_days - COUNT(*) FILTER (WHERE vr.status = 'Aprobado')) as remaining_days
FROM employee e
LEFT JOIN vacation_request vr ON e.id = vr.employee_id
LEFT JOIN vacation_balance vb ON e.id = vb.employee_id
WHERE e.department = ? AND e.tenant_id = ?
GROUP BY e.id
ORDER BY e.first_name
```

### Attendance Query
```sql
SELECT
  e.id,
  e.first_name || ' ' || e.last_name as name,
  sr.date,
  tr.clock_in_timestamp,
  tr.clock_out_timestamp,
  EXTRACT(EPOCH FROM (tr.clock_out_timestamp - tr.clock_in_timestamp))/3600 as hours,
  st.name as shift_type
FROM shift_record sr
JOIN employee e ON sr.employee_id = e.id
LEFT JOIN time_record tr ON sr.id = tr.shift_id
JOIN shift_type st ON sr.shift_type_id = st.id
WHERE e.department = ?
  AND sr.date BETWEEN ? AND ?
  AND e.tenant_id = ?
ORDER BY sr.date DESC, e.first_name
```

---

## 🧪 Testing Strategy

### Backend Tests
- [ ] Unit tests for aggregation logic
- [ ] Integration tests for endpoints
- [ ] Department scoping validation
- [ ] Date range filtering
- [ ] Zero-data edge cases

### Frontend Tests
- [ ] Component rendering
- [ ] Filter interactions
- [ ] Data display accuracy
- [ ] Error states
- [ ] Loading states
- [ ] Export functionality

### Performance Tests
- [ ] Response time < 500ms
- [ ] Large dataset handling
- [ ] Pagination readiness

---

## 📈 Performance Considerations

### Indexing
```sql
-- Create if not exists
CREATE INDEX IF NOT EXISTS idx_vacation_request_status
  ON vacation_request(status);

CREATE INDEX IF NOT EXISTS idx_shift_record_date
  ON shift_record(date);

CREATE INDEX IF NOT EXISTS idx_time_record_shift_id
  ON time_record(shift_id);
```

### Query Optimization
- Use aggregation functions in DB
- Limit date ranges for reports
- Cache summary data (optional)
- Implement pagination for large results

---

## 🔐 Security Considerations

### Department Scoping
```python
# All report queries must filter by:
WHERE department = current_moderator_department
  AND tenant_id = current_tenant_id
```

### Data Access
- Only moderator's department data
- Cannot view other departments' reports
- RLS enforced at query level

### Audit Logging
- Log when reports are accessed
- Record date ranges requested
- Track data exports

---

## 📱 UI/UX Mockup

### Reports View Layout
```
╔════════════════════════════════════════════════════════╗
║  📊 Reportes                                            ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  [Vacaciones] [Asistencia]                            ║
║                                                        ║
║  Filtros:                                              ║
║  [Año: 2026 ▼] [Estado: Todos ▼] [Exportar CSV]      ║
║                                                        ║
║  ┌──────────────────────────────────────────────────┐ ║
║  │ Empleado      │ Aprobado │ Pendiente │ Rechazado │ ║
║  ├──────────────────────────────────────────────────┤ ║
║  │ Carlos Rodríguez │    5   │     2     │    1     │ ║
║  │ María López      │    8   │     0     │    0     │ ║
║  │ Juan García      │    0   │     3     │    2     │ ║
║  └──────────────────────────────────────────────────┘ ║
║                                                        ║
║  Total Departamento: 13 aprobados, 5 pendientes       ║
╚════════════════════════════════════════════════════════╝
```

---

## 🚀 Implementation Checklist

### Pre-Implementation
- [ ] Review existing reports schemas
- [ ] Confirm database indexes
- [ ] Plan API response format
- [ ] Design UI mockups

### Backend Implementation (T072-T073)
- [ ] Write aggregation queries
- [ ] Create service methods
- [ ] Add schema DTOs
- [ ] Create router endpoints
- [ ] Write unit tests
- [ ] Verify security/RLS

### Frontend Implementation (T074)
- [ ] Create view component
- [ ] Create report components
- [ ] Create service methods
- [ ] Add filter controls
- [ ] Write unit tests
- [ ] Style with Tailwind
- [ ] Verify responsive design

### Testing & Verification
- [ ] Manual testing of all filters
- [ ] Performance testing
- [ ] Security audit
- [ ] Cross-browser testing
- [ ] Mobile responsiveness

### Documentation
- [ ] Update API documentation
- [ ] Add implementation notes
- [ ] Create user guide
- [ ] Document data flows

---

## 📚 Reference Materials

### Related Files
- `contracts/moderator-api.md` - API specifications
- `data-model.md` - Database schema
- `quickstart.md` - Setup guide
- `IMPLEMENTATION_SUMMARY.md` - Previous phases summary

### Code Examples to Review
- `routers/moderator.py` - Endpoint patterns
- `services/moderator_shift_service.py` - Service layer patterns
- `components/moderator/VacationRequestList.tsx` - Table patterns
- `__tests__/VacationApproval.test.tsx` - Test patterns

---

## ⏱️ Timeline Estimate

| Task | Est. Hours | Priority |
|------|-----------|----------|
| T072 Backend | 2-3 | High |
| T073 Backend | 2-3 | High |
| T074 Frontend | 3-4 | High |
| Testing | 2-3 | High |
| **Total** | **9-13** | **High** |

---

## 🎯 Success Criteria

### Functional Requirements
- ✅ Vacation summary shows correct aggregations
- ✅ Attendance report displays accurate hours
- ✅ Filters work correctly (date, year, employee)
- ✅ Department scoping enforced
- ✅ CSV export working
- ✅ Error handling in place
- ✅ Loading states present

### Performance Requirements
- ✅ Response time < 500ms
- ✅ Handles 1000+ shifts/month
- ✅ No N+1 queries
- ✅ Proper database indexing

### Quality Requirements
- ✅ 80+ test cases
- ✅ TypeScript strict mode
- ✅ Responsive design
- ✅ Accessibility compliance
- ✅ Spanish language

---

## 📞 Questions Before Starting

1. **CSV Export**: Should we include date ranges in filename?
2. **Columns**: Any additional columns needed in reports?
3. **Visualizations**: Should we include charts? (Future sprint?)
4. **Pagination**: Max rows per report? Implement pagination?
5. **Drill-down**: Should clicking an employee show details?

---

## 🚀 Ready to Start!

All prerequisites complete:
- ✅ Phase 1-5 done
- ✅ Database ready
- ✅ Backend patterns established
- ✅ Frontend patterns established
- ✅ Testing infrastructure in place
- ✅ Documentation complete

**Next Command**: Begin Phase 6 implementation

---

**Status**: Ready to Implement Phase 6 ✅
**Last Updated**: 2026-03-10 03:40 UTC
**Target Completion**: March 12, 2026
