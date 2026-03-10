# Research & Design Decisions: Moderator Portal (Feature 006)

**Date**: 2026-03-09
**Phase**: 0 - Research & Clarification
**Status**: Complete

## Overview

This document captures key design decisions, alternatives considered, and the rationale for Feature 006 (Moderator Portal) implementation. All decisions follow the 5-principle project constitution and leverage patterns established in Features 004 (Shift Roster Calendar) and 005 (Employee Workspace Portal).

---

## 1. Department-Scoped Access Control

### Decision
Moderators see and manage only employees in their assigned department. Access control is enforced at the **service layer**, not frontend.

### Rationale
- **Security**: Prevents accidental or intentional access to cross-department data
- **Simplicity**: Department is already an Employee enum; no new data structure needed
- **Audit Trail**: Service layer can log who accessed what, supporting compliance
- **Scalability**: Single-tenant MVP can extend to multi-tenant by adding tenant_id filter

### Alternatives Considered
1. **Role-based wildcards**: Admin sees all, Moderador sees filtered → Rejected (violates security-first; need explicit role-based scoping)
2. **Workgroup model**: Employees assigned to multiple groups → Rejected (adds complexity; Department enum is sufficient MVP)
3. **Frontend-only filtering**: Hide other departments in UI → Rejected (violates security principle; must enforce at service layer)

### Implementation
```python
# Service layer query (enforced, not frontend)
def get_department_employees(current_user: dict, tenant_id: str) -> List[Employee]:
    # Extract department from current_user's employee record
    # Filter: WHERE tenant_id = tenant_id AND department = user.department
    # Never trust frontend to provide dept; derive from JWT
```

---

## 2. Shift Assignment with Conflict Detection

### Decision
Moderators assign shifts to employees via a dedicated endpoint that validates:
- Employee is in moderator's department
- No approved vacation on that date
- No existing shift on that date (offer to replace with confirmation)

### Rationale
- **Data Integrity**: Prevents invalid roster state (shifts during vacation)
- **User Experience**: Clear error messages when conflicts detected
- **Audit**: Shift assignments recorded with moderator identity for compliance

### Alternatives Considered
1. **Bulk import**: CSV upload for shift scheduling → Rejected (adds complexity; single-shift assignment covers MVP, bulk is post-MVP)
2. **Auto-fill based on rules**: Suggest shifts based on department patterns → Rejected (requires ML; MVP is manual assignment)
3. **Soft-assign (tentative)**: Pending moderator confirmation → Rejected (over-engineering; Feature 006 is moderator assignment, not employee confirmation)

### Implementation
```python
# Validation in ShiftService.assign_shift()
1. Check employee_id in moderator's department
2. Check no approved vacation on date
3. Check no existing shift; if exists, offer replace
4. Record assignment with moderator_id, timestamp
```

---

## 3. Vacation Approval Workflow

### Decision
Moderators approve/reject pending vacation requests. Approved vacations block shift assignments. All actions recorded with moderator identity and timestamp.

### Rationale
- **Compliance**: Audit trail for HR/payroll reconciliation
- **Data Consistency**: Approved vacation immediately affects shift roster (blocks assignments)
- **User Feedback**: Employees see approval status (approved/rejected/pending)

### Alternatives Considered
1. **Two-step approval**: Moderador proposes, Admin confirms → Rejected (over-engineering for MVP; moderador approval sufficient)
2. **Automatic approval based on balance**: If employee has days, auto-approve → Rejected (business decision; requires moderator judgment)
3. **Partial approval**: Approve subset of days → Rejected (violates spec requirement; must approve all or reject)

### Implementation
```python
# VacationService.approve_request()
1. Verify moderator's employee is in same department
2. Update request status = "Aprobado"
3. Record reviewed_by = moderator_id, reviewed_at = now()
4. Shift roster immediately reflects unavailability
```

---

## 4. Reporting & Aggregation

### Decision
Moderators access vacation summaries and attendance reports aggregated by department and date range. Reports are **read-only** (no export to CSV/PDF in MVP).

### Rationale
- **Performance**: Pre-aggregated queries scale; no complex report generation required
- **MVP Scope**: Reduces scope; exportable reports deferred to post-MVP
- **Security**: No sensitive data export until audit logging is enhanced

