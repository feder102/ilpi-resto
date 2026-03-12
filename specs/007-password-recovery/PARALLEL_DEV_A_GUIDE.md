# Developer A: Phase 3 - User Story 1 (Request Password Reset)

**Duration**: 6 hours
**Status**: Ready to start immediately
**Branch**: `007-password-recovery`

---

## 🎯 Your Mission

Implement **User Story 1: Request Password Reset** — the entry point to password recovery flow.

Users should be able to:
1. Click "Forgot Password" on login page
2. Enter their email address
3. Receive a confirmation that a reset email was sent
4. Get an email with a reset link

---

## ✅ What's Ready For You (Phase 1-2 Complete)

You can immediately use:

- ✅ `backend/app/models/password_reset_token.py` — PasswordResetToken model (fully migrated)
- ✅ `backend/app/models/user.py` — User model with rate limiting fields
- ✅ `backend/app/schemas/password_reset.py` — Pydantic DTOs
- ✅ `backend/app/services/password_reset_service.py` — Service skeleton with TODOs
- ✅ `backend/app/common/exceptions.py` — All domain exceptions ready
- ✅ `frontend/src/types/passwordReset.ts` — TypeScript interfaces
- ✅ `frontend/src/services/passwordResetService.ts` — API client

**Database**: PostgreSQL running with password_reset_tokens table created ✅

---

## 📋 Phase 3 Tasks (T013-T023)

### Tests First (TDD Approach) - 1.5 hours

**Create**: `backend/tests/integration/test_password_reset_request.py`

```python
# Test 1: Valid registered email
def test_request_password_reset_success():
    """User requests reset for registered email → 200 + success message"""
    # POST /auth/password-reset/request with {"email": "user@example.com"}
    # Assert: 200 OK
    # Assert: response.message == "Se ha enviado un enlace de recuperación a tu email"
    # Assert: response.expires_in_hours == 24
    # Assert: Email sent (check logs or mock)

# Test 2: Email enumeration protection
def test_request_password_reset_email_enumeration():
    """Registered + unregistered emails return same message"""
    # POST with registered email → {"message": "Se ha enviado..."}
    # POST with non-existent email → {"message": "Se ha enviado..."} (same!)
    # Assert: Both return 200 (never 404)

# Test 3: Rate limiting (10 minutes)
def test_request_password_reset_rate_limit_10_min():
    """Second request within 10 min → 429 rate limit error"""
    # First POST → 200 OK
    # Second POST immediately → 429 Too Many Requests
    # Assert: error.code == "RATE_LIMIT_EXCEEDED"
    # Assert: error.retry_after_seconds > 0

# Test 4: Daily rate limit
def test_request_password_reset_rate_limit_5_per_day():
    """6th request in same day → 429 rate limit error"""
    # Make 5 requests successfully (mock time between them)
    # 6th request → 429
```

**Create**: `backend/tests/unit/test_password_reset_service.py`

```python
# Test 5: Token generation
def test_request_password_reset_generates_valid_token():
    """Token generated, hashed, and stored correctly"""
    # Call service.request_password_reset(email)
    # Assert: PasswordResetToken created in DB
    # Assert: token_hash is SHA256 hex (64 chars)
    # Assert: expires_at = now + 24 hours
    # Assert: used_at is NULL

# Test 6: Email sent asynchronously
def test_email_sent_asynchronously():
    """Email sent without blocking request"""
    # Call service.request_password_reset(email)
    # Assert: Returns immediately (no long delay)
    # Assert: Email queued/sent (check logs)
```

---

### Implementation (4.5 hours)

**T018: Implement `request_password_reset()` in `backend/app/services/password_reset_service.py`**

Replace the `pass` statement with:

```python
def request_password_reset(self, email: str, ip_address: str) -> None:
    """Request password reset token.

    Steps:
    1. Validate email format (basic)
    2. Get User by email (use query with tenant_id filter)
    3. Check rate limiting: _check_rate_limit(email)
    4. Generate token: plaintext_token, token_hash = _generate_reset_token()
    5. Create PasswordResetToken in DB:
       - token_hash = token_hash
       - user_id = user.id (if user exists, else skip or use None)
       - tenant_id = self.tenant_id
       - expires_at = datetime.utcnow() + timedelta(hours=24)
       - ip_address = ip_address
       - used_at = NULL (default)
    6. Send email asynchronously: _send_reset_email(email, reset_link)
       - reset_link = f"https://app.local/password-reset?token={plaintext_token}"
    7. Update User (if exists):
       - last_password_reset_request_at = datetime.utcnow()
       - password_reset_attempt_count += 1
    8. Log to AuditLog: password_reset_requested event

    Important:
    - Email enumeration: Return same response whether email exists or not
    - Rate limiting: Check before generating token
    - Always update user rate limiting fields (if user exists)
    - Log failures for admin visibility
    """
```

**T019: Create `backend/app/routers/password_reset_router.py`**

