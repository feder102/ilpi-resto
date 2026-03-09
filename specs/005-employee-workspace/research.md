# Research & Design Decisions: Employee Workspace Portal

**Feature**: 005-employee-workspace | **Date**: 2026-03-09

---

## Password Reset / Setup Flow

**Decision**: Email-triggered password setup on first login

**Rationale**:
- **Admin-created accounts**: In existing ILPI system, admins create employee accounts (email provided). No self-signup needed.
- **Security**: Token-based flow (similar to "forgot password") is more secure than admin assigning temporary passwords
- **UX**: Familiar pattern - user receives email, clicks link or token, sets password themselves
- **Alignment**: Matches existing auth service architecture (JWT, bcrypt, httponly cookies)

**Implementation approach**:
1. Admin creates employee with email (existing flow)
2. Employee-account-created event triggers password-setup email
3. Email contains link with token: `/auth/password-setup?token=xyz`
4. Employee clicks link, enters new password, sets account active
5. Employee logs in with email + password
6. JWT issued, employee enters dashboard

**Alternatives considered**:
- **Admin assigns temp password**: Bad UX (employee must change immediately), less secure
- **SMS verification**: Out of scope, not ILPI's process
- **Passwordless (magic link)**: Nice-to-have, deferred to post-MVP
- **OAuth/SSO**: Out of scope for single-tenant MVP

---

## Employee Dashboard Architecture

**Decision**: Restricted view with 3 fixed modules (Shifts, Vacations, Time Tracking)

**Rationale**:
- **Simplicity**: Employees see only what they need
- **Security**: Prevents accidental navigation to admin features
- **Maintainability**: Clear role-based UI (no feature flags, no permission checks at component level)
- **Consistency**: Aligns with existing architecture (ADMIN_MOD, ALL_ROLES patterns)

**Route structure**:
```
/employee/dashboard      (main view - 3 module cards)
/employee/shifts         (read-only calendar)
/employee/vacations      (request + list)
/employee/time-tracking  (clock in/out + records)
```

**Navigation**: Fixed sidebar with 3 items (no navigation to admin features visible)

---

## Row-Level Security (RLS) Strategy

**Decision**: Service-layer enforcement of `tenant_id` + `employee_id` filters

**Rationale**:
- **Defense in depth**: Both frontend UI restrictions + backend validation
- **No data leaks**: Service methods verify `current_user.employee_id` before returning data
- **Audit-friendly**: Every query logged with user context
- **Tenant isolation**: `tenant_id` filter applied (for future multi-tenant)

**Implementation**:
```python
# In time_tracking_service.py
def get_employee_time_records(
    employee_id: UUID,
    current_user: dict,  # from JWT
    tenant_id: UUID
) -> list[TimeRecord]:
    # Verify current user is the employee (or admin)
    if current_user.get("role") == "Empleado":
        if current_user.get("employee_id") != employee_id:
            raise ForbiddenError("Can only access own time records")

    # Query with filters
    return session.exec(
        select(TimeRecord).where(
            TimeRecord.tenant_id == tenant_id,
            TimeRecord.employee_id == employee_id,
            ...
        )
    ).all()
```

**Testing**: Every endpoint tested for "other employee" access attempt (should fail)

---

## Immutable Time Records Design

**Decision**: Clock-in/out creates immutable timestamp records (no edit access)

**Rationale**:
- **Payroll security**: Prevents fraud (no retroactive hour changes)
- **Audit trail**: All timestamps are historical, verifiable
- **Simplicity**: No edit validation, no approval workflow
- **Compliance**: Aligns with labor law requirements (time records cannot be altered)

**Implementation**:
```python
# Time record model
class TimeRecord(SQLModel, table=True):
    id: UUID = Field(primary_key=True)
    employee_id: UUID = Field(foreign_key="employee.id")
    date: date  # Date of the clock-in
    clock_in_timestamp: datetime  # When employee clicked "Clock In"
    clock_out_timestamp: datetime | None  # When employee clicked "Clock Out" (nullable if not clocked out)
    created_at: datetime  # Record creation time (immutable)

    # No update_at, no edit timestamps - immutable
```

**API**:
- `POST /time-tracking/clock-in` → Creates record with timestamp
- `POST /time-tracking/clock-out` → Updates clock-out timestamp only
- `GET /time-tracking/records` → Read-only list
- No `PUT` or `DELETE` endpoints for employee

---

## Clock-In/Out Button Behavior

**Decision**: Single click marks time (no manual time entry, no edit)

**Rationale**:
- **Foolproof**: Employees cannot game the system
- **Accurate**: Captures exact moment they clicked
- **Simple**: Single action, clear UX
- **Secure**: No way to backdated hours

