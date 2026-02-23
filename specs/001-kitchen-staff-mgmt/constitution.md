# Project Constitution: Kitchen Staff Management MVP

**Feature**: `001-kitchen-staff-mgmt` | **Date**: 2026-02-22 | **Version**: 1.0

## Project Principles

This constitution establishes the non-negotiable architectural and delivery principles for the ILPI Kitchen Staff Management MVP.

### I. Clean Architecture

- **Dependency Direction**: Dependencies point **inward** — routers depend on services, services depend on models, models are self-contained.
- **Separation of Concerns**: 
  - **Routers** handle HTTP concerns only (request serialization, response formatting, role checks)
  - **Services** own all business logic (validation, state mutations, domain rules)
  - **Models** are pure domain entities with zero infrastructure coupling
- **No Infrastructure Leakage**: Database queries never appear in routers or frontend components. All data access goes through services.

### II. Strict Modularity

- **Single Responsibility**: Each file has exactly one reason to change.
- **No Circular Dependencies**: Dependency graph must be a DAG (directed acyclic).
- **Shared Code in `common/`**: Utilities, exceptions, schemas, security utilities belong in `backend/app/common/` or `frontend/src/common/`.
- **Model Aggregation**: `backend/app/models/__init__.py` re-exports all models for Alembic metadata discovery.

### III. Strict Type Safety

- **Backend**: 
  - All function signatures include type hints.
  - Pydantic v2 models for all DTOs.
  - `mypy --strict` must pass with zero errors.
  - Enums for categorical fields (Role, Department, Status, Gender, MaritalStatus, VacationStatus).
- **Frontend**: 
  - TypeScript strict mode enabled.
  - All state in context/hooks/Redux must be typed.
  - No `any` types without documented justification.

### IV. Production-Ready Deployment

- **Configuration**: All environment-specific values come from `.env` files read via pydantic-settings (backend) or vite import.meta.env (frontend).
- **Zero Hardcoded Secrets**: No API keys, database URLs, or JWT secrets in source code.
- **Structured JSON Logging**: All server logs are JSON-formatted with timestamp, level, module, message, and context (user_id, tenant_id, action).
- **Database Migrations**: All schema changes go through Alembic migrations. No manual SQL. Migrations are version-controlled and reversible.
- **Seed Data**: Tenant and default admin user created via `backend/app/seed.py`, not hardcoded in migrations.

### V. Security-First

#### Authentication & Authorization
- **JWT Tokens**: 
  - Access token: 30-minute expiration
  - Refresh token: 7-day expiration, stored in HttpOnly secure cookie
  - Payload: `{sub: user_id, tenant_id, role, exp, iat}`
- **Password Security**: Hashed with bcrypt (cost factor ≥10). Never stored in plaintext.
- **Role-Based Access Control (RBAC)**:
  - Admin: Full access to all operations
  - Moderador: All access except Configuración, no employee delete
  - Empleado: Own profile, own shifts, own vacation requests only
  - Role checks enforced at service layer (not just frontend)

#### Data Protection in Transit
- **TLS/SSL**: All API communication encrypted with HTTPS (enforced via security headers).
- **CORS**: Explicit origin whitelist, no wildcard `*`.
- **Rate Limiting**: 10 req/min on `/auth/login`, 100 req/min on other endpoints (via slowapi).

#### Security Headers (MVP)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'self'`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

#### Post-MVP Security Deferral
**For acceleration of MVP timeline, the following are deferred to a post-MVP security phase:**
- **At-Rest PII Encryption**: Employee records, vacation requests, and other sensitive personal data are currently stored unencrypted in PostgreSQL. Column-level encryption (e.g., via pgcrypto or client-side envelope encryption) is deferred post-MVP.
- **Strict CSRF Mitigations (except /auth/refresh)**: CSRF tokens are **not** enforced on mutation endpoints (`POST`, `PUT`, `DELETE`) in MVP. The `/auth/refresh` endpoint is exempt from this deferral and MUST enforce CSRF-safe cookie handling (HttpOnly, SameSite=Strict). Full CSRF double-submit or token-based mitigation is deferred post-MVP.
- **At-Rest Encryption Rationale**: Adds database complexity (key management, performance overhead) without immediate operational value for single-tenant MVP in controlled environment.
- **CSRF Deferral Rationale**: MVP assumes secure, authenticated SPA frontend deployed on same origin. Post-MVP will add explicit CSRF tokens and enforce SameSite=Strict on all cookies.

#### Audit Logging
- **Security-Relevant Events**: All login attempts, authorization failures, employee CRUD operations, vacation approvals, and admin configuration changes are logged.
- **Log Format**: `{timestamp, level, module, event_type, actor_id, target_resource, action, result, details, tenant_id}`
- **Retention**: Logs retained for 90 days (configurable).
- **No PII in Logs**: Employee names, emails, DNI values never logged in plaintext.

#### Tenant Isolation
- **Mandatory `tenant_id` Filter**: Every database query filters by `tenant_id` extracted from JWT. Client-provided tenant IDs are never trusted.
- **Unique Constraints per Tenant**: DNI and email uniqueness scoped to `(tenant_id, dni)` and `(tenant_id, email)` — same DNI allowed across tenants.

