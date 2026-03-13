# Data Model: Password Recovery

**Feature**: 007-password-recovery
**Date**: 2026-03-11
**Status**: Defined

## Entity: PasswordResetToken

**Purpose**: Represents a single-use password reset token with time-based expiration

**SQLModel Definition**:
```python
from sqlmodel import SQLModel, Field
from datetime import datetime
from uuid import UUID, uuid4

class PasswordResetToken(SQLModel, table=True):
    __tablename__ = "password_reset_tokens"

    # Primary Key
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Foreign Keys
    tenant_id: UUID = Field(foreign_key="tenant.id", index=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)

    # Token Data
    token_hash: str = Field(max_length=255, index=True)  # SHA256 hash, never plaintext

    # Expiration & Usage
    expires_at: datetime = Field(index=True)  # 24 hours from creation
    used_at: datetime | None = Field(default=None)  # NULL = not yet used, timestamp = used

    # Audit
    ip_address: str = Field(max_length=45)  # IPv4 (15 chars) or IPv6 (39 chars)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    # Unique constraint: Only one active token per user per tenant
    # (Used tokens don't block new requests)
```

**Field Definitions**:

| Field | Type | Constraints | Purpose |
|-------|------|-----------|---------|
| `id` | UUID | Primary key | Unique token identifier |
| `tenant_id` | UUID | FK → Tenant, index | Multi-tenant isolation |
| `user_id` | UUID | FK → User, index | Which user requested reset |
| `token_hash` | VARCHAR(255) | Indexed, unique | SHA256 hash (plaintext never stored) |
| `expires_at` | TIMESTAMP | Indexed | 24-hour expiration window |
| `used_at` | TIMESTAMP, NULL | Index on (tenant_id, user_id, used_at) | Marks one-time use |
| `ip_address` | VARCHAR(45) | Not null | IPv4/IPv6 for audit logging |
| `created_at` | TIMESTAMP | Default: utcnow, indexed | Creation time for compliance |

**Indexes**:

```sql
-- Composite indexes for common queries
CREATE INDEX idx_password_reset_tokens_tenant_user_active
ON password_reset_tokens(tenant_id, user_id, used_at)
WHERE used_at IS NULL;  -- Active tokens only

CREATE INDEX idx_password_reset_tokens_tenant_hash
ON password_reset_tokens(tenant_id, token_hash);  -- Token lookup

CREATE INDEX idx_password_reset_tokens_expires_at
ON password_reset_tokens(expires_at);  -- Cleanup query
```

**Relationships**:

```
PasswordResetToken
  ↓ (many-to-one)
User

PasswordResetToken
  ↓ (many-to-one)
Tenant
```

---

## Entity: User (Extended)

**Existing Model**: `backend/app/models/user.py`

**New Fields for Rate Limiting**:

```python
class User(SQLModel, table=True):
    # ... existing fields ...

    # Password Reset Rate Limiting
    last_password_reset_request_at: datetime | None = Field(
        default=None,
        nullable=True,
        description="Timestamp of last password reset request (for rate limiting)"
    )
    password_reset_attempt_count: int = Field(
        default=0,
        description="Number of reset requests in current day (resets at 00:00 UTC)"
    )
```

**Migration Strategy**:
- Add columns as nullable with defaults
- No existing data affected
- Alembic auto-generates migration

---

## Entity: AuditLog (Extended)

**Existing Model**: `backend/app/models/audit_log.py`

**New Event Types** for Password Recovery:

```python
class AuditLogEventType(str, Enum):
    # ... existing events ...

    # Password Reset Events
    PASSWORD_RESET_REQUESTED = "password_reset_requested"
    PASSWORD_RESET_LINK_VERIFIED = "password_reset_link_verified"
    PASSWORD_RESET_FAILED = "password_reset_failed"
    PASSWORD_CHANGED_VIA_RESET = "password_changed_via_reset"
```

**Audit Log Structure** (JSON):

```json
{
  "timestamp": "2026-03-11T10:30:45.123Z",
  "level": "INFO",
  "module": "password_reset_service",
  "event_type": "password_reset_requested",
  "actor_id": "user-uuid",
  "target_resource": "user:email@example.com",
  "action": "request_reset",
  "result": "success",
  "ip_address": "203.0.113.42",
  "tenant_id": "tenant-uuid",
  "details": {
    "user_id": "user-uuid",
    "email": "user@example.com",
    "rate_limit_remaining": 4
  }
}
```

---

## State Transitions

### Password Reset Token Lifecycle

```
Created (status: active)
  ↓
  Valid for 24 hours
  ↓
Used (marked with used_at timestamp) OR Expired (now > expires_at)
  ↓
  Reject future attempts with same token
```

### User Password State