**UI States**:
1. **Not Clocked In**: Show "Clock In" button (green)
2. **Clocked In**: Show "Clock Out" button (red) + timer showing elapsed time
3. **Clocked Out**: Show "Done" message + time summary
4. **Loading**: Disable button, show spinner during API call

**Validation**:
- Can only clock in on days with assigned shifts
- Cannot clock in twice (second clock-in blocked)
- Cannot clock out without clocking in (error)

---

## Timezone Handling

**Decision**: All timestamps use tenant.timezone (Europe/Madrid for ILPI)

**Rationale**:
- **Single-tenant MVP**: No need for per-user timezone selection
- **Simplicity**: All times in Madrid timezone
- **Consistency**: Same timezone as shift schedule
- **Future-proof**: Tenant object already has timezone field

**Implementation**:
- Store all timestamps in UTC in database (standard practice)
- Display times in tenant.timezone to employee (e.g., "14:30 Madrid time")
- Report times in tenant.timezone to admin (consistent)

**No user-facing timezone picker in v1** (post-MVP feature)

---

## Session Management After Password Change

**Decision**: Invalidate session on password change

**Rationale**:
- **Security**: Old password no longer valid, revoke access
- **Simple**: Clear behavior, no ambiguity
- **Consistent**: Standard web security practice

**UX**: Employee redirected to login with message "Your password was changed. Please log in again."

---

## Vacation Overlap with Shifts

**Decision**: Warn but don't prevent (informational display)

**Rationale**:
- **Business decision**: Admin may have reason to approve vacation during shifts (e.g., coverage planned)
- **No auto-delete**: Shifts remain assigned (may be reassigned to another employee)
- **Transparency**: Employee sees the overlap in both Shifts and Vacation views
- **Future**: Post-MVP could add "swap request" or "coverage plan" feature

---

## Time Record Correction Process

**Decision**: Admin can only correct via new entry (no retroactive edits)

**Rationale**:
- **Immutability**: Maintains audit trail
- **Compliance**: Labor law requirement in many jurisdictions
- **Clear audit**: Admin creates new correction entry with note "Correction for [date]"

**Post-MVP**: Correction workflow with approval/audit logging

---

## Edge Case Handling

| Scenario | Handling |
|----------|----------|
| Employee forgets to clock out | Record remains "in-progress" (clock_out_timestamp = NULL). Admin can mark as "ended" post-MVP. |
| Network failure during clock-in | Retry logic with exponential backoff. User sees "Retry" button. No duplicate entries (idempotent API). |
| Multiple simultaneous clock-in requests | DB constraint (only one active clock-in per employee) prevents duplicates. API returns 409 Conflict on second request. |
| Employee accesses dashboard before password setup | Redirected to password-setup page. Cannot proceed without completing. |
| Admin resets employee password | Employee's existing session invalidated. Must log in again with new password. |
| Employee's shift is deleted after clock-in | Time record remains. Clock-out still allowed. Record is historical artifact. |

---

## Technology Choices Rationale

| Choice | Why |
|--------|-----|
| **FastAPI** | Already in use. Async support, built-in validation, type safety. |
| **SQLModel** | Existing ORM. Combines SQLAlchemy + Pydantic. Immutable patterns supported. |
| **PostgreSQL** | Existing database. JSONB logging, time functions, constraints sufficient. |
| **React 19** | Existing frontend. Server components (optional) for better UX. Suspense for loading. |
| **Vite** | Existing build tool. Fast HMR, ESM support. |
| **JWT + HttpOnly Cookies** | Existing auth system. Secure (token cannot be accessed by JS). |
| **Bcrypt** | Industry-standard password hashing. Already in use. Cost ≥10 for security. |

---

## Security Considerations

- **No plaintext passwords**: All hashed with bcrypt before storage
- **No passwords in logs**: Audit logging excludes password fields
- **HttpOnly cookies**: Refresh token cannot be accessed by JavaScript
- **Rate limiting**: /auth/login limited to 10 req/min (existing slowapi)
- **HTTPS only**: All communication encrypted (enforced by security headers)
- **CSRF**: Not needed (SPA on same origin, using HttpOnly cookies for auth)
- **SQL injection**: Prevented by SQLModel ORM (parameterized queries)
- **XSS**: Prevented by React (automatic escaping) + CSP headers

---

## Post-MVP Features (Deferred)

- Push/email notifications for status changes
- Mobile app (web only for v1)
- Offline clock-in (requires service worker + sync)
- Time correction workflow (admin override with audit trail)
- Geolocation for clock-in verification
- Biometric authentication
- Shift swapping between employees
- Overtime calculations and reports
- Integration with payroll system
