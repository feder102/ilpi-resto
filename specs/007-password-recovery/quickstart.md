# Quickstart: Password Recovery Implementation

**Feature**: 007-password-recovery
**Date**: 2026-03-11
**Target**: 3-5 days implementation (backend + frontend + testing)

---

## Quick Overview

**What**: Password recovery for users who forget their login password
**How**: Email-based token reset (24-hour link, one-time use)
**Security**: Bcrypt password hashing, rate limiting, audit logging

**Key Files**:
- Backend: `backend/app/models/password_reset_token.py`, `backend/app/services/password_reset_service.py`, `backend/app/routers/password_reset_router.py`
- Frontend: `frontend/src/components/password-reset/`, `frontend/src/views/PasswordReset.tsx`
- Database: Migration adds `password_reset_tokens` table

---

## Phase 1: Backend Setup (1-2 days)

### Step 1: Create Database Migration

```bash
cd backend
alembic revision --autogenerate -m "Add password reset token table"
```

Verify generated migration in `alembic/versions/[timestamp]_add_password_reset_token_table.py`

Run migration:
```bash
alembic upgrade head
```

**File Checklist**:
- [ ] Migration creates `password_reset_tokens` table
- [ ] Migration adds columns to `user` table (last_password_reset_request_at, password_reset_attempt_count)
- [ ] All indexes created (tenant_user_active, tenant_hash, expires_at)
- [ ] `alembic upgrade head` succeeds

---

### Step 2: Create PasswordResetToken Model

**File**: `backend/app/models/password_reset_token.py`

```python
from sqlmodel import SQLModel, Field
from datetime import datetime
from uuid import UUID, uuid4

class PasswordResetToken(SQLModel, table=True):
    __tablename__ = "password_reset_tokens"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenant.id", index=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)
    token_hash: str = Field(max_length=255, index=True)
    expires_at: datetime = Field(index=True)
    used_at: datetime | None = Field(default=None)
    ip_address: str = Field(max_length=45)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
```

**Import in `backend/app/models/__init__.py`**:
```python
from .password_reset_token import PasswordResetToken
```

**File Checklist**:
- [ ] Model file created
- [ ] All fields typed correctly
- [ ] Foreign keys defined
- [ ] Imported in models/__init__.py (for Alembic)

---

### Step 3: Create Password Reset Schemas

**File**: `backend/app/schemas/password_reset.py`

```python
from pydantic import BaseModel, EmailStr
from datetime import datetime

class PasswordResetRequestSchema(BaseModel):
    email: EmailStr

class PasswordResetVerifySchema(BaseModel):
    token: str
    new_password: str

class PasswordResetRequestResponse(BaseModel):
    message: str
    expires_in_hours: int
    note: str

class PasswordResetVerifyResponse(BaseModel):
    message: str
    action: str
    redirect_url: str
    user: {
        id: str,
        email: EmailStr
    }
```

**File Checklist**:
- [ ] All schemas created with proper validation
- [ ] Field descriptions added
- [ ] Response schemas for all endpoints

---

### Step 4: Create Password Reset Service

**File**: `backend/app/services/password_reset_service.py`

Key methods:
- `request_password_reset(email: str, tenant_id: UUID, ip_address: str) -> None`
  - Validates email exists (but returns same response regardless)
  - Checks rate limiting (1/10min, 5/day per email)
  - Generates token with SHA256 hash
  - Stores PasswordResetToken in DB
  - Sends email asynchronously
  - Logs event to AuditLog

- `verify_and_reset_password(token: str, new_password: str, tenant_id: UUID) -> User`
  - Validates token hash against DB
  - Checks not expired (expires_at > now)
  - Checks not already used (used_at is null)
  - Validates password complexity (8+ chars, upper, lower, number, special)
  - Hashes new password with bcrypt (cost >= 10)
  - Updates User.password_hash
  - Marks token as used (used_at = now)
  - Invalidates other unused tokens for this user
  - Logs event to AuditLog
  - Returns updated User object

- `_generate_reset_token() -> tuple[str, str]`
  - Returns (plaintext_token, token_hash)

- `_send_reset_email(email: str, reset_link: str) -> None`
  - Uses `backend/app/common/email_service.py`

**Rate Limiting Logic**:
```python
def _check_rate_limit(user: User, ip_address: str) -> None:
    # Per-email: 1 request per 10 minutes
    if user.last_password_reset_request_at:
        elapsed = datetime.utcnow() - user.last_password_reset_request_at
        if elapsed < timedelta(minutes=10):
            raise RateLimitExceededError(
                f"Intenta de nuevo en {10 - int(elapsed.total_seconds()/60)} minutos"
            )

    # Per-email: 5 requests per day
    if user.password_reset_attempt_count >= 5:
        raise RateLimitExceededError("Límite diario de solicitudes excedido")
```

