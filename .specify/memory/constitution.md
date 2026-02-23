<!--
  Sync Impact Report
  ==================
  Version change: 1.0.0 → 1.1.0

  Added sections:
    - MVP Deferrals (D1: PII at-rest encryption, D2: CSRF token enforcement)

  Rationale: Deferrals explicitly scoped to MVP with remediation plans.
  Both deferrals include compensating controls and clear pre-production gates.

  Templates requiring updates: None (deferrals are additive, no template impact)
  Follow-up TODOs: Track D1 and D2 as issues before production launch
-->

# ILPI Constitution

## Core Principles

### I. Clean Architecture

All code MUST follow Clean Architecture principles. Dependencies MUST
point inward: external layers (frameworks, drivers, UI) depend on
internal layers (use cases, entities), never the reverse.

- **Domain layer** (entities, value objects) MUST have zero external
  dependencies.
- **Use case layer** (application services) MUST depend only on domain
  abstractions, never on infrastructure details.
- **Infrastructure layer** (databases, HTTP, third-party SDKs) MUST
  implement interfaces defined by inner layers.
- **Dependency Inversion**: all cross-layer communication MUST happen
  through abstractions (interfaces/protocols), never concrete
  implementations.

**Rationale**: Isolating business logic from infrastructure enables
independent testing, framework migration, and long-term maintainability.

### II. Strict Modularity & Separation of Responsibilities

The system MUST enforce a clear, layered separation at the code level:

- **Routers**: HTTP/transport layer only. Route definitions, request
  parsing, and response serialization. No business logic.
- **Controllers / Services**: Business logic orchestration. Each service
  MUST have a single, well-defined responsibility.
- **Models**: Domain entities and data transfer objects. No side effects,
  no infrastructure coupling.

Additional rules:
- Each module MUST be independently deployable or replaceable without
  cascading changes.
- Circular dependencies between modules are FORBIDDEN.
- Shared utilities MUST live in a dedicated `common/` or `shared/`
  package with explicit public APIs.

**Rationale**: Strict separation reduces coupling, enables parallel
development, and makes the system horizontally scalable.

### III. Strict Type Safety

All code MUST use explicit type annotations (type hints) throughout:

- Every function signature MUST include parameter types and return types.
- All data models MUST use typed schemas (e.g., Pydantic, dataclasses
  with type annotations, TypedDict).
- `Any` type usage is FORBIDDEN except when interfacing with untyped
  third-party libraries, and MUST be isolated behind typed wrappers.
- Type checking tools (mypy, pyright, or language equivalent) MUST pass
  with strict mode enabled and zero errors.

**Rationale**: Static type safety catches entire categories of bugs at
development time and serves as living documentation of contracts.

### IV. Production-Ready Code Quality

All generated and committed code MUST meet production standards:

- No TODO/FIXME/HACK comments in merged code unless tracked by an issue.
- All public APIs MUST have docstrings describing behavior, parameters,
  return values, and raised exceptions.
- Logging MUST use structured format (JSON) with appropriate log levels
  (DEBUG, INFO, WARNING, ERROR, CRITICAL).
- Configuration MUST be externalized via environment variables or config
  files; no hardcoded secrets or magic strings.
- Database operations MUST use migrations; schema changes MUST never be
  applied ad-hoc.

**Rationale**: Production-ready code eliminates the "we'll fix it later"
debt cycle and ensures deployability at any commit.

### V. Security-First

Security is NON-NEGOTIABLE and MUST be addressed at every layer:

- **Authentication**: All endpoints (except explicitly public ones) MUST
  require authentication. Tokens MUST have expiration and rotation
  policies.
- **Authorization**: Role-based or attribute-based access control MUST
  be enforced at the service layer, not only at the router level.
- **Input Validation**: ALL external input MUST be validated and
  sanitized before processing. No raw user input MUST reach database
  queries or system commands.
- **SQL Injection**: Parameterized queries or ORM-only access MUST be
  used. Raw SQL string concatenation is FORBIDDEN.
- **XSS/CSRF**: Output encoding MUST be applied. CSRF tokens MUST be
  required for state-changing operations in web contexts.
- **Secrets Management**: Secrets MUST NEVER appear in source code,
  logs, or error messages. Use environment variables or a secrets
  manager.
- **Dependencies**: All dependencies MUST be pinned to exact versions.
  Known vulnerabilities MUST be scanned in CI (e.g., `safety`,
  `npm audit`, `cargo audit`).
- **HTTPS/TLS**: All external communication MUST use TLS 1.2+.
- **Rate Limiting**: Public-facing endpoints MUST implement rate
  limiting.
- **CORS**: Cross-origin policies MUST be explicitly configured; wildcard
  `*` origins are FORBIDDEN in production.

**Rationale**: A single vulnerability can compromise the entire system.
Defense-in-depth across all layers is the only acceptable posture.

### VI. Structured Error Handling & Validation

All errors MUST be handled explicitly and consistently:

- Business logic MUST use domain-specific exception hierarchies, not
  generic exceptions.
- API responses MUST follow a consistent error schema with error code,
  human-readable message, and optional details field.
