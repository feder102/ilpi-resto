# Quickstart: Moderator Portal Development (Feature 006)

**Date**: 2026-03-09
**Phase**: 1 - Design & Contracts
**Status**: Complete

---

## Quick Reference

### What is Feature 006?

A Moderator Portal enabling team leaders (Jefe de Cocina, etc.) to:
- View their department's shift roster
- Approve/reject employee vacation requests
- Assign shifts to team members
- View attendance and vacation reports

### Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Access Control | Department-scoped (service layer) | Secure, can't access cross-dept data |
| Shift Conflict Detection | Check vacation before allowing assignment | Data integrity, prevent invalid state |
| Real-time Updates | Synchronous (no background jobs) | Moderators see changes immediately |
| Calendar UI | react-big-calendar (reuse from Feature 005) | Fast delivery, proven component |
| State Mgmt | React Context (reuse from Feature 005) | Familiar pattern, Context enough for moderator state |

### Architecture Layers

```
Frontend (React)
  ↓ Axios API calls to /api/v1/moderator/*
Backend Router
  ↓ Deserialize, route to service
Backend Service (business logic)
  ↓ Validate, enforce rules, query database
Database (PostgreSQL)
  ↓ Persist state
```

---

## Data Model

### Core Tables (No Schema Changes)

All feature 006 functionality reuses existing tables:
- **user**: Authentication (role check)
- **employee**: Personnel record (department field)
- **vacation_request**: Time-off requests (add: reviewed_by, reviewed_at, rejection_reason)
- **shift_record**: Shift assignments and time tracking
- **shift_type**: Pre-configured shift definitions

### Key Relationships

```
Moderador (User.role = "Moderador")
  ↓ employee_id
Employee (department = "Cocina", etc.)
  ↓ Foreign key to
├── ShiftRecord[] (assigned shifts)
├── VacationRequest[] (submitted requests)
└── VacationBalance (annual allowance)
```

### Business Rules

1. **Department Scoping**: Moderator can ONLY see/manage employees in their department
   - Query filter: `employee.department = current_user.department`
   - Applied at service layer, enforced in every endpoint

2. **Shift Assignment**: Cannot assign shift if employee has approved vacation
   - Validate: `SELECT * FROM vacation_request WHERE employee_id = ? AND status = "Aprobado" AND date IN [start, end]`
   - If found: Return 400 VACATION_CONFLICT

3. **Vacation Approval**: Records moderator identity and timestamp
   - `vacation_request.reviewed_by = current_user.id`
   - `vacation_request.reviewed_at = NOW()`

---

## API Endpoints (Backend)

**Base URL**: `/api/v1/moderator`
**Auth**: Bearer JWT token with `role: "Moderador"`

### Shift Roster
- `GET /roster?year=2026&month=3` → List shifts for department that month
- `GET /shifts?date=2026-03-15` → Shifts on specific date

### Vacation Management
- `GET /vacations/pending` → List pending requests from department
- `GET /vacations/{id}` → Details of specific request
- `POST /vacations/{id}/approve` → Approve request (sets reviewed_by, reviewed_at)
- `POST /vacations/{id}/reject` → Reject with optional reason

### Shift Assignment
- `POST /shifts/assign` → Create new shift (with conflict detection)
- `PUT /shifts/{id}` → Replace existing shift
- `DELETE /shifts/{id}` → Remove shift (unless already worked)

### Reports
- `GET /reports/vacations?year=2026` → Vacation summary by employee
- `GET /reports/attendance?date_from=2026-03-01&date_to=2026-03-31` → Clock-in/out records

**Error Format**:
```json
{
  "detail": {
    "error": {
      "code": "VACATION_CONFLICT",
      "message": "El empleado tiene vacaciones aprobadas en esta fecha"
    }
  }
}
```

---

## Frontend Components

### Directory Structure
```
frontend/src/
├── views/
│   ├── ModeratorDashboard.tsx       # Main entry point
│   ├── ModeratorRoster.tsx          # Shift calendar
│   ├── VacationApproval.tsx         # Vacation requests list
│   ├── ShiftAssignment.tsx          # Assign shifts form
│   └── ModeratorReports.tsx         # Reports dashboard
├── components/moderator/
│   ├── RosterCalendar.tsx           # Reusable calendar
│   ├── VacationRequestList.tsx      # Request list UI
│   ├── ShiftAssignmentForm.tsx      # Assignment form UI
│   └── ReportGenerator.tsx          # Report UI
├── context/
│   └── ModeratorContext.tsx         # State: department, filters
├── services/
│   └── moderatorService.ts          # API calls
└── types/
    └── models.ts                    # TypeScript interfaces
```

