# Quickstart: Employee Workspace Portal

**Feature**: 005-employee-workspace | **Branch**: `005-employee-workspace` | **Status**: Design Phase Complete

---

## What's This Feature?

Employee Workspace Portal is a restricted dashboard for kitchen staff (Empleado role) to:
1. **Set password** via email link after admin creates account
2. **View shifts** - Read-only calendar of assigned shifts
3. **Request time off** - Submit vacation requests with balance tracking
4. **Clock in/out** - Record work hours (immutable timestamps, no editing)

**Key Constraint**: Employees see ONLY their own data. Self-only access enforced at service layer.

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [spec.md](./spec.md) | User stories, acceptance scenarios, requirements |
| [plan.md](./plan.md) | Architecture, design decisions, constitution check |
| [data-model.md](./data-model.md) | Entity schemas, constraints, migrations |
| [research.md](./research.md) | Why we chose each approach |
| [contracts/](./contracts/) | API endpoint specifications |

---

## Key Design Decisions (TL;DR)

### 1. Password Setup: Email-Based Token Flow
- Admin creates account → Employee gets email with time-limited link
- Employee clicks link, sets password → Account becomes active
- Familiar pattern (like "forgot password"), secure (token-based)

### 2. Time Records: Immutable Timestamps
- Clock in/out creates **immutable** records (no editing allowed)
- Prevents fraud, satisfies audit/payroll requirements
- State: "clocked in" (active) → "clocked out" (completed) → read-only

### 3. Row-Level Security: Self-Only Access
- Service layer validates: `current_user.employee_id == requested_employee_id`
- Every endpoint filters by tenant_id + employee_id
- Frontend UI restricted, but backend enforces security

### 4. Timezone: Tenant Timezone Only
- All timestamps in UTC (database), displayed in tenant timezone (Europe/Madrid)
- No per-user timezone selection in v1
- Consistent with shift schedule timezone

---

## Implementation Map

### Backend Files to Create/Modify

```
backend/app/
├── models/
│   ├── time_record.py              # NEW: TimeRecord entity
│   └── __init__.py                 # UPDATE: Export TimeRecord
├── schemas/
│   ├── auth.py                     # UPDATE: Add PasswordSetupSchema
│   └── time_tracking.py            # NEW: Clock-in/out DTOs
├── services/
│   ├── auth_service.py             # UPDATE: password_setup() logic
│   └── time_tracking_service.py    # NEW: Clock-in/out business logic
└── routers/
    ├── auth.py                     # UPDATE: POST /auth/password-setup
    └── time_tracking.py            # NEW: Employee time-tracking endpoints
```

### Frontend Files to Create/Modify

```
frontend/src/
├── views/
│   ├── PasswordSetup.tsx           # NEW: Email token → password form
│   ├── EmployeeDashboard.tsx       # NEW: Main employee portal
│   ├── EmployeeShiftRoster.tsx     # UPDATE: Scope to self-only
│   ├── EmployeeVacations.tsx       # UPDATE: Scope to self-only
│   └── TimeTracking.tsx            # NEW: Clock in/out interface
├── components/
│   ├── EmployeeNav.tsx             # NEW: Limited sidebar (3 items)
│   └── TimeTrackingWidget.tsx      # NEW: Clock in/out button
├── hooks/
│   └── useTimeTracking.ts          # NEW: Clock state management
└── types/
    └── employee.ts                 # NEW: EmployeeContext types
```

### Database Migration

```
backend/alembic/versions/
└── [timestamp]_add_time_records_table.py
```

---

## Common Patterns in This Feature

### 1. Row-Level Security Check (Service Layer)

```python
def get_employee_time_records(
    employee_id: UUID,
    current_user: dict,  # from JWT token
    tenant_id: UUID
) -> list[TimeRecord]:
    # Verify current user is the employee (or admin)
    if current_user["role"] == "Empleado":
        if current_user["employee_id"] != str(employee_id):
            raise ForbiddenError("Can only access own records")

    # Query with filters
    return session.exec(
        select(TimeRecord).where(
            TimeRecord.tenant_id == tenant_id,
            TimeRecord.employee_id == employee_id
        )
    ).all()
```