- Validation errors MUST return structured feedback identifying every
  invalid field and the reason for rejection.
- Unhandled exceptions MUST be caught by a global error handler that
  logs the full stack trace and returns a safe, non-leaking response
  to the client.
- Sensitive information (stack traces, internal paths, SQL queries)
  MUST NEVER be exposed in client-facing error responses.
- Every external service call MUST include timeout configuration,
  retry logic with exponential backoff, and circuit-breaker patterns
  where appropriate.

**Rationale**: Structured error handling prevents information leakage,
improves debuggability, and delivers a consistent developer/user
experience.

## Security Requirements

The following security controls are MANDATORY for all features:

1. **OWASP Top 10 Compliance**: Every feature MUST be reviewed against
   the current OWASP Top 10 before merging.
2. **Principle of Least Privilege**: Services and users MUST have the
   minimum permissions required.
3. **Audit Logging**: Security-relevant events (login, access denied,
   data modification) MUST be logged with timestamp, actor, action,
   and target resource.
4. **Data Protection**: Personally identifiable information (PII) MUST
   be encrypted at rest and in transit. Sensitive fields MUST be
   masked in logs.
5. **Session Management**: Sessions MUST have configurable timeouts.
   Concurrent session limits MUST be enforced where applicable.
6. **Security Headers**: HTTP responses MUST include security headers
   (Content-Security-Policy, X-Content-Type-Options, X-Frame-Options,
   Strict-Transport-Security).

## Development Workflow & Quality Gates

All code changes MUST pass through these gates before merging:

1. **Type Check Gate**: Static type analysis MUST pass with zero errors
   in strict mode.
2. **Lint Gate**: Code MUST pass linting with the project's configured
   ruleset (no warnings suppressed without justification).
3. **Test Gate**: All existing tests MUST pass. New features MUST
   include corresponding tests.
4. **Security Scan Gate**: Dependency vulnerability scanning MUST report
   zero critical/high findings.
5. **Code Review**: At least one reviewer MUST approve changes. Reviewer
   MUST verify compliance with this constitution.
6. **Architecture Review**: Changes introducing new modules or external
   dependencies MUST be reviewed for Clean Architecture compliance.

## Governance

This constitution is the supreme authority for all architectural and
coding decisions in the ILPI project. In case of conflict between this
document and any other practice, this constitution prevails.

**Amendment Procedure**:
1. Proposed amendments MUST be documented with rationale.
2. Amendments MUST be reviewed and approved before adoption.
3. A migration plan MUST accompany any amendment that affects existing
   code.
4. Version MUST be incremented per semantic versioning rules:
   - MAJOR: Backward-incompatible principle removals or redefinitions.
   - MINOR: New principles added or existing guidance materially
     expanded.
   - PATCH: Clarifications, wording fixes, non-semantic refinements.

**Compliance Review**:
- All pull requests MUST verify compliance with constitution principles.
- Complexity deviations MUST be justified in the plan's Complexity
  Tracking table.
- Periodic constitution reviews SHOULD occur quarterly to ensure
  relevance.

## MVP Deferrals

The following constitution requirements are **explicitly deferred** to a
post-MVP phase. Each deferral is justified below and MUST be addressed
before the first production deployment with real user data.

### Deferral D1: PII Encryption at Rest (Security Req 4, partial)

**Deferred requirement**: "PII MUST be encrypted at rest."

**Scope of deferral**: Field-level or disk-level encryption of PII
columns (DNI, email, address, phone) in PostgreSQL is deferred. PII
encryption **in transit** (TLS) remains MANDATORY and is NOT deferred.

**Justification**: MVP deploys on a single controlled server with
restricted database access. The risk surface for at-rest data exposure
is low. Adding pgcrypto or TDE at this stage adds migration complexity
and slows development without proportional risk reduction for the
controlled MVP environment.

**Remediation plan**: Before production launch with real employee data,
implement PostgreSQL TDE or field-level encryption via pgcrypto for all
PII columns. Track via issue.

### Deferral D2: CSRF Token Enforcement (Principle V, partial)

**Deferred requirement**: "CSRF tokens MUST be required for state-
changing operations in web contexts."

**Scope of deferral**: Explicit CSRF token validation is deferred. The
following mitigations are applied instead:
- All state-changing API endpoints use `Authorization: Bearer` header
  (not cookies), making them immune to CSRF by design.
- The refresh token cookie MUST use `SameSite=Strict` and `Secure`
  flags, which provides browser-level CSRF protection for the only
  cookie-based endpoint (`/auth/refresh`).
- CORS is explicitly configured with no wildcard origins.

**Justification**: The combination of Bearer tokens for all mutations +
SameSite=Strict on the single cookie endpoint provides defense-in-depth
equivalent to explicit CSRF tokens for the MVP threat model. Full CSRF
token rotation adds implementation complexity disproportionate to the
residual risk.

**Remediation plan**: If the application adds cookie-based
authentication or server-rendered forms in the future, explicit CSRF
tokens MUST be implemented at that time.

**Version**: 1.1.0 | **Ratified**: 2026-02-22 | **Last Amended**: 2026-02-22