**File Checklist**:
- [ ] Service layer created
- [ ] All business logic implemented
- [ ] Rate limiting enforced
- [ ] Password validation (8+ chars, upper, lower, number, special)
- [ ] Bcrypt hashing (cost >= 10)
- [ ] Tenant filtering enforced
- [ ] Audit logging added

---

### Step 5: Create Exceptions

**File**: `backend/app/common/exceptions.py` (extend existing)

Add exceptions:
```python
class InvalidResetTokenError(DomainException):
    code = "INVALID_RESET_TOKEN"
    http_status = 400
    message = "El enlace de recuperación es inválido"

class TokenExpiredError(DomainException):
    code = "TOKEN_EXPIRED"
    http_status = 410
    message = "El enlace ha expirado"

class RateLimitExceededError(DomainException):
    code = "RATE_LIMIT_EXCEEDED"
    http_status = 429
    message = "Has excedido el límite de solicitudes"

class PasswordValidationError(DomainException):
    code = "PASSWORD_VALIDATION_FAILED"
    http_status = 422
    message = "La contraseña no cumple con los requisitos"
```

**File Checklist**:
- [ ] All exceptions created
- [ ] HTTP status codes correct
- [ ] Spanish messages

---

### Step 6: Create Router

**File**: `backend/app/routers/password_reset_router.py`

Endpoints:
- `POST /auth/password-reset/request` — Request reset link (public, rate-limited)
- `POST /auth/password-reset/verify` — Verify token + reset password (public, rate-limited)
- `GET /auth/password-reset/verify` — Check token validity (optional)

```python
from fastapi import APIRouter, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/auth/password-reset", tags=["password-reset"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/request", response_model=PasswordResetRequestResponse)
@limiter.limit("10/minute")
async def request_password_reset(request: Request, data: PasswordResetRequestSchema):
    # Service handles rate limiting, email sending, logging
    service.request_password_reset(
        email=data.email,
        tenant_id=...,  # From context/config
        ip_address=request.client.host
    )
    return PasswordResetRequestResponse(
        message="Se ha enviado un enlace...",
        expires_in_hours=24,
        note="Revisa tu bandeja..."
    )

@router.post("/verify", response_model=PasswordResetVerifyResponse)
@limiter.limit("5/minute")
async def verify_and_reset(request: Request, data: PasswordResetVerifySchema):
    user = service.verify_and_reset_password(
        token=data.token,
        new_password=data.new_password,
        tenant_id=...,
        ip_address=request.client.host
    )
    return PasswordResetVerifyResponse(
        message="Contraseña restablecida",
        action="redirect_to_login",
        redirect_url="/login",
        user={"id": str(user.id), "email": user.email}
    )
```

**File Checklist**:
- [ ] Router created
- [ ] All endpoints implemented
- [ ] Rate limiting applied (slowapi decorators)
- [ ] IP address extracted and passed to service
- [ ] Error handling (exceptions auto-mapped to HTTP responses)
- [ ] Response formatting matches contract

---

### Step 7: Register Router in Main App

**File**: `backend/app/main.py`

```python
from app.routers import password_reset_router

app.include_router(password_reset_router.router)
```

**File Checklist**:
- [ ] Router imported
- [ ] Router included in app

---

### Step 8: Update Email Service

**File**: `backend/app/common/email_service.py` (extend existing)

Add template for password reset email:
```python
def send_password_reset_email(email: str, reset_link: str) -> None:
    """Send password reset email with token link"""
    subject = "Restablecer contraseña - ILPI"
    body = f"""
    Hola,

    Has solicitado restablecer tu contraseña. Haz clic en el enlace a continuación:

    {reset_link}

    Este enlace es válido por 24 horas.

    Si no solicitaste este cambio, ignora este email.

    Saludos,
    ILPI
    """
    send_smtp(to=email, subject=subject, body=body)
```

**File Checklist**:
- [ ] Email template created
- [ ] Uses async (background thread or task queue)
- [ ] HTML + plain text versions

---

### Step 9: Backend Testing

**Files**: `backend/tests/unit/test_password_reset_service.py`, `backend/tests/integration/test_password_reset_e2e.py`

Unit tests (service layer):
- [ ] Rate limiting enforces 10-minute cooldown
- [ ] Rate limiting enforces 5-request daily cap
- [ ] Token generation creates valid 256-bit tokens
- [ ] Token hash verification succeeds with correct token
- [ ] Token hash verification fails with incorrect token
- [ ] Token expiration blocks usage after 24 hours
- [ ] Token reuse blocked (used_at prevents reuse)
- [ ] Password validation rejects <8 chars
- [ ] Password validation rejects missing uppercase
- [ ] Password validation rejects missing lowercase
- [ ] Password validation rejects missing number
- [ ] Password validation rejects missing special char
- [ ] Email enumeration: same response for registered + unregistered emails