### 2. Immutable Record Pattern

```python
class TimeRecord(SQLModel, table=True):
    id: UUID = Field(primary_key=True)
    employee_id: UUID = Field(foreign_key="employee.id")
    date: date
    clock_in_timestamp: datetime  # Set once, never changed
    clock_out_timestamp: datetime | None  # Set once on clock-out, then immutable
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

### 3. Password Setup (Service Layer)

```python
def setup_password(
    token: str,
    password: str,
    password_confirm: str
) -> User:
    # Validate token exists and not expired
    user = session.exec(
        select(User).where(
            User.password_reset_token == token,
            User.password_reset_expires > datetime.utcnow()
        )
    ).first()

    if not user:
        raise NotFoundError("Token invalid or expired")

    # Validate password strength
    if len(password) < 8 or not (any(c.isupper() for c in password) and any(c.isdigit() for c in password)):
        raise ValidationError("Password too weak")

    # Set password and mark active
    user.hashed_password = get_password_hash(password)
    user.is_active = True
    user.password_reset_token = None  # One-time use
    user.last_login = datetime.utcnow()

    session.add(user)
    session.commit()
    return user
```

---

## Testing Strategy

### Backend: Unit Tests

```python
# Test password setup validation
def test_password_setup_invalid_weak_password():
    # password too short or missing uppercase/digit
    with pytest.raises(ValidationError, match="too weak"):
        setup_password(token, "weak", "weak")

# Test clock-in validation
def test_clock_in_no_shift_today():
    # Employee has no shift assigned for today
    with pytest.raises(ValidationError, match="no shift"):
        clock_in(employee_id, tenant_id)

# Test clock-in/out immutability
def test_time_record_immutable_after_clock_out():
    # Cannot modify time record after clock_out_timestamp is set
    with pytest.raises(ValidationError, match="cannot be edited"):
        update_time_record(record_id, {"clock_in_timestamp": ...})
```

### Backend: Integration Tests

```python
# Test full password setup flow
def test_password_setup_flow(client):
    # 1. Admin creates user → token sent via email
    # 2. Employee POSTs password-setup with token
    # 3. User is now active and can login

# Test employee cannot see other employee's data
def test_employee_cannot_access_other_employee_records(client, auth_headers_emp1, auth_headers_emp2):
    # Log in as employee 1
    # Try to GET employee 2's time records
    # Should return 403 Forbidden
```

### Frontend: Component Tests

```tsx
// Test password setup form validation
test("shows error for weak password", () => {
  render(<PasswordSetupForm token="xyz" />);
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "weak" } });
  fireEvent.click(screen.getByText(/set password/i));
  expect(screen.getByText(/password too weak/i)).toBeInTheDocument();
});