### Key Components

**ModeratorDashboard.tsx**: Wrapper component
- Verifies Moderador role
- Provides ModeratorContext (department, filters)
- Routes to sub-views (Roster, Vacations, Assignments, Reports)

**ModeratorRoster.tsx**: Calendar view
- Reuses `react-big-calendar` pattern from Feature 005
- Shows shifts for department
- Color-codes shifts by type
- Highlights vacation conflicts

**VacationApproval.tsx**: Request management
- Lists pending requests from department
- Approve button → POST /vacations/{id}/approve
- Reject button → POST /vacations/{id}/reject with optional reason
- Shows employee details, dates, days requested

**ShiftAssignment.tsx**: Assign shifts
- Form: Select employee (dropdown from department roster)
- Form: Select date (date picker)
- Form: Select shift type (dropdown from available types)
- Submit → POST /shifts/assign
- Error handling: VACATION_CONFLICT, SHIFT_EXISTS, EMPLOYEE_NOT_IN_DEPARTMENT

**ModeratorReports.tsx**: Reports dashboard
- Vacation summary: Days approved/rejected/pending by employee
- Attendance report: Clock-in/out records date range

### State Management

**ModeratorContext**:
```typescript
interface ModeratorContextType {
  moderator: {
    userId: string;
    employeeId: string;
    department: Department;  // Derived from employee record
  };
  filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: VacationStatus;
  };
  setFilters: (filters) => void;
}
```

---

## Testing Examples

### Backend Test (pytest)

```python
# Test: Moderator cannot assign shift to employee in different department
def test_assign_shift_cross_department_rejected(client):
    # Setup
    moderador_cocina = create_user(role="Moderador", department="Cocina")
    empleado_barra = create_employee(department="Barra")

    # Test
    response = client.post(
        "/api/v1/moderator/shifts/assign",
        json={
            "employee_id": str(empleado_barra.id),
            "date": "2026-03-15",
            "shift_type_id": shift_type.id
        },
        headers={"Authorization": f"Bearer {moderador_cocina.token}"}
    )

    # Verify
    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == "EMPLOYEE_NOT_IN_DEPARTMENT"
```

### Frontend Test (Vitest)

```typescript
// Test: Vacation approval sets reviewed_by and reviewed_at
test('moderator can approve vacation request', async () => {
  const { getByText, getByTestId } = render(<VacationApproval />);

  // Load pending requests (mocked API)
  await waitFor(() => expect(getByText('Carlos Rodríguez')).toBeInTheDocument());

  // Click approve
  fireEvent.click(getByTestId('approve-button'));

  // Verify API was called with moderator context
  expect(mockApproveRequest).toHaveBeenCalledWith(
    requestId,
    expect.objectContaining({ moderatorId: currentUser.id })
  );
});
```

---

## Common Development Tasks

### Task 1: Add a New Moderator Endpoint

1. **Define Request/Response** in `contracts/moderator-api.md`
2. **Create Schema** in `backend/app/schemas/moderator.py`
3. **Implement Service Logic** in `backend/app/services/moderator_service.py`
4. **Add Router Endpoint** in `backend/app/routers/moderator.py`
   ```python
   @router.get("/shifts")
   async def get_shifts(
       date: str = Query(...),
       current_user: dict = Depends(require_role_and_active("Moderador"))
   ):
       return shift_service.get_shifts_for_date(date, current_user)
   ```
5. **Test with pytest**: Create test in `backend/tests/test_moderator.py`
6. **Type Safety**: Run `mypy app --strict` (zero errors required)

### Task 2: Add a Frontend Component

1. **Create Component** in `frontend/src/components/moderator/MyComponent.tsx`
   ```typescript
   export default function MyComponent() {
     const { moderator } = useContext(ModeratorContext);
     const [data, setData] = useState(null);

     useEffect(() => {
       moderatorService.getData(moderator.department).then(setData);
     }, []);

     return <div>{data?.map(...)}</div>;
   }
   ```