### VI. Structured Error Handling

#### Exception Hierarchy
All exceptions inherit from `DomainException` and include:
- **Error Code** (string): Machine-readable identifier (e.g., `NOT_FOUND`, `DUPLICATE_EMAIL`, `INSUFFICIENT_BALANCE`)
- **HTTP Status**: Automatically mapped to correct HTTP code (404, 409, 400, 401, 403, etc.)
- **Message**: Human-readable (Spanish or English per locale)
- **Details**: Optional context object for structured debugging

#### API Error Response Format
All errors returned as:
```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Saldo insuficiente. Días disponibles: 5",
    "details": {
      "employee_id": "uuid",
      "required_days": 10,
      "available_days": 5
    }
  }
}
```

#### No Stack Traces in Production
- Stack traces logged to server logs (JSON format) for debugging
- API responses to clients contain only error code and message, never stack traces

### VII. Quality Gates

#### Type Checking
- **Backend**: `mypy --strict backend/` passes with zero errors
- **Frontend**: `tsc --noEmit` passes with zero errors

#### Linting
- **Backend**: `ruff check backend/` passes (PEP 8 + modern Python conventions)
- **Frontend**: `eslint src/` passes (TypeScript strict rules)

#### Testing
- **Backend**: `pytest backend/tests/` passes; target ≥80% coverage on services and models
- **Frontend**: `vitest run` passes; target ≥60% coverage on hooks and context

#### Security Scanning
- **Backend**: `safety check` passes (no known vulnerabilities in dependencies)
- **Frontend**: `npm audit` passes (no critical vulnerabilities)

#### Commit Hook
- Pre-commit: Runs linters, type checks, and tests before allowing commit
- Prevents pushing broken code

### VIII. Tenant-Aware Design

- **Single Tenant in MVP**: Deployed for ILPI (Villa Joyosa, Alicante) only.
- **Multi-Tenant Ready**: All entities include `tenant_id` foreign key and queries filter by tenant.
- **Future Expansion**: Full multi-tenant onboarding (tenant signup, billing, per-tenant settings) deferred to Phase 2.

### IX. Localization & Timezone

- **Locale**: All UI and business logic operate in Spanish (es-ES).
- **Timezone**: Europe/Madrid (CET/CEST) — hardcoded in config for MVP, configurable per tenant post-MVP.
- **Date Formatting**: Calendar days (días naturales) — includes weekends and holidays in vacation counting.

### X. Performance & Scalability

#### Response Time Targets (p95)
- API endpoints: <200ms
- Page load: <3s
- Search/filter: <500ms

#### Load Targets
- Support ≥50 concurrent authenticated users
- Support ≥500 employees in dataset
- Support ≥1000 shift records per month

#### Optimization Strategies
- Database indexes on frequently queried columns (employee by tenant+email, shifts by tenant+date)
- Pagination on all list endpoints (default page_size=20, max 100)
- Query result caching (in-memory for <1min; deferred to Redis post-MVP)
- Frontend code splitting by route (Vite lazy-loading)

---

## Decision Records

### DR-001: JWT in Cookie vs. Authorization Header

**Decision**: Refresh token stored in **HttpOnly secure cookie**; access token in **Authorization header** (in-memory).

**Rationale**: 
- HttpOnly cookie prevents XSS token theft for refresh token (long-lived)
- Authorization header allows frontend fine-grained token rotation and logout (no cookie sync issues)
- SameSite=Strict mitigates CSRF for cookie

### DR-002: Soft Delete for Employees

**Decision**: Employee deletion sets `is_active=False` and `status=Inactivo`. Records remain in DB.

**Rationale**:
- Preserves audit trail and historical shift/vacation records
- Allows "undelete" and prevents data loss
- Maintains referential integrity

### DR-003: Calendar-Day Vacation Counting

**Decision**: Vacation days counted as calendar days (dias naturales), including weekends and holidays.

**Rationale**: Spanish labor standard (Art. 38 Estatuto de los Trabajadores). Simpler logic than business-day calculations.

### DR-004: Tenant ID Extraction

**Decision**: `tenant_id` extracted from JWT, never from request body or query params.

**Rationale**: Prevents tenant boundary violations; JWT is trusted (signed).

---

## Glossary

- **Admin**: Administrator role — full system access
- **Moderador**: Moderator role — all access except system configuration, no employee delete
- **Empleado**: Employee role — own profile, shifts, vacation requests only
- **Tenant**: Organization (restaurant) — MVP: ILPI (Villa Joyosa)
- **Team**: Rotation group within department (e.g., Cocina Mañana, Barra Tarde)
- **Shift**: Clock-in/clock-out record with timestamps and optional GPS
- **Vacation Request**: Leave request with status (Pendiente, Aprobado, Rechazado, Cancelado)
- **Vacation Balance**: Annual allocation per employee per year (default 30 days)
- **DNI**: Spanish national ID number (unique per tenant)

---

## Contact & Governance

**Project Lead**: Architecture team  
**Last Updated**: 2026-02-22  
**Next Review**: Post-MVP phase completion
