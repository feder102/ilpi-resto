# Research & Design Decisions: Password Recovery

**Feature**: 007-password-recovery
**Date**: 2026-03-11
**Status**: Research Complete

## Decision Matrix

### Email Delivery Architecture

**Decision**: Synchronous SMTP in background thread (MVP) → Async queue post-MVP

**Rationale**:
- MVP prioritizes speed (no new infrastructure)
- Existing SMTP config in .env works without dependency changes
- Background thread keeps request non-blocking
- Post-MVP: Migrate to Celery/Redis for distributed task queue

**Alternatives Considered**:
1. **SendGrid/Mailgun API**: Requires new account, API key, external dependency → rejected for MVP simplicity
2. **Async Celery queue**: Adds Redis/RabbitMQ infrastructure → deferred post-MVP
3. **Synchronous SMTP**: Blocks request → acceptable for single-tenant MVP, but use thread pool to avoid blocking

**Implementation**:
```python
# backend/app/common/email_service.py
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=3)

def send_password_reset_email(email: str, reset_link: str) -> None:
    """Send async without blocking request"""
    executor.submit(_send_smtp, email, reset_link)
```

---

### Token Generation & Storage

**Decision**: Hash tokens before storage; never store plaintext

**Rationale**:
- If database is compromised, attackers can't directly use stolen tokens
- Matches JWT security pattern (tokens are hashed/signed before DB storage)
- Prevents accidental plaintext leaks in logs

**Alternatives Considered**:
1. **Store plaintext tokens**: Simpler, but catastrophic if DB breached → REJECTED
2. **Use JWT with long expiration**: Can't revoke mid-flow if user resets password again → use database tokens instead
3. **Hash with bcrypt**: Overkill for one-time tokens → use SHA256 instead

**Implementation**:
```python
# Generate: Create random token, hash it
from secrets import token_urlsafe
import hashlib

plaintext_token = token_urlsafe(32)  # 256-bit entropy
token_hash = hashlib.sha256(plaintext_token.encode()).hexdigest()

# Store: Hash only
reset_token_db = PasswordResetToken(
    token_hash=token_hash,  # Store this
    user_id=user.id,
    expires_at=now + timedelta(hours=24)
)

# API Response: Send plaintext in link (one-time use)
reset_link = f"https://app.local/password-reset?token={plaintext_token}"
```

---

### Rate Limiting Strategy

**Decision**: Two-tier rate limiting (per-email + per-IP)

**Rationale**:
- Per-email: Prevents a user's email from being flooded (max 5/day, 1/10min) → UX protection
- Per-IP: Prevents brute-force enumeration attacks (max 10/minute from same IP) → security
- Slowapi integration with existing Redis (post-MVP) for distributed rate limiting

**Alternatives Considered**:
1. **Per-email only**: Easy but doesn't defend against distributed attacks → REJECTED
2. **Per-IP only**: May false-positive legitimate users behind VPN/corporate proxy → REJECTED
3. **Per-user-agent**: Too noisy → REJECTED

**Implementation**:
```python
# Backend rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Per-IP: 10 requests per minute to /request endpoint
@router.post("/request")
@limiter.limit("10/minute")
async def request_password_reset(email: str):
    # Also check per-email in service
    service.request_password_reset(email)
```

---

### Email Enumeration Protection

**Decision**: Always return success message, regardless of email existence

**Rationale**:
- Prevents attackers from determining which emails are registered
- Standard security practice (OWASP)
- Logging captures actual results for fraud detection

**Alternatives Considered**:
1. **Return error if email not found**: Simple but leaks user data → REJECTED
2. **Return different delay times**: May be reversed via timing attacks → REJECTED

**Implementation**:
```python
# Always return success, but log reality
@router.post("/request")
async def request_password_reset(request: PasswordResetRequest):
    user = db.query(User).filter(User.email == request.email).first()

    if user:
        # Send reset email
        _send_reset_email(user.email, generate_token(user.id))
        logger.info(f"Password reset requested for user {user.id}")
    else:
        # Log attempt on non-existent email
        logger.warning(f"Password reset requested for unknown email {request.email}")

    # Return same response both cases
    return {"message": "Se ha enviado un enlace a tu email"}
```

---

### Token Expiration Time

**Decision**: 24 hours

**Rationale**:
- Long enough for user to check email + reset password (typically <1 hour behavior)
- Short enough to limit security window if token is leaked
- Matches common patterns (most platforms use 24-48 hours)
- Allows overnight use (user requests Friday PM, uses Saturday AM)

**Alternatives Considered**:
1. **15 minutes**: Too short, users miss email or forget to act → REJECTED
2. **1 hour**: Reasonable but doesn't account for overnight use → REJECTED
3. **7 days**: Too long, increases security risk → REJECTED

**Implementation**:
```python
# Reset token expires 24 hours after creation
RESET_TOKEN_EXPIRATION_HOURS = 24

reset_token = PasswordResetToken(
    user_id=user.id,
    expires_at=now + timedelta(hours=RESET_TOKEN_EXPIRATION_HOURS)
)
```

---

