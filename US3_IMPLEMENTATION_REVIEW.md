# US3 (Vacation Requests) - Implementation Review

**Date**: 2026-03-09
**Feature**: 005-employee-workspace
**Tasks**: T033-T040 (Backend + Service)
**Status**: Ready for Review

---

## 🔒 Security Architecture - 3 Layers

### Layer 1: Frontend Route Guard
```typescript
<EmployeeRoute>
  <EmployeeVacationView />
</EmployeeRoute>
```
Checks: `authenticated + Empleado role + is_active=true`

### Layer 2: Backend Dependency Injection
```python
@router.get("/employee/vacation-balance")
def endpoint(
    current_user: dict = Depends(require_role_and_active("Empleado"))
):
```
Validates: `JWT exists + role="Empleado" + User.is_active=true`

### Layer 3: Service Layer RLS
```python
def get_balance(employee_id, year, tenant_id, session):
    # Uses employee_id from JWT only (not user input)
    # No cross-employee access possible
```

---

## 📋 Endpoints (T033-T036)

### T033: GET /employee/vacation-balance

**Purpose**: Get current vacation balance
**Security**: ✅ Requires is_active=true, Empleado role
**RLS**: ✅ Only returns current employee's balance

```python
@router.get("/employee/vacation-balance")
def get_employee_vacation_balance(
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado")),
    year: int | None = Query(None),
):
    """Get vacation balance for current year (or specified year)"""
    employee_id = uuid.UUID(current_user.get("emp_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))
    target_year = year or date.today().year

    return vacation_service.get_balance(
        employee_id=employee_id,
        year=target_year,
        tenant_id=tenant_id,
        session=session,
    )
```

**Response**: `200 OK`
```json
{
  "employee_id": "uuid",
  "year": 2026,
  "total_days": 30,
  "used_days": 5,
  "remaining_days": 25
}
```

**Errors**:
- `401 Unauthorized`: Not authenticated or is_active=false
- `403 Forbidden`: Not Empleado role

---

### T034: GET /employee/vacation-requests

**Purpose**: List all personal vacation requests
**Security**: ✅ Requires is_active=true, Empleado role
**RLS**: ✅ Only returns current employee's requests

```python
@router.get("/employee/vacation-requests")
def get_employee_vacation_requests(
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado")),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """List vacation requests with optional status filter"""
    employee_id = uuid.UUID(current_user.get("emp_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    return vacation_service.list_requests(
        tenant_id=tenant_id,
        session=session,
        employee_id=employee_id,
        status_filter=status,
        page=page,
        size=size,
    )
```

**Query Parameters**:
- `status`: Filter by Pendiente|Aprobado|Rechazado|Cancelado (optional)
- `page`: Page number (default: 1)
- `size`: Items per page (default: 20, max: 100)

**Response**: `200 OK`
```json
{
  "items": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "employee_name": "John Doe",
      "start_date": "2026-07-01",
      "end_date": "2026-07-15",
      "requested_days": 15,
      "status": "Pendiente",
      "version": 1,
      "created_at": "2026-03-09T18:00:00Z",
      "reviewed_at": null
    }
  ],
  "total": 5,
  "page": 1,
  "size": 20,
  "pages": 1
}
```

**Errors**:
- `401 Unauthorized`: Not authenticated or is_active=false
- `403 Forbidden`: Not Empleado role

---

### T035: POST /employee/vacation-requests

**Purpose**: Submit new vacation request
**Security**: ✅ Requires is_active=true, Empleado role
**RLS**: ✅ Only authenticated employee's request created
**VALIDATION**: ✅ **CRITICAL - Enforces vacation balance strictly**

```python
@router.post("/employee/vacation-requests", status_code=201)
def create_employee_vacation_request(
    body: VacationRequestCreateEmployee,
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado")),
):
    """Submit new vacation request"""
    employee_id = uuid.UUID(current_user.get("emp_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    return vacation_service.create_request(
        employee_id=employee_id,
        start_date=body.start_date,
        end_date=body.end_date,
        tenant_id=tenant_id,
        session=session,
    )
```

**Request Body**:
```json
{
  "start_date": "2026-07-01",
  "end_date": "2026-07-15"
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "employee_id": "uuid",
  "employee_name": "John Doe",
  "start_date": "2026-07-01",
  "end_date": "2026-07-15",
  "requested_days": 15,
  "status": "Pendiente",
  "version": 1,
  "created_at": "2026-03-09T18:00:00Z"
}
```

**VALIDATION (Service Layer - T039)**:
- ✅ `start_date <= end_date` (rejected: 400 Bad Request)
- ✅ **Remaining balance >= requested_days** (rejected: 422 Unprocessable Entity)
  ```python
  remaining = balance.total_days - balance.used_days  # e.g., 25 days
  if requested_days > remaining:  # e.g., requesting 30 days
      raise BalanceExceededError(f"Saldo insuficiente. Días disponibles: {remaining}")
  ```