```python
from fastapi import APIRouter, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.schemas.password_reset import PasswordResetRequestResponse, PasswordResetRequestSchema
from app.services.password_reset_service import PasswordResetService

router = APIRouter(prefix="/auth/password-reset", tags=["password-reset"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/request", response_model=PasswordResetRequestResponse)
@limiter.limit("10/minute")  # Per-IP rate limit
async def request_password_reset(request: Request, data: PasswordResetRequestSchema, db: Session = Depends(get_db)):
    """Request password reset link.

    POST /auth/password-reset/request
    {"email": "user@example.com"}

    Returns 200 with message (regardless of email existence)
    Returns 429 if rate limit exceeded
    """
    service = PasswordResetService(db, tenant_id=YOUR_TENANT_ID)  # Get from context
    service.request_password_reset(email=data.email, ip_address=request.client.host)

    return PasswordResetRequestResponse(
        message="Se ha enviado un enlace de recuperación de contraseña a tu email",
        expires_in_hours=24,
        note="Revisa tu bandeja de entrada (incluida spam)"
    )
```

**T020: Register router in `backend/app/main.py`**

```python
from app.routers import password_reset_router

app.include_router(password_reset_router.router)
```

**T021-T023: Frontend Components**

Create: `frontend/src/components/password-reset/ForgotPasswordForm.tsx`

```typescript
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await passwordResetService.requestReset(email);
      setSuccess(true);
      // Redirect to confirmation page or show success message
    } catch (err: any) {
      setError(err.error?.message || 'Error requesting password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Enviando...' : 'Solicitar enlace'}
      </button>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{`Enlace enviado a ${email}`}</div>}
    </form>
  );
}
```

Create: `frontend/src/views/PasswordReset.tsx`

```typescript
export default function PasswordReset() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');

  return (
    <div className="password-reset-container">
      {token ? (
        // Phase 4: Show password reset form (User Story 2)
        <PasswordResetForm token={token} />
      ) : (
        // Phase 3: Show forgot password form (User Story 1)
        <ForgotPasswordForm />
      )}
    </div>
  );
}
```

Update: `frontend/src/App.tsx`

```typescript
// Add public route (outside ProtectedLayout)
<Route path="/password-reset" element={<PasswordReset />} />

// Add link from login page
<Link to="/password-reset">¿Olvidaste tu contraseña?</Link>
```

---

## 🧪 Testing Strategy

### Run Your Tests

```bash
# Backend unit tests
pytest backend/tests/unit/test_password_reset_service.py -v

# Backend integration tests
pytest backend/tests/integration/test_password_reset_request.py -v

# Frontend tests (optional for Phase 3)
npm run test -- ForgotPasswordForm
```

### Expected Results

- ✅ All 6 tests passing
- ✅ Test coverage >80%
- ✅ No mypy errors: `mypy app/services/password_reset_service.py --strict`
- ✅ No ruff errors: `ruff check app/routers/password_reset_router.py`

---

## 💡 Implementation Tips

1. **Rate Limiting in Service**:
   - Check `user.last_password_reset_request_at` (10 min cooldown)
   - Check `user.password_reset_attempt_count` (max 5/day)
   - Raise `RateLimitExceededError` if violated

2. **Email Enumeration Protection**:
   - Find user by email (if exists) or not
   - Always return same success response (200)
   - Log the actual result for security audit

3. **Token Storage**:
   - Generate: `plaintext_token = token_urlsafe(32)`
   - Hash: `token_hash = hashlib.sha256(plaintext_token.encode()).hexdigest()`
   - Store ONLY hash in DB
   - Send plaintext in email link

4. **Rate Limiting Fields**:
   - Update `user.last_password_reset_request_at = datetime.utcnow()`
   - Increment `user.password_reset_attempt_count`
   - Reset count daily (post-MVP cleanup task)

5. **Email Service**:
   - Use background thread: `executor.submit(_send_smtp, email, reset_link)`
   - Don't block the request
   - Log errors for visibility

---

## ✅ Checklist Before Moving To Dev B

- [ ] All 6 tests written and failing ✓ (TDD)
- [ ] All 6 tests passing ✓ (after implementation)
- [ ] Service methods implemented
- [ ] Router endpoint working
- [ ] Frontend form renders
- [ ] Type checking: `mypy app --strict` (0 errors)
- [ ] Linting: `ruff check .` (0 errors)
- [ ] Commit: `git commit -m "feat(US1): implement request password reset"`
- [ ] Push: `git push origin 007-password-recovery`

---

## 📞 Questions?

Check:
1. `specs/007-password-recovery/quickstart.md` — Step-by-step guide
2. `specs/007-password-recovery/data-model.md` — Entity details
3. `specs/007-password-recovery/contracts/password-reset-api.md` — API spec
4. `backend/app/models/password_reset_token.py` — Model structure
5. `backend/app/schemas/password_reset.py` — DTO structure

**You're building the foundation that Dev B and Dev C depend on!** ✨

**Start with tests first (TDD) → then implementation → commit when all tests pass!**
