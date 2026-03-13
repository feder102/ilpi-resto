# Implementation Plan: Password Recovery

**Branch**: `007-password-recovery` | **Date**: 2026-03-11 | **Spec**: [Password Recovery Spec](./spec.md)
**Input**: Feature specification from `specs/007-password-recovery/spec.md`

## Summary

Users can securely recover forgotten passwords through a token-based reset flow. The system sends a time-limited reset link (24 hours) to the user's registered email, verifies token validity, and allows password reset with bcrypt hashing. Security hardening includes rate limiting (1 reset/10min, 5/day per email), token expiration, no token reuse, email enumeration protection, and full audit logging.

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5.8+ (frontend)
**Primary Dependencies**: FastAPI, SQLModel, python-jose[cryptography], passlib[bcrypt] (backend); React 19, Axios (frontend)
**Storage**: PostgreSQL 16
**Testing**: pytest (backend), Vitest (frontend)
**Target Platform**: Linux server (Docker-deployable)
**Project Type**: Web service (FastAPI backend) + SPA (React frontend)
**Performance Goals**: <200ms p95 for reset endpoints; <1s email delivery
**Constraints**: Secure token generation (os.urandom), no plaintext secrets in logs, TLS/SSL enforced
**Scale/Scope**: Single-tenant MVP (ILPI), supports 50 concurrent users, 500+ employees

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| **I. Clean Architecture** | Routers (HTTP only) → Services (logic) → Models (domain) | ✅ PASS | Password reset routes delegate to service layer for validation, token generation, and password hashing |
| **II. Strict Modularity** | Single responsibility, no circular deps, shared code in common/ | ✅ PASS | Separate modules: `password_reset_service.py`, `password_reset_router.py`, exceptions in `common/exceptions.py` |
| **III. Strict Type Safety** | Type hints + `mypy --strict`, Pydantic v2, no `any` types | ✅ PASS | All functions typed, Pydantic models for request/response, enum for PasswordResetStatus |
| **IV. Production-Ready** | Config from .env, no hardcoded secrets, structured logging, Alembic migrations | ✅ PASS | Email config from .env (SMTP_HOST, SMTP_USER, SMTP_PASS), token secrets generated with os.urandom, audit logging for reset events |
| **V. Security-First** | JWT validation, bcrypt hashing, RBAC at service layer, audit logging, rate limiting, TLS/SSL | ✅ PASS | bcrypt cost≥10, JWT verification on protected endpoints, rate limiting per email/IP, audit logging for all reset attempts |
| **VI. Error Handling** | DomainException hierarchy, structured error responses | ✅ PASS | InvalidResetTokenError, TokenExpiredError, RateLimitExceededError inherit from DomainException |
| **VII. Quality Gates** | `mypy --strict`, `ruff check`, `pytest`, `eslint` | ✅ PASS | All code must pass linting and type checks before merge |
| **VIII. Tenant-Aware** | `tenant_id` filtering on all queries | ✅ PASS | Password reset tokens scoped to tenant_id, no cross-tenant token reuse |
| **IX. Localization** | Spanish locale (es-ES), Europe/Madrid timezone | ✅ PASS | Error messages in Spanish, token expiration times in user's timezone |
| **X. Performance** | <200ms p95, indexed queries, pagination | ✅ PASS | Database index on (tenant_id, email) for reset requests, <100ms avg response time |

**VERDICT: ✅ ALL GATES PASSED** — Feature aligns with all 10 constitutional principles. No deviations needed.

## Project Structure

### Documentation (this feature)

```text
specs/007-password-recovery/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── password-reset-api.md
│   └── email-schema.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Web application: Backend (FastAPI) + Frontend (React SPA)

backend/
├── app/
│   ├── models/
│   │   └── password_reset_token.py    # PasswordResetToken SQLModel entity
│   ├── schemas/
│   │   └── password_reset.py          # Request/response DTOs (Pydantic)
│   ├── services/
│   │   └── password_reset_service.py  # Business logic (token generation, validation, reset)
│   ├── routers/
│   │   └── password_reset.py          # FastAPI endpoints (public: /forgot, verify; protected: /reset)
│   ├── common/
│   │   ├── exceptions.py              # InvalidResetTokenError, TokenExpiredError, RateLimitExceededError
│   │   ├── email_service.py           # SMTP email sending (shared utility)
│   │   └── security.py                # Token generation, hashing (shared utility)
│   └── main.py                        # FastAPI app initialization (register routers)
└── tests/
    ├── unit/
    │   ├── test_password_reset_service.py
    │   └── test_password_reset_router.py
    └── integration/
        └── test_password_reset_e2e.py  # Full flow: request → email → reset → login

frontend/
├── src/
│   ├── components/
│   │   └── password-reset/
│   │       ├── ForgotPasswordForm.tsx    # Email input + submit
│   │       ├── ResetTokenVerification.tsx # Token validation + message
│   │       ├── PasswordResetForm.tsx     # New password input + validation
│   │       └── ResetSuccess.tsx          # Success confirmation
│   ├── views/
│   │   └── PasswordReset.tsx             # Page-level container (routing + state)
│   ├── services/
│   │   └── passwordResetService.ts       # API client (POST /forgot, POST /reset)
│   ├── types/
│   │   └── passwordReset.ts              # TypeScript interfaces (PasswordResetRequest, etc)
│   └── App.tsx                           # Add /password-reset routes (public)
└── tests/
    ├── unit/
    │   ├── ForgotPasswordForm.test.tsx
    │   └── PasswordResetForm.test.tsx
    └── integration/
        └── passwordResetFlow.test.tsx
```