```
Old Password (stored in User.password_hash)
  ↓
[User clicks reset link]
  ↓
New Password (stored in User.password_hash)
  ↓
Old password no longer works
```

---

## Validation Rules

### PasswordResetToken

- **Token Hash**: Must be SHA256 hex string (64 characters exactly)
- **Expires At**: Must be in future (created_at + 24 hours)
- **IP Address**: Valid IPv4 or IPv6 format
- **Tenant ID**: Must match JWT tenant (enforced in service)

### User Extensions

- **Last Reset Request**: Enforced by service (minimum 10 minutes between requests)
- **Daily Count**: Reset at 00:00 UTC; max 5 requests per day per email

---

## Constraints & Uniqueness

### Primary Keys
- `PasswordResetToken.id` — Unique UUID

### Foreign Keys
- `PasswordResetToken.tenant_id` → `Tenant.id` (cascading delete if tenant deleted)
- `PasswordResetToken.user_id` → `User.id` (cascading delete if user deleted)

### Uniqueness
- **Implicit**: Only one active (used_at IS NULL) token per user at a time
  - Multiple tokens can exist, but only newest unused is valid
  - Old unused tokens auto-expire after 24 hours

### Indexes (for Performance)
- `(tenant_id, user_id, used_at)` — Find active tokens by user
- `(tenant_id, token_hash)` — Lookup token by hash
- `(expires_at)` — Cleanup job: find expired tokens

---

## Migrations

### Migration 1: Create PasswordResetToken Table

```python
# File: backend/alembic/versions/[timestamp]_add_password_reset_token_table.py

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token_hash', sa.String(255), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id']),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
    )
    op.create_index('idx_password_reset_tokens_tenant_user_active',
                    'password_reset_tokens',
                    ['tenant_id', 'user_id', 'used_at'])
    op.create_index('idx_password_reset_tokens_tenant_hash',
                    'password_reset_tokens',
                    ['tenant_id', 'token_hash'])
    op.create_index('idx_password_reset_tokens_expires_at',
                    'password_reset_tokens',
                    ['expires_at'])

def downgrade():
    op.drop_table('password_reset_tokens')
```

### Migration 2: Extend User Model

```python
# File: backend/alembic/versions/[timestamp]_add_password_reset_fields_to_user.py

def upgrade():
    op.add_column('user',
        sa.Column('last_password_reset_request_at', sa.DateTime(), nullable=True))
    op.add_column('user',
        sa.Column('password_reset_attempt_count', sa.Integer(),
                  nullable=False, server_default='0'))

def downgrade():
    op.drop_column('user', 'last_password_reset_request_at')
    op.drop_column('user', 'password_reset_attempt_count')
```

---

## Diagram: Data Relationships

```
┌─────────────────────────┐
│       Tenant            │
│  (multi-tenant scope)   │
└────────────┬────────────┘
             │
             ├──────────────────────────────┐
             │                              │
      (foreign key)              (foreign key)
             │                              │
   ┌─────────▼──────────┐        ┌──────────▼────────────┐
   │        User        │        │ PasswordResetToken    │
   │   email (unique)   │        │   token_hash (unique) │
   │   password_hash    │        │   expires_at          │
   │                    │        │   used_at (nullable)  │
   └────────────────────┘        └───────────────────────┘
                                     (24-hour lifetime)
                                     (one-time use)
```

---

## Performance Considerations

### Query Patterns

1. **Find active reset token**: `SELECT * FROM password_reset_tokens WHERE tenant_id = ? AND user_id = ? AND used_at IS NULL`
   - Uses: `idx_password_reset_tokens_tenant_user_active`
   - Expected rows: 0 or 1 (active only)
   - Time: <5ms

2. **Verify token hash**: `SELECT * FROM password_reset_tokens WHERE tenant_id = ? AND token_hash = ? AND expires_at > NOW()`
   - Uses: `idx_password_reset_tokens_tenant_hash`
   - Expected rows: 0 or 1
   - Time: <5ms

3. **Cleanup expired tokens**: `DELETE FROM password_reset_tokens WHERE expires_at < NOW() AND used_at IS NULL`
   - Uses: `idx_password_reset_tokens_expires_at`
   - Batched daily (off-peak hours)
   - Time: <100ms for typical 1-week cleanup

### Scaling Estimates

- **100 users, 1 reset/month**: ~100 tokens/month → trivial storage
- **500 users, 2 resets/month**: ~1000 tokens/month → <1MB storage/year
- **Indexes**: ~10MB for 1M expired tokens (typical 6-month retention)

No archival strategy needed for MVP.

---

## Related Entities (No Changes)

- **Tenant**: Existing model unchanged
- **User**: New nullable fields added (backward compatible)
- **AuditLog**: New event types added (backward compatible)

All changes are additive and non-breaking.