// Test clock button state transitions
test("clock-out button shows only when clocked in", () => {
  render(<TimeTrackingWidget />);
  expect(screen.getByText(/clock in/i)).toBeVisible();
  expect(screen.queryByText(/clock out/i)).not.toBeInTheDocument();
  // Click clock in...
  expect(screen.getByText(/clock out/i)).toBeVisible();
});
```

---

## Implementation Checklist

### Phase 2: Task Generation (Next)
- [ ] Run `/speckit.tasks` to generate dependency-ordered tasks
- [ ] Review tasks.md for implementation order

### Phase 3: Implementation (After task generation)

**Backend**:
- [ ] Create `TimeRecord` model + migration
- [ ] Update `User` model (password setup fields)
- [ ] Implement `auth_service.setup_password()`
- [ ] Implement `time_tracking_service` (clock-in/out/list)
- [ ] Create password-setup endpoint (`POST /auth/password-setup`)
- [ ] Create time-tracking endpoints (`POST /clock-in`, `POST /clock-out`, `GET /records`)
- [ ] Create dashboard endpoints (`GET /shifts`, `GET /vacations/balance`, etc)
- [ ] Add unit tests (passwords, clock-in validation)
- [ ] Add integration tests (RLS, end-to-end flows)
- [ ] Run `mypy --strict` and `ruff check .`

**Frontend**:
- [ ] Create `PasswordSetup.tsx` view
- [ ] Create `EmployeeDashboard.tsx` (3-module layout)
- [ ] Create `TimeTracking.tsx` with clock button
- [ ] Create `EmployeeNav.tsx` (limited sidebar)
- [ ] Update `EmployeeShiftRoster.tsx` (self-only scope)
- [ ] Update `EmployeeVacations.tsx` (self-only scope)
- [ ] Add route guards (Empleado role only)
- [ ] Add unit tests (components, state management)
- [ ] Add integration tests (employee workflow)
- [ ] Run `npm run lint` and `npm run build`

### Phase 4: Quality Assurance
- [ ] End-to-end testing (full employee workflow)
- [ ] Load testing (50 concurrent employees clocking in)
- [ ] Security validation (attempt cross-employee access)
- [ ] Specification consistency check (run `/speckit.analyze`)

---

## API Endpoints Overview

### Authentication
- `POST /auth/password-setup` - Set password via email token
- `POST /auth/login` - Login with email + password
- `POST /auth/logout` - Logout
- `POST /auth/refresh` - Refresh access token

### Employee Dashboard
- `GET /employee/dashboard` - Overview + today's status
- `GET /employee/shifts` - Read-only calendar
- `GET /employee/vacations/balance` - Vacation days info
- `GET /employee/vacations/requests` - List requests
- `POST /employee/vacations/requests` - Create request
- `PATCH /employee/vacations/requests/{id}` - Cancel (Pendiente only)

### Time Tracking
- `POST /employee/time-tracking/clock-in` - Start shift
- `POST /employee/time-tracking/clock-out` - End shift
- `GET /employee/time-tracking/records` - History

---

## Key Validation Rules

| Feature | Rule | Error |
|---------|------|-------|
| **Password Setup** | Must be 8+ chars, mixed case, numbers | `INVALID_PASSWORD` |
| **Clock-in** | Must have shift scheduled for today | `NO_SHIFT_TODAY` |
| **Clock-in** | Cannot clock in twice without clock-out | `ALREADY_CLOCKED_IN` |
| **Clock-out** | Must be clocked in first | `NOT_CLOCKED_IN` |
| **Vacation Request** | Start date cannot be in past | `INVALID_DATE_RANGE` |
| **Vacation Request** | Must have remaining balance | `INSUFFICIENT_BALANCE` |
| **RLS** | Employee can only see own data | `ACCESS_DENIED` (403) |

---

## References

- **Architecture**: See `plan.md` - Constitution Check section (6 principles validated)
- **Design Decisions**: See `research.md` - 8 detailed decision explanations
- **Data Model**: See `data-model.md` - Schemas, constraints, migrations
- **API Contracts**: See `contracts/` folder - Full endpoint specs
- **Tasks**: See `tasks.md` (generated by `/speckit.tasks`)

---

## Common Issues & Solutions

### "Employee not found in database after password setup"
- Check: Did migration run? (`alembic upgrade head`)
- Check: Is employee account created before password setup endpoint called?
- Check: Does JWT contain `employee_id` field?

### "Clock-in fails with 'no shift today' but shift exists"
- Check: Shift date matches today's date (timezone issue?)
- Check: Shift status is `active` (not `inactive`)
- Check: Query is filtering by correct `tenant_id`

### "Vacation balance shows wrong remaining days"
- Check: Is `remaining_days` calculated as `total_days - used_days` (used = Aprobado only)?
- Check: `pending_approval` NOT subtracted from remaining (only approved counts as used)

### "React component shows stale data after clock-in"
- Check: Are you refetching time records after API call succeeds?
- Check: Is loading state being cleared? (prevents double-click submissions)

---

## Next Steps

1. **Run `/speckit.tasks`** to generate dependency-ordered implementation tasks
2. **Review tasks.md** to understand implementation sequence
3. **Follow task checklist** in dependency order
4. **Run quality gates** before each commit:
   ```bash
   cd backend && mypy app --strict && ruff check . && pytest
   cd frontend && npm run lint && npm run build
   ```
5. **Verify with `/speckit.analyze`** after completing all tasks