Integration tests (end-to-end):
- [ ] User can request reset for registered email
- [ ] User receives email with valid link
- [ ] User clicks link, verifies token
- [ ] User submits valid new password
- [ ] Old password no longer works
- [ ] New password works for login

**Run Tests**:
```bash
pytest tests/unit/test_password_reset_service.py -v
pytest tests/integration/test_password_reset_e2e.py -v
```

---

## Phase 2: Frontend Setup (1.5-2 days)

### Step 1: Create Folder Structure

```bash
cd frontend
mkdir -p src/components/password-reset
mkdir -p src/types
```

---

### Step 2: Create TypeScript Types

**File**: `frontend/src/types/passwordReset.ts`

```typescript
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetVerifyRequest {
  token: string;
  new_password: string;
}

export interface PasswordResetResponse {
  message: string;
  expires_in_hours?: number;
  note?: string;
  action?: string;
  redirect_url?: string;
  user?: {
    id: string;
    email: string;
  };
}

export interface PasswordValidationRequirement {
  requirement: string;
  message: string;
  satisfied: boolean;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    retry_after_seconds?: number;
  };
}
```

**File Checklist**:
- [ ] All types defined with proper interfaces
- [ ] Error types included

---

### Step 3: Create API Service

**File**: `frontend/src/services/passwordResetService.ts`

```typescript
import axios from 'axios';
import { PasswordResetRequest, PasswordResetVerifyRequest, PasswordResetResponse } from '../types/passwordReset';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export const passwordResetService = {
  requestReset: async (email: string): Promise<PasswordResetResponse> => {
    const response = await axios.post(
      `${API_BASE}/auth/password-reset/request`,
      { email }
    );
    return response.data;
  },

  verifyAndReset: async (token: string, newPassword: string): Promise<PasswordResetResponse> => {
    const response = await axios.post(
      `${API_BASE}/auth/password-reset/verify`,
      { token, new_password: newPassword }
    );
    return response.data;
  },

  checkTokenValidity: async (token: string): Promise<{ valid: boolean }> => {
    try {
      const response = await axios.get(
        `${API_BASE}/auth/password-reset/verify`,
        { params: { token } }
      );
      return { valid: true };
    } catch {
      return { valid: false };
    }
  }
};
```

**File Checklist**:
- [ ] API client created
- [ ] All methods typed
- [ ] Error handling in place
- [ ] Env var for API base URL

---

### Step 4: Create Components

**File**: `frontend/src/components/password-reset/ForgotPasswordForm.tsx`

Component for requesting reset:
- [ ] Email input field
- [ ] Submit button
- [ ] Loading state
- [ ] Error display
- [ ] Success message (link redirect)
- [ ] Form validation (email format)

**File**: `frontend/src/components/password-reset/PasswordResetForm.tsx`

Component for setting new password:
- [ ] Token verification (load from URL param)
- [ ] New password input
- [ ] Password validation display (8+, upper, lower, number, special)
- [ ] Submit button
- [ ] Loading state
- [ ] Error display with details
- [ ] Success message + redirect

**File**: `frontend/src/components/password-reset/ResetSuccess.tsx`

Success confirmation:
- [ ] Confirmation message
- [ ] Redirect to login button
- [ ] Timer for auto-redirect (optional)

---

### Step 5: Create View Container

**File**: `frontend/src/views/PasswordReset.tsx`

Page-level component:
- [ ] Route parameter extraction (token from URL query string)
- [ ] State management (form state, loading, errors)
- [ ] Logic to show appropriate component (request form OR reset form based on token)
- [ ] Error boundary

```typescript
export default function PasswordReset() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');

  return (
    <div className="password-reset-container">
      {token ? (
        <PasswordResetForm token={token} />
      ) : (
        <ForgotPasswordForm />
      )}
    </div>
  );
}
```

**File Checklist**:
- [ ] View created
- [ ] Routing logic (token-based component selection)
- [ ] Error handling

---

### Step 6: Update App Routes

**File**: `frontend/src/App.tsx`

Add public route for password reset:

```typescript
import PasswordReset from './views/PasswordReset';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/password-reset" element={<PasswordReset />} />

        {/* Protected routes */}
        <Route element={<ProtectedLayout />}>
          {/* ... existing routes ... */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

**File Checklist**:
- [ ] Route added to App.tsx
- [ ] Public (no auth required)
- [ ] Accessible from /password-reset?token=... and /password-reset

---

### Step 7: Frontend Testing

**Files**: `frontend/src/components/password-reset/__tests__/`

Component tests:
- [ ] ForgotPasswordForm: Renders email input, submit button
- [ ] ForgotPasswordForm: Shows error on invalid email format
- [ ] ForgotPasswordForm: Shows loading state on submit
- [ ] ForgotPasswordForm: Shows success message + redirect on success
- [ ] PasswordResetForm: Validates token on mount (shows invalid message if bad)
- [ ] PasswordResetForm: Shows password validation requirements
- [ ] PasswordResetForm: Updates requirement indicators as user types
- [ ] PasswordResetForm: Disables submit until all requirements met
- [ ] PasswordResetForm: Shows error details from API

**Run Tests**:
```bash
npm run test -- password-reset
```

**File Checklist**:
- [ ] All component tests written
- [ ] Integration test for full flow
- [ ] Error scenarios tested

---

## Phase 3: Integration & QA (0.5-1 day)

### Backend QA Checklist
- [ ] Backend starts without errors: `uvicorn app.main:app --reload`
- [ ] API docs available: http://localhost:8000/docs
- [ ] All endpoints in Swagger
- [ ] Password reset endpoints functional
- [ ] Rate limiting works
- [ ] Email delivery works (check logs/test inbox)
- [ ] Database migrations applied correctly
- [ ] Audit logs recorded for all events

### Frontend QA Checklist
- [ ] Frontend starts without errors: `npm run dev`
- [ ] Password reset page accessible at /password-reset
- [ ] Email form displays, submits correctly
- [ ] Email validation works
- [ ] Password reset form displays with token
- [ ] Password requirements shown/updated
- [ ] Reset submission works
- [ ] Redirect to login after reset
- [ ] Login with new password works

### End-to-End QA
1. [ ] Open frontend at http://localhost:5173
2. [ ] Go to login page, click "Forgot Password"
3. [ ] Enter registered email, submit
4. [ ] Check terminal/logs for email (or use mailhog if configured)
5. [ ] Click reset link from email
6. [ ] Enter new password, submit
7. [ ] Redirect to login
8. [ ] Log in with new password
9. [ ] Verify login succeeds

### Type Checking & Linting
```bash
# Backend
cd backend
mypy app --strict
ruff check .

# Frontend
cd ../frontend
tsc --noEmit
npm run lint
```

**Checklist**:
- [ ] `mypy --strict` passes (0 errors)
- [ ] `ruff check` passes (0 errors)
- [ ] `tsc --noEmit` passes (0 errors)
- [ ] `npm run lint` passes (0 errors)

---

## Deployment Checklist

Before merging to main:

### Code Quality
- [ ] All unit tests pass (`pytest`)
- [ ] All integration tests pass
- [ ] Type checking passes (mypy + tsc)
- [ ] Linting passes (ruff + eslint)
- [ ] No console errors/warnings
- [ ] Code review completed

### Security
- [ ] No plaintext tokens in logs
- [ ] Passwords hashed with bcrypt (cost >= 10)
- [ ] Rate limiting enforced
- [ ] SMTP credentials in .env (not hardcoded)
- [ ] HTTPS enforced (security headers present)
- [ ] Email enumeration prevented (same response for all emails)
- [ ] Audit logging for all reset attempts

### Documentation
- [ ] README.md updated with password reset feature
- [ ] API docs generated (FastAPI /docs)
- [ ] Quickstart.md in specs folder (this file)
- [ ] Data model documented

### Deployment
- [ ] Docker images build without errors
- [ ] Environment variables documented (.env.example)
- [ ] Database migrations run on deploy
- [ ] Email service configured (SMTP env vars)
- [ ] Logs appear in correct format (JSON)

---

## Common Troubleshooting

### Email not sending
- Check SMTP config in .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
- Check logs for email service errors
- Test SMTP connection: `telnet {SMTP_HOST} {SMTP_PORT}`

### Rate limiting blocking legitimate users
- Check User.last_password_reset_request_at in DB
- Clear if needed: `UPDATE user SET last_password_reset_request_at = NULL`

### Token validation failing
- Check token_hash matches in password_reset_token table
- Verify token hasn't been used (used_at is NULL)
- Verify token hasn't expired (expires_at > now)

### Password validation too strict
- Adjust regex in `password_reset_service.py` (currently requires all 5: length, upper, lower, number, special)

---

## Maintenance (Post-Deploy)

### Cleanup
- Add cron job to delete expired tokens (older than 24 hours, used or unused)
  ```sql
  DELETE FROM password_reset_tokens WHERE expires_at < NOW();
  ```

### Monitoring
- Track password reset request count (should be <5% of login volume)
- Monitor email delivery success rate (should be >95%)
- Alert if rate limiting triggered >100 times/day (indicates attack)

### Future Enhancements (Post-MVP)
- SMS-based password reset (optional secondary channel)
- Async email queue (Celery + Redis)
- Password reset history/audit trail
- Multi-language support (currently Spanish only)
- Biometric password reset (fingerprint recovery)