### Alternatives Considered
1. **Real-time report generation**: Compute on-demand → Rejected (performance impact; aggregation at read time)
2. **Scheduled batch reports**: Email to moderators daily → Rejected (adds email infrastructure; not in spec)
3. **Exportable reports**: CSV/PDF → Rejected (post-MVP; MVP is read-only views)

### Implementation
```python
# ModeratorService.get_vacation_summary()
SELECT employee.name, COUNT(*) as approved_days, COUNT(*) as rejected_days
FROM vacation_request
WHERE tenant_id = ? AND department = ? AND status IN ('Aprobado', 'Rechazado')
GROUP BY employee_id
```

---

## 5. Calendar Display Technology

### Decision
Reuse `react-big-calendar` (already used in Feature 005) for shift roster display. Moderator calendar shows:
- Team members on X-axis (sortable)
- Dates on Y-axis (navigable months)
- Shift type and vacation status in cells

### Rationale
- **Reuse**: Component already proven in Feature 005 (Employee Shift Calendar)
- **Simplicity**: Familiar calendar widget; no custom date logic
- **Responsive**: Mobile-friendly; handles date navigation
- **Accessibility**: Built-in keyboard navigation and ARIA labels

### Alternatives Considered
1. **Custom grid**: HTML table with inline styles → Rejected (reinvents the wheel; react-big-calendar proven)
2. **Google Calendar integration**: Embed Google Calendar → Rejected (adds OAuth complexity; MVP is simple roster)
3. **Timeline library (vis-timeline)**: Horizontal timeline → Rejected (less suitable for roster view; big-calendar better for months)

### Implementation
```typescript
// ModeratorRoster.tsx - extends EmployeeShiftCalendar pattern
<Calendar
  localizer={localizer}
  events={shifts.map(s => ({...}))}
  style={{ height: 700 }}
/>
```

---

## 6. Authentication & Authorization

### Decision
Moderador role verified via JWT `role` claim. Service layer enforces department access by:
1. Extracting department from moderator's employee record (JWT `employee_id` → lookup)
2. Filtering all queries by that department
3. Rejecting any cross-department operations

### Rationale
- **Stateless**: No additional permission lookups; department already in employee record
- **Tenant-Aware**: Multi-tenant ready (single-tenant MVP uses tenant_id from JWT)
- **Auditable**: Service layer logs who accessed what

### Alternatives Considered
1. **Permission matrix table**: Store role/dept combinations → Rejected (over-engineering; enum sufficient)
2. **Middleware-only checks**: Verify in FastAPI middleware → Rejected (must enforce at service layer per constitution)
3. **Frontend-only role checks**: Hide UI elements for non-moderators → Rejected (violates security-first; API must validate)

### Implementation
```python
# In moderator routers
@router.get("/vacations/pending")
async def list_pending_requests(current_user: dict = Depends(require_role_and_active("Moderador"))):
    # Service layer fetches moderator's department
    # Filters requests to that department only
```

---

## 7. Conflict Handling Strategy

### Decision
When a conflict is detected (shift during vacation, duplicate shift), return **400 Bad Request** with a machine-readable error code and user-friendly Spanish message.

Error codes:
- `EMPLOYEE_NOT_IN_DEPARTMENT`: Moderator trying to assign shift to employee outside their dept
- `VACATION_CONFLICT`: Shift conflicts with approved vacation
- `SHIFT_EXISTS`: Employee already has shift on that date (offer replace)
- `INSUFFICIENT_BALANCE`: Vacation request exceeds available days (employee context)

### Rationale
- **UX**: Clear, actionable error messages help moderators understand why an action failed
- **Logging**: Machine-readable codes make error analysis easier
- **Internationalization**: Messages can be translated; codes don't change

### Alternatives Considered
1. **Silent rejection**: Fail without message → Rejected (poor UX; no feedback)
2. **200 OK with error detail**: HTTP 200, but include error → Rejected (violates REST semantics)
3. **Detailed validation objects**: Complex nested errors → Rejected (over-engineering; simple message + code sufficient)

### Implementation
```python
# Common exceptions (shared with Feature 004/005)
class ShiftConflictError(DomainException):
    code = "SHIFT_EXISTS"
    http_status = 400
    message = "Este turno ya existe. ¿Deseas reemplazarlo?"

class VacationConflictError(DomainException):
    code = "VACATION_CONFLICT"
    http_status = 400
    message = "El empleado tiene vacaciones aprobadas en estas fechas."
```

---

## 8. Data Consistency & Eventual Consistency