2. **Add TypeScript Types** in `frontend/src/types/models.ts`
3. **Add Service Call** in `frontend/src/services/moderatorService.ts`
4. **Integrate into View** in `frontend/src/views/ModeratorDashboard.tsx`
5. **Test with Vitest**: Create test in `frontend/src/components/moderator/__tests__/`

### Task 3: Debug Department Scoping

If data appears to leak across departments:
1. **Check Service Layer**: Every query must filter by `department` from moderator's employee record
   ```python
   # WRONG: No department filter
   shifts = session.exec(select(ShiftRecord).where(ShiftRecord.date == date)).all()

   # RIGHT: Department filter applied
   moderator_dept = get_moderator_department(current_user, session)
   shifts = session.exec(
       select(ShiftRecord)
       .join(Employee)
       .where(
           ShiftRecord.date == date,
           Employee.department == moderator_dept
       )
   ).all()
   ```
2. **Check Router**: Ensure router calls service with full JWT context
3. **Check Database**: Verify referential integrity (no orphaned records)

---

## Troubleshooting

### Issue: "User is not Moderador"
- **Cause**: JWT `role` claim is not "Moderador"
- **Fix**: Verify seed data created moderador user with correct role
  ```python
  user = session.exec(select(User).where(User.email == "moderador@ilpi.es")).first()
  assert user.role == "Moderador"
  ```

### Issue: "Employee not in department"
- **Cause**: Trying to assign shift to employee in different department
- **Fix**: Verify both moderador and employee are in same department
  ```python
  mod_dept = get_moderator_department(current_user)
  emp_dept = session.exec(select(Employee).where(Employee.id == emp_id)).first().department
  assert mod_dept == emp_dept
  ```

### Issue: "Vacation conflict" when there's no vacation
- **Cause**: Database timezone mismatch or date parsing error
- **Fix**: Ensure all dates are in tenant's configured timezone
  ```python
  # WRONG: Using UTC date
  vacation_date = datetime.utcnow().date()

  # RIGHT: Using tenant timezone
  tz = pytz.timezone(tenant.timezone)
  vacation_date = datetime.now(tz).date()
  ```

### Issue: Calendar shows employee shifts twice
- **Cause**: Duplicate shifts in database
- **Fix**: Check unique constraint on (tenant_id, employee_id, date)
  ```sql
  SELECT employee_id, date, COUNT(*)
  FROM shift_record
  GROUP BY employee_id, date
  HAVING COUNT(*) > 1;
  ```

---

## Performance Tips

1. **Batch Load Shifts**: Use single query with JOIN instead of N+1 lookups
   ```python
   # SLOW: N+1 queries
   shifts = session.exec(select(ShiftRecord)).all()
   for shift in shifts:
       employee = session.exec(select(Employee).where(Employee.id == shift.employee_id)).first()

   # FAST: Single query with join
   shifts = session.exec(
       select(ShiftRecord, Employee)
       .join(Employee)
   ).all()
   ```

2. **Pagination**: Use LIMIT/OFFSET for large datasets
   ```python
   limit = 50
   offset = (page - 1) * limit
   session.exec(query.limit(limit).offset(offset))
   ```

3. **Caching**: Cache shift types (rarely change)
   ```python
   @lru_cache(maxsize=10)
   def get_shift_types(tenant_id: str):
       return session.exec(select(ShiftType).where(...)).all()
   ```

---

## Next Steps

1. **Phase 2**: Run `/speckit.tasks` to generate implementation tasks
2. **Phase 3**: Follow task sequence for backend, frontend implementation
3. **Testing**: Run `pytest` (backend) and `npm run test` (frontend) before commit
4. **Quality**: Run `mypy app --strict` and `npm run lint` before push

---

## References

- **Specification**: [Feature 006 Spec](./spec.md)
- **Plan**: [Implementation Plan](./plan.md)
- **Research**: [Design Decisions](./research.md)
- **Data Model**: [Entity Relationships](./data-model.md)
- **API Contracts**: [REST Endpoints](./contracts/moderator-api.md)
- **Constitution**: [Project Principles](../../001-kitchen-staff-mgmt/constitution.md)