**Errors**:
- `400 Bad Request`: End date before start date
- `401 Unauthorized`: Not authenticated or is_active=false
- `403 Forbidden`: Not Empleado role
- `422 Unprocessable Entity`: **Insufficient vacation balance**

---

### T036: PUT /employee/vacation-requests/{request_id}/cancel

**Purpose**: Cancel pending vacation request
**Security**: ✅ Requires is_active=true, Empleado role
**RLS**: ✅ Employee can only cancel own requests (verified in service)
**VALIDATION**: ✅ Can only cancel if status == "Pendiente"

```python
@router.put("/employee/vacation-requests/{request_id}/cancel", status_code=200)
def cancel_employee_vacation_request(
    request_id: uuid.UUID,
    body: VacationActionRequest,
    session: DbSession,
    current_user: dict = Depends(require_role_and_active("Empleado")),
):
    """Cancel pending vacation request"""
    employee_id = uuid.UUID(current_user.get("emp_id", ""))
    tenant_id = uuid.UUID(current_user.get("tenant_id", ""))

    return vacation_service.cancel(
        request_id=request_id,
        version=body.version,
        employee_id=employee_id,
        tenant_id=tenant_id,
        session=session,
    )
```

**Request Body**:
```json
{
  "version": 1
}
```

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "status": "Cancelado",
  "version": 2,
  "updated_at": "2026-03-09T19:00:00Z"
}
```

**VALIDATION (Service Layer - T040)**:
```python
def cancel(request_id, version, employee_id, tenant_id, session):
    # RLS: Only current employee can cancel
    if req.employee_id != employee_id:  # Line 202
        raise ForbiddenError("Solo puede cancelar sus propias solicitudes")

    # Only Pendiente requests can be cancelled
    if req.status != "Pendiente":  # Line 205
        raise ValidationError("Solo se pueden cancelar solicitudes pendientes")

    req.status = "Cancelado"
    session.commit()
```

**Errors**:
- `400 Bad Request`: Cannot cancel if Aprobado or Rechazado
- `401 Unauthorized`: Not authenticated or is_active=false
- `403 Forbidden`: Not Empleado role OR not your request
- `404 Not Found`: Request doesn't exist
- `409 Conflict`: Request was modified (version mismatch)

---

## 🛡️ Service Layer Validations (T037-T040)

### T037: Service - get_vacation_balance()

```python
def get_balance(
    employee_id: uuid.UUID,
    year: int,
    tenant_id: uuid.UUID,
    session: Session,
) -> VacationBalanceResponse:
    """Get vacation balance for employee + year"""
    balance = _get_or_create_balance(employee_id, year, tenant_id, session)
    session.commit()
    return VacationBalanceResponse(
        employee_id=balance.employee_id,
        year=balance.year,
        total_days=balance.total_days,
        used_days=balance.used_days,
        remaining_days=balance.total_days - balance.used_days,  # Computed
    )
```

**Security**:
- ✅ RLS: Uses employee_id from JWT only
- ✅ Tenant isolation: Filters by tenant_id

---

### T038: Service - list_vacation_requests()

```python
def list_requests(
    tenant_id: uuid.UUID,
    session: Session,
    employee_id: uuid.UUID | None = None,
    status_filter: str | None = None,
    page: int = 1,
    size: int = 20,
) -> dict:
    """List vacation requests with optional filters"""
    query = select(VacationRequest).where(VacationRequest.tenant_id == tenant_id)

    if employee_id:
        query = query.where(VacationRequest.employee_id == employee_id)  # RLS
    if status_filter:
        query = query.where(VacationRequest.status == status_filter)

    # Pagination...
    return {"items": [...], "total": total, "page": page, "size": size, "pages": pages}
```

**Security**:
- ✅ RLS: Filters by employee_id (from JWT)
- ✅ Tenant isolation: Filters by tenant_id

---

### T039: Service - create_vacation_request()

```python
def create_request(
    employee_id: uuid.UUID,
    start_date: date,
    end_date: date,
    tenant_id: uuid.UUID,
    session: Session,
) -> VacationRequestResponse:
    """Create new vacation request with STRICT BALANCE VALIDATION"""

    # Validate date range
    if start_date > end_date:
        raise ValidationError("La fecha de inicio debe ser anterior a la de fin")

    # Calculate requested days
    requested_days = (end_date - start_date).days + 1  # Inclusive counting
    year = start_date.year

    # GET OR CREATE BALANCE FOR YEAR
    balance = _get_or_create_balance(employee_id, year, tenant_id, session)
    remaining = balance.total_days - balance.used_days

    # ✅ CRITICAL VALIDATION: Sufficient balance required
    if requested_days > remaining:
        raise BalanceExceededError(
            f"Saldo insuficiente. Días disponibles: {remaining}"
        )

    # Create request
    req = VacationRequest(
        tenant_id=tenant_id,
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
        requested_days=requested_days,
        status="Pendiente",
    )
    session.add(req)
    session.commit()
    session.refresh(req)
    return _to_response(req, session)