### Password Validation Rules

**Decision**: 8+ chars, uppercase, lowercase, number, special char

**Rationale**:
- NIST recommendations + common industry standard
- Balances security (complexity) with usability (not overly restrictive)
- Consistent with user registration rules (CLAUDE.md security requirements)
- Prevents common weak passwords

**Alternatives Considered**:
1. **No requirements**: Weak passwords → REJECTED
2. **Only length (12+ chars)**: Users may choose predictable patterns → REJECTED
3. **Allow passphrase instead**: More usable but harder to validate in UI → deferred post-MVP

**Implementation**:
```python
import re

def validate_password(password: str) -> None:
    if len(password) < 8:
        raise ValueError("Mínimo 8 caracteres")
    if not re.search(r'[A-Z]', password):
        raise ValueError("Requiere al menos una mayúscula")
    if not re.search(r'[a-z]', password):
        raise ValueError("Requiere al menos una minúscula")
    if not re.search(r'[0-9]', password):
        raise ValueError("Requiere al menos un número")
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValueError("Requiere al menos un carácter especial")
```

---

### Tenant Isolation

**Decision**: Filter all queries by `tenant_id` extracted from JWT

**Rationale**:
- Prevents cross-tenant token reuse or password reset
- Consistent with project architecture (CLAUDE.md)
- Database-level enforcement via foreign keys

**Implementation**:
```python
# Extract tenant_id from JWT (already done by FastAPI dependency)
@router.post("/verify")
async def verify_and_reset(
    token: str,
    new_password: str,
    current_user: User = Depends(get_current_user)  # Has tenant_id
):
    # Service checks tenant_id
    service.verify_and_reset_password(
        token=token,
        new_password=new_password,
        tenant_id=current_user.tenant_id,  # Enforced
        user_id=current_user.id
    )
```

---

### Audit Logging

**Decision**: Log all reset attempts (success + failure) with user IP, timestamp, result

**Rationale**:
- Detects brute force attacks post-mortem
- Supports compliance audits
- Helps diagnose user issues (email not received, token expired, etc.)

**Alternatives Considered**:
1. **No logging**: Impossible to audit or debug → REJECTED
2. **Log only success**: Misses attack patterns → REJECTED

**Implementation**:
```python
# Log structure (JSON)
{
  "timestamp": "2026-03-11T10:30:45.123Z",
  "level": "INFO",
  "module": "password_reset_service",
  "event_type": "password_reset_requested",
  "actor_email": "user@example.com",
  "action": "request",
  "result": "success",
  "ip_address": "203.0.113.42",
  "tenant_id": "uuid-abc123",
  "details": {
    "user_id": "uuid-xyz789"
  }
}
```

---

## Technology Validation

| Tech | Version | Status | Notes |
|------|---------|--------|-------|
| Python | 3.12 | ✅ Current | Stable, typed |
| FastAPI | Latest | ✅ Current | Async-ready, built-in dependency injection |
| SQLModel | Latest | ✅ Current | SQLAlchemy + Pydantic integration |
| Passlib[bcrypt] | 1.7+ | ✅ Current | Industry-standard hashing |
| python-jose[crypto] | 3.3+ | ✅ Current | JWT generation + verification |
| Slowapi | Latest | ✅ Current | Rate limiting (existing in project) |
| PostgreSQL | 16 | ✅ Current | Multi-tenancy support via indexes |
| Pytest | Latest | ✅ Current | Unit + integration testing |
| TypeScript | 5.8+ | ✅ Current | Strict mode enforced |
| React | 19 | ✅ Current | Hooks + Context for forms |
| Axios | Latest | ✅ Current | API client (existing in project) |
| Vitest | Latest | ✅ Current | Component testing |

---

## Security Validation Checklist

- ✅ Tokens hashed before storage (no plaintext)
- ✅ Token expiration enforced (24 hours)
- ✅ No token reuse (used_at checked, then updated)
- ✅ Email enumeration protected (same response for all emails)
- ✅ Rate limiting (per-email + per-IP)
- ✅ Password hashing (bcrypt cost≥10)
- ✅ Tenant isolation (JWT-derived tenant_id)
- ✅ Audit logging (all attempts logged)
- ✅ TLS/SSL enforced (HTTPS only)
- ✅ SMTP credentials in .env (no hardcoding)

---

## Open Questions (Resolved)

1. **Should we send password reset email immediately or queue it?**
   - ✅ **Resolved**: Background thread (sync SMTP in executor) for MVP, migrate to Celery post-MVP

2. **How long should reset tokens be valid?**
   - ✅ **Resolved**: 24 hours (balances UX + security)

3. **What password complexity rules?**
   - ✅ **Resolved**: 8+ chars, uppercase, lowercase, number, special char (NIST aligned)

4. **How to prevent brute force attacks?**
   - ✅ **Resolved**: Per-email (1/10min, 5/day) + per-IP (10/minute) rate limiting

5. **How to handle already-used tokens?**
   - ✅ **Resolved**: Mark used_at timestamp, reject on reuse

All decisions align with project constitution and industry best practices.