### Decision
All moderator operations (approvals, assignments) are **immediately consistent**:
- Vacation approval immediately affects shift roster (shift assignment checks approval status in real-time)
- Shift assignment immediately appears in roster view
- No background jobs or eventual consistency windows

### Rationale
- **Simplicity**: Single-tenant MVP can afford synchronous operations
- **UX**: Moderators see immediate feedback (critical for usability)
- **Compliance**: Audit trail is accurate with minimal window for inconsistency

### Alternatives Considered
1. **Event-driven with async processing**: Publish vacation approval event, shift service consumes asynchronously → Rejected (over-engineering for MVP; sync is clearer)
2. **Caching with TTL**: Cache department roster for 5 minutes → Rejected (moderators need real-time visibility)
3. **Batch reconciliation**: Nightly sync of shifts/vacations → Rejected (violates immediate consistency requirement)

### Implementation
```python
# Synchronous flow
approval_service.approve_request(request_id)  # Updates DB
shift_service.get_roster(...)  # Reads approved status in same transaction
# No background jobs; no race conditions (single-threaded FastAPI with DB transactions)
```

---

## 9. Permissions Matrix

### Decision
Define explicit permissions for Moderador role:

| Permission | Moderador | Admin | Employee |
|-----------|-----------|-------|----------|
| View own shifts | ✅ | ✅ | ✅ |
| View own vacation requests | ✅ | ✅ | ✅ |
| View dept roster | ✅ | ✅ | ❌ |
| View dept vacation requests | ✅ | ✅ | ❌ |
| Approve/reject vacation (own dept) | ✅ | ✅ | ❌ |
| Approve/reject vacation (other dept) | ❌ | ✅ | ❌ |
| Assign shifts (own dept) | ✅ | ✅ | ❌ |
| Assign shifts (other dept) | ❌ | ✅ | ❌ |
| View dept attendance reports | ✅ | ✅ | ❌ |
| Modify config/shift types | ❌ | ✅ | ❌ |

### Rationale
- **Clear boundaries**: Moderador manages department; Admin manages organization
- **Scalability**: Matrix can be stored in DB post-MVP for dynamic role configuration
- **Auditability**: Every permission check is logged

### Alternatives Considered
1. **Fine-grained permissions**: 50+ permission bits → Rejected (over-engineering; 3-tier role hierarchy sufficient)
2. **Custom roles**: User-defined role combinations → Rejected (post-MVP; MVP hardcodes 3 roles)

---

## 10. Frontend State Management

### Decision
Use React Context for moderator-specific state:
- `ModeratorContext`: Current moderator's department, tenant_id, filter preferences
- Derived from `AuthContext` (user info already there)
- No Redux or additional state library

### Rationale
- **Simplicity**: Matches existing auth state pattern from Feature 005
- **Performance**: Context re-renders only when dept/filters change
- **Testability**: Pure component props; easy to mock context in tests

### Alternatives Considered
1. **Redux**: Centralized state → Rejected (overkill for moderator state; Context sufficient)
2. **Zustand or Recoil**: Lightweight state libs → Rejected (Context already used; stay consistent)
3. **Prop drilling**: Pass state through component tree → Rejected (deep nesting; Context better)

---

## Summary Table

| Decision | Chosen Approach | Key Benefit | Post-MVP Enhancement |
|----------|-----------------|------------|----------------------|
| Department Access | Service-layer enforcement | Secure, auditable | Multi-tenant support |
| Shift Assignment | Immediate conflict detection | Data consistency | Bulk upload, AI suggestions |
| Vacation Approval | Synchronous, audit-logged | Compliance | Escalation workflows |
| Reporting | Read-only aggregated views | Performance | Exportable PDFs/CSVs |
| Calendar UI | react-big-calendar reuse | Fast delivery | Custom timeline layout |
| Auth | JWT role + service validation | Stateless, scalable | Dynamic role config |
| Error Handling | Machine-readable codes + messages | UX clarity | Localized messages |
| Consistency | Immediate (synchronous) | Real-time feedback | Event sourcing post-MVP |
| Permissions | 3-tier role matrix | Clear boundaries | Fine-grained RBAC |
| State Mgmt | React Context | Familiar pattern | Redux if needed post-MVP |

---

## Next Steps

1. **Phase 1**: Data model and API contract design
2. **Phase 2**: Task generation and implementation sequencing
3. **Phase 3**: Backend and frontend development in parallel