```

**CRITICAL VALIDATIONS**:
- ✅ Line 71: Date range validation (start <= end)
- ✅ Line 75-80: **BALANCE CHECK** - raises BalanceExceededError if insufficient days
- ✅ Computed requested_days correctly: (end - start) + 1 (calendar days, inclusive)

**Example**:
```
Available: 25 days
Request: 30 days (July 1-30)
Result: ❌ BalanceExceededError("Saldo insuficiente. Días disponibles: 25")

Available: 15 days
Request: 15 days (July 1-15)
Result: ✅ Created with status=Pendiente
```

---

### T040: Service - cancel_vacation_request()

```python
def cancel(
    request_id: uuid.UUID,
    version: int,
    employee_id: uuid.UUID,  # From JWT
    tenant_id: uuid.UUID,
    session: Session,
) -> VacationRequestResponse:
    """Cancel pending vacation request"""

    req = session.exec(
        select(VacationRequest).where(
            VacationRequest.id == request_id,
            VacationRequest.tenant_id == tenant_id,
        )
    ).first()
    if not req:
        raise NotFoundError("Solicitud no encontrada")

    # Version check (optimistic locking)
    if req.version != version:
        raise ConflictError("La solicitud fue modificada por otro usuario")

    # ✅ RLS: Employee can only cancel own requests
    if req.employee_id != employee_id:
        raise ForbiddenError("Solo puede cancelar sus propias solicitudes")

    # ✅ Status validation: Only Pendiente can be cancelled
    if req.status != "Pendiente":
        raise ValidationError("Solo se pueden cancelar solicitudes pendientes")

    req.status = "Cancelado"
    req.version += 1
    req.updated_at = datetime.now(UTC)

    session.add(req)
    session.commit()
    session.refresh(req)
    return _to_response(req, session)
```

**CRITICAL VALIDATIONS**:
- ✅ Line 202-203: RLS - Employee can only cancel own requests
- ✅ Line 205-206: Status check - Only Pendiente can be cancelled
- ✅ Line 199-200: Version check - Optimistic locking

---

## ✅ Security Checklist

| Check | Status | Location |
|-------|--------|----------|
| Authentication required | ✅ | `require_role_and_active` dependency |
| Role validation (Empleado) | ✅ | `require_role_and_active("Empleado")` |
| is_active check | ✅ | Backend dependency validates via DB query |
| RLS enforcement | ✅ | Service filters by emp_id from JWT |
| Balance validation | ✅ | `create_request()` raises BalanceExceededError |
| Status validation | ✅ | `cancel()` checks status == "Pendiente" |
| RLS for cancel | ✅ | `cancel()` verifies employee_id match |
| Tenant isolation | ✅ | All queries filter by tenant_id |
| Version/concurrency | ✅ | Optimistic locking on version field |
| No parameters bypass | ✅ | emp_id comes from JWT, not request |

---

## 📊 Test Scenarios

### Scenario 1: Happy Path (Sufficient Balance)
```
1. Employee has 25 days remaining
2. Requests 10 days (July 1-10)
3. Result: ✅ Request created, status=Pendiente
4. Balance: 25 - 0 = 25 remaining (not deducted until approved)
```

### Scenario 2: Insufficient Balance
```
1. Employee has 5 days remaining
2. Requests 10 days (July 1-10)
3. Result: ❌ BalanceExceededError
   "Saldo insuficiente. Días disponibles: 5"
4. Balance: Unchanged
```

### Scenario 3: Cross-Employee Attack (RLS)
```
1. Employee A logged in
2. Tries to cancel Employee B's request
3. Result: ❌ ForbiddenError
   "Solo puede cancelar sus propias solicitudes"
```

### Scenario 4: Cannot Cancel Approved
```
1. Request status = "Aprobado"
2. Employee tries to cancel
3. Result: ❌ ValidationError
   "Solo se pueden cancelar solicitudes pendientes"
```

---

## 🎯 Ready for Review

All **T033-T040** endpoints and services are implemented with:

- ✅ **3-layer security** (Frontend guard, Backend dependency, Service RLS)
- ✅ **Strict validation** (Balance checking, status validation)
- ✅ **RLS enforcement** (emp_id from JWT, no cross-access)
- ✅ **Error handling** (Appropriate HTTP status codes)
- ✅ **Tenant isolation** (All queries filtered)

**Next Phase (T041-T042)**: Frontend components (EmployeeVacationView + RequestForm)

**Approval needed before proceeding to frontend?**
