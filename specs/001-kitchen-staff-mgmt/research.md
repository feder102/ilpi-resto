# Research: Kitchen Staff Management MVP

**Branch**: `001-kitchen-staff-mgmt` | **Date**: 2026-02-22

## R1: JWT Authentication Strategy for FastAPI

**Decision**: Use `python-jose[cryptography]` for JWT encoding/decoding
with `passlib[bcrypt]` for password hashing. Implement access + refresh
token pattern.

**Rationale**: python-jose is the de-facto standard for JWT in FastAPI
projects. Access tokens (short-lived, 30 min) for API requests; refresh
tokens (long-lived, 7 days, stored in httpOnly cookie) for session
renewal. bcrypt is the gold standard for password hashing with
automatic salt generation.

**Alternatives considered**:
- PyJWT: Simpler but lacks JWK/JWS support needed for future key
  rotation.
- authlib: More complete OAuth2 suite but overkill for email/password
  auth in MVP.

**Token structure**:
```json
{
  "sub": "<user_id>",
  "tenant_id": "<tenant_id>",
  "role": "Admin|Moderador|Empleado",
  "exp": "<timestamp>",
  "iat": "<timestamp>"
}
```

## R2: SQLModel + Alembic Migration Strategy

**Decision**: Use SQLModel as ORM (combines SQLAlchemy + Pydantic).
Alembic for schema migrations with auto-generation.

**Rationale**: SQLModel provides type-safe models that serve as both
database entities and Pydantic schemas simultaneously, reducing
duplication. Alembic auto-generates migrations from model changes,
ensuring the schema never drifts from code.

**Alternatives considered**:
- Pure SQLAlchemy + separate Pydantic models: More flexible but doubles
  model definitions. Rejected for MVP simplicity.
- Tortoise ORM: Async-first but less mature ecosystem and weaker typing.

**Key decisions**:
- All models inherit from SQLModel with `table=True` for DB entities.
- Separate Pydantic schemas (in `schemas/`) for request/response DTOs
  that differ from DB shape.
- Composite unique constraints (tenant_id + dni, tenant_id + email) at
  the database level.

## R3: Tenant Isolation Strategy

**Decision**: Row-level tenant isolation via `tenant_id` foreign key on
all entities. Tenant resolution via JWT claim.

**Rationale**: Simplest multi-tenancy approach that requires no
infrastructure changes. Every query is automatically scoped by
`tenant_id` extracted from the authenticated user's JWT token. A
middleware injects the tenant context into each request.

**Alternatives considered**:
- Schema-per-tenant: Better isolation but requires dynamic schema
  creation/routing. Overkill for MVP with single tenant.
- Database-per-tenant: Maximum isolation but operational complexity.

**Implementation**:
- `TenantMixin` base class adds `tenant_id` to all models.
- `get_current_tenant()` dependency extracts tenant from JWT.
- All service methods receive tenant_id and filter queries accordingly.

## R4: Rate Limiting Strategy

**Decision**: Use `slowapi` (based on `limits`) with in-memory storage
for MVP. Key by IP + user ID.

**Rationale**: slowapi integrates directly with FastAPI's dependency
injection. In-memory storage is sufficient for single-server MVP
deployment. Limits: 100 req/min for authenticated endpoints, 10 req/min
for login/register.

**Alternatives considered**:
- Redis-backed rate limiting: Better for distributed deployments but
  adds infrastructure dependency. Deferred to post-MVP.
- Custom middleware: Reinventing the wheel unnecessarily.

## R5: Frontend State Management

**Decision**: React Query (@tanstack/react-query) for server state,
React Context for auth state. No global state library.

**Rationale**: React Query provides caching, background refetch,
optimistic updates, and automatic retry. Auth context holds the current
user/token. This eliminates the need for Redux/Zustand while keeping
server state synchronized.

**Alternatives considered**:
- Zustand: Lightweight but unnecessary when React Query handles server
  state.
- Redux Toolkit: Overkill for this scope.

## R6: Frontend QR Scanner Library

**Decision**: Use `html5-qrcode` (npm package) for QR code scanning.
MVP ships with simulated scanner (employee dropdown); real QR camera
scanning is pre-wired for future activation.

**Rationale**: html5-qrcode is maintained, supports multiple cameras,
works across mobile and desktop browsers, and provides both scan-from-
camera and scan-from-file. It's framework-agnostic (no React wrapper
needed, but `react-qr-reader` wraps it if preferred).

**Alternatives considered**:
- @yudiel/react-qr-scanner: React-specific, smaller community.
- zxing-js: More powerful but heavier bundle size.

**MVP approach**: Employee selector dropdown simulates QR scan. The
`AttendanceView` component includes the scanner UI shell with an
"Iniciar Escaneo" button. When real QR is enabled, the scanned value
maps to an employee ID.

## R7: Frontend Calendar/Rostering Library

**Decision**: Use `react-big-calendar` with `date-fns` localizer for
the vacation calendar view. For the rostering/team assignment view,
use `@dnd-kit/core` for drag-and-drop employee assignment.

**Rationale**: react-big-calendar is mature (1.5M+ weekly npm downloads),
supports month/week/day views, event rendering, and is locale-aware via
date-fns. Lighter bundle than FullCalendar and no commercial license
needed. @dnd-kit is lightweight, accessible, and framework-native for
React drag-and-drop (team member assignment).

**Alternatives considered**:
- @fullcalendar/react: More powerful but heavier bundle and commercial
  license for some features. Overkill for MVP.
- react-beautiful-dnd: Deprecated by Atlassian, replaced by Pragmatic
  drag and drop.
- Native HTML5 drag-and-drop: Poor accessibility, inconsistent mobile.

**MVP approach**: RotaryView uses @dnd-kit for dragging employees from
the available pool to team slots. VacationView's "Calendario Anual"
tab shows a basic react-big-calendar with vacation events color-coded
by status.

## R8: CORS and Security Headers

**Decision**: Explicit CORS configuration with allowed origins from
environment variable. Security headers via custom middleware.

**Configuration**:
- `CORS_ORIGINS`: Comma-separated list (e.g., `http://localhost:5173`
  for dev, production domain for prod).
- Security headers: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=31536000`,
  `Content-Security-Policy: default-src 'self'`,
  `Referrer-Policy: strict-origin-when-cross-origin`.

## R9: Structured Logging

**Decision**: Use `python-json-logger` with Python's standard `logging`
module. Log to stdout in JSON format.

**Log schema**:
```json
{
  "timestamp": "ISO-8601",
  "level": "INFO",
  "message": "...",
  "tenant_id": "...",
  "user_id": "...",
  "request_id": "...",
  "module": "...",
  "extra": {}
}
```

**Rationale**: JSON logs are machine-parseable for log aggregation
(ELK, CloudWatch, etc.). Request ID correlation enables distributed
tracing. PII fields (email, DNI) are never logged directly.