**Structure Decision**: Web application (Option 2). Backend provides REST API endpoints (`/auth/password-reset/*`), Frontend provides UI flows with reactive forms. Shared utilities (email, security) in `backend/app/common/` per Clean Architecture principle.

---

## Phase 0: Research & Unknowns

*Status*: ✅ **NO CLARIFICATIONS NEEDED** — All technical decisions resolved by prior features.

**Dependencies & Patterns**:
- Email delivery: Existing SMTP config (from prior features)
- Token generation: `python-jose` + `secrets` (os.urandom) for cryptographic randomness
- Password hashing: `passlib[bcrypt]` with cost≥10 (existing in project)
- Rate limiting: `slowapi` (existing in project)
- JWT verification: `python-jose[cryptography]` (existing in project)

**Technology Stack Confirmed**:
- **Email Service**: SMTP (configured via .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
- **Async Task Queue**: Deferred to post-MVP (sendgrid webhook or celery); MVP uses sync email in background thread
- **Token Storage**: PostgreSQL PasswordResetToken table with expiration index
- **Security**: bcrypt 4.0+, secrets module for token generation, TLS/SSL on SMTP

---

## Phase 1: Design & Contracts

### Data Model (`data-model.md`)

**New Entity: PasswordResetToken**
- `id` (UUID, primary key)
- `tenant_id` (UUID, FK to Tenant) — Multi-tenant scope
- `user_id` (UUID, FK to User) — Which user requested reset
- `token_hash` (VARCHAR 255) — Hashed token (never store plaintext)
- `expires_at` (TIMESTAMP) — 24-hour expiration
- `used_at` (TIMESTAMP, nullable) — When token was used (NULL = unused)
- `ip_address` (VARCHAR 45) — IPv4/IPv6 for audit
- `created_at` (TIMESTAMP)
- **Indexes**: (tenant_id, user_id, expires_at), (tenant_id, email, created_at)

**User Model Extension**:
- `last_password_reset_request_at` (TIMESTAMP, nullable) — For rate limiting (1 per 10 min)
- `password_reset_attempt_count` (INTEGER, default 0) — For daily rate limit (max 5/day)

**Audit Log Events**:
- `password_reset_requested` — User submitted email
- `password_reset_link_verified` — Token verified successfully
- `password_reset_failed` — Invalid/expired token
- `password_changed_via_reset` — New password set

---

### API Contracts (`contracts/password-reset-api.md`)

**Endpoint 1: Request Password Reset** (Public)
```
POST /auth/password-reset/request
Content-Type: application/json

Request:
{
  "email": "user@example.com"
}

Response: 200 OK
{
  "message": "Se ha enviado un enlace de recuperación a tu email",
  "expires_in_hours": 24
}

Response: 429 Too Many Requests (rate limited)
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Has excedido el límite de solicitudes. Intenta de nuevo en 10 minutos"
  }
}
```

**Endpoint 2: Verify & Reset Password** (Public)
```
POST /auth/password-reset/verify
Content-Type: application/json

Request:
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "new_password": "SecurePass123!"
}

Response: 200 OK
{
  "message": "Contraseña restablecida exitosamente. Inicia sesión con tu nueva contraseña"
}

Response: 400 Bad Request (invalid/expired token)
{
  "error": {
    "code": "INVALID_RESET_TOKEN",
    "message": "El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo."
  }
}
```

---

### Quickstart (`quickstart.md`)

**Backend Setup**:
```bash
# 1. Create migration for PasswordResetToken table
alembic revision --autogenerate -m "Add password reset token table"
alembic upgrade head

# 2. Create password_reset_service.py in backend/app/services/
# 3. Create password_reset_router.py in backend/app/routers/
# 4. Update backend/app/main.py to register router
# 5. Update backend/app/common/email_service.py to add password reset template

# 6. Run tests
pytest tests/integration/test_password_reset_e2e.py -v
```

**Frontend Setup**:
```bash
# 1. Create components in frontend/src/components/password-reset/
# 2. Create views in frontend/src/views/PasswordReset.tsx
# 3. Create service in frontend/src/services/passwordResetService.ts
# 4. Add types in frontend/src/types/passwordReset.ts
# 5. Update frontend/src/App.tsx to add /password-reset routes

# 6. Run tests
npm run test -- password-reset
```

---

## Next Steps

→ Run `/speckit.tasks` to generate dependency-ordered implementation tasks with acceptance criteria.
