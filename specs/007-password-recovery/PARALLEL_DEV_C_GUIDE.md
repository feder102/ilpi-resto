# Developer C: Frontend Setup + Phase 6-7 - User Stories 4 & 5

**Duration**: 7 hours
**Status**: Can start immediately (frontend independent of backend)
**Branch**: `007-password-recovery`
**Parallel Work**: Frontend can be built while Dev A works on US1, Dev B on US2-3

---

## 🎯 Your Mission

### Part 1: Frontend Setup (Hours 1-3)
Set up all frontend components for password reset flow that Dev A and Dev B's backend endpoints will connect to.

### Part 2: User Story 4 - Token Expiration (Hours 4-4.5)
Add token expiration validation to prevent replay attacks:
- Tokens expire after 24 hours
- Expired tokens return 410 Gone error
- Used tokens cannot be reused

### Part 3: User Story 5 - Rate Limiting (Hours 5-7)
Implement rate limiting to prevent brute force attacks:
- 1 request per 10 minutes per email
- 5 requests per day per email
- 10 requests per minute per IP
- Show retry timer on 429 errors

---

## ✅ What's Ready For You

You can immediately use:

- ✅ `frontend/src/types/passwordReset.ts` — All TypeScript interfaces
- ✅ `frontend/src/services/passwordResetService.ts` — API client ready
- ✅ `backend/app/models/password_reset_token.py` — Model with expires_at, used_at fields
- ✅ `backend/app/common/exceptions.py` — TokenExpiredError, RateLimitExceededError
- ✅ Database: password_reset_tokens table with all indexes ✅

**Independent Frontend Work**: You can build components immediately without waiting for Dev A/B's backend endpoints. Just use mock data for testing.

---

## 📋 Your Tasks

### Part 1: Frontend Setup & Integration (T021-T023, T031-T032, T043-T045)

These are already documented in **PARALLEL_DEV_A_GUIDE.md** and **PARALLEL_DEV_B_GUIDE.md**, but you'll implement them in parallel:

**Create**: `frontend/src/components/password-reset/ForgotPasswordForm.tsx`
- Email input field with validation
- Submit button with loading state
- Error and success displays
- Uses passwordResetService.requestReset()

**Create**: `frontend/src/components/password-reset/PasswordResetForm.tsx`
- Password input with real-time validation
- 5 requirement checkers (8+, upper, lower, number, special)
- Submit disabled until all requirements met
- Uses passwordResetService.verifyAndReset()

**Create**: `frontend/src/components/password-reset/ResetTokenVerification.tsx`
- Validates token on mount
- Shows loading state
- Shows error if token invalid/expired
- Renders PasswordResetForm on success

**Create**: `frontend/src/components/password-reset/ResetSuccess.tsx`
- Success confirmation message
- Redirect button to /login
- Optional: Auto-redirect after 3 seconds

**Create**: `frontend/src/views/PasswordReset.tsx`
- Extract token from URL query string
- Route to different component based on token presence
- State management for the flow

**Update**: `frontend/src/App.tsx`
- Add route: `<Route path="/password-reset" element={<PasswordReset />} />`
- Add link from login: "¿Olvidaste tu contraseña?"

---

### Part 2: User Story 4 - Token Expiration (1.5 hours)

#### Tests First (0.5 hours)

**Create**: `backend/tests/unit/test_password_reset_service.py` (already started by Dev A/B)

```python
# Test: Token expiration after 24 hours
def test_token_expiration_after_24_hours():
    """Token created at T, at T+24h+1min → expired"""
    # Create token with expires_at = now - 1 minute
    # Call verify_token(token) → should raise TokenExpiredError
    # Assert: error.code == "TOKEN_EXPIRED"

# Test: Token reuse prevention
def test_token_reuse_prevention():
    """Token marked used_at cannot be used again"""
    # Create token with used_at = now
    # Call verify_token(token) → should raise InvalidResetTokenError
    # Assert: error.message mentions "already used" or "inválido"
```

#### Implementation (1 hour)

**T050-T054: Token Expiration Enforcement**

These are mostly already in place from Phase 1-2, but you need to ensure the service layer properly validates:

In `backend/app/services/password_reset_service.py`, the `verify_token()` method should:

```python
def verify_token(self, token: str) -> PasswordResetToken:
    """Verify reset token and return token record.

    Step 4 (you implement):
    - Check expires_at > datetime.utcnow()
    - If expired: raise TokenExpiredError("El enlace ha expirado...")

    Step 5 (you implement):
    - Check used_at IS NULL
    - If not NULL: raise InvalidResetTokenError("El enlace ya fue utilizado...")
    """
```

**Backend Router Error Handling**:

Make sure the router properly maps token errors to HTTP responses:

```python
@router.get("/verify")
async def check_token_validity(...):
    try:
        token_record = service.verify_token(token)
        return TokenValidityResponse(valid=True, ...)
    except TokenExpiredError as e:
        return JSONResponse(
            status_code=410,  # 410 Gone (token expired)
            content={"error": {"code": e.code, "message": e.message}}
        )
    except InvalidResetTokenError as e:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": e.code, "message": e.message}}
        )
```

**Frontend Error Handling**:

Update error handling in `ForgotPasswordForm` and `PasswordResetForm` to show friendly messages:

```typescript
// When GET /verify returns 410
if (error.response?.status === 410) {
  setError("El enlace ha expirado. Solicita uno nuevo");
  // Show button to request new link
}

// When POST /verify returns 410
if (error.response?.status === 410) {
  setError("Tu sesión expiró. Solicita un nuevo enlace");
  // Redirect to /password-reset
}
```

---

### Part 3: User Story 5 - Rate Limiting (5.5 hours)

#### Tests First (2 hours)

**Create**: `backend/tests/unit/test_password_reset_service.py`

```python
# Test 1: Per-email 10-minute limit
def test_rate_limit_10_minutes():
    """Second request within 10 min → RateLimitExceededError"""
    service.request_password_reset("user@example.com", ip="1.2.3.4")  # OK
    # Immediately:
    service.request_password_reset("user@example.com", ip="1.2.3.4")  # FAIL
    # Should raise RateLimitExceededError

# Test 2: Per-email daily limit
def test_rate_limit_5_per_day():
    """6th request in same day → RateLimitExceededError"""
    for i in range(5):
        service.request_password_reset("user@example.com", ip=f"1.2.3.{i}")  # OK (5x)
    # 6th request (mock time advance 10+ minutes):
    service.request_password_reset("user@example.com", ip="1.2.3.6")  # FAIL
    # Should raise RateLimitExceededError

# Test 3: Per-IP rate limit
def test_rate_limit_per_ip_10_per_min():
    """11 requests from same IP in 60sec → block on 11th"""
    for i in range(10):
        service.request_password_reset(f"user{i}@example.com", ip="1.2.3.4")  # OK (10x)
    # 11th request from same IP:
    service.request_password_reset("user11@example.com", ip="1.2.3.4")  # FAIL
    # Should raise RateLimitExceededError

# Test 4: Rate limit reset after window
def test_rate_limit_reset_after_window():
    """After 10 min + 1 sec, user can request again"""
    service.request_password_reset("user@example.com", ip="1.2.3.4")  # OK
    # Mock time advance 10 min 1 sec:
    import time
    time.sleep(601)  # or mock time.time()
    service.request_password_reset("user@example.com", ip="1.2.3.4")  # OK again
```

**Create**: `backend/tests/integration/test_password_reset_request.py` (add to existing)

```python
# Integration test: Rate limit with HTTP status
def test_rate_limit_returns_429():
    """Rate limit error → HTTP 429 Too Many Requests"""
    # POST /auth/password-reset/request (first)  → 200
    # POST /auth/password-reset/request (second immediately) → 429
    # Assert: response.status_code == 429
    # Assert: "Retry-After" header present
    # Assert: response.json()["error"]["retry_after_seconds"] > 0
```

#### Implementation (3.5 hours)

**T055-T065: Rate Limiting Service Methods**

**T060: Implement `_check_rate_limit()` in `backend/app/services/password_reset_service.py`**

```python
def _check_rate_limit(self, email: str) -> None:
    """Check rate limiting for password reset requests.

    Enforces:
    - Maximum 1 request per 10 minutes per email
    - Maximum 5 requests per day per email

    Steps:
    1. Query User: user = db.query(User).filter(User.email == email).first()
    2. If no user found: return (user doesn't exist, but we allow the attempt)

    3. Per-email 10-minute check:
       if user.last_password_reset_request_at:
           elapsed = datetime.utcnow() - user.last_password_reset_request_at
           if elapsed < timedelta(minutes=10):
               wait_minutes = 10 - int(elapsed.total_seconds() / 60)
               raise RateLimitExceededError(
                   f"Intenta de nuevo en {wait_minutes} minutos"
               )

    4. Per-email daily check:
       if user.password_reset_attempt_count >= 5:
           raise RateLimitExceededError(
               "Límite diario de solicitudes excedido"
           )
    """
```

**T061: Call `_check_rate_limit()` at start of `request_password_reset()`**

```python
def request_password_reset(self, email: str, ip_address: str) -> None:
    # FIRST: Check rate limiting before any other operation
    self._check_rate_limit(email)

    # Then proceed with token generation, email sending, etc.
    ...
```

**T062-T063: Router Rate Limiting & Error Mapping**

Make sure the router is already configured with slowapi:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/request")
@limiter.limit("10/minute")  # Per-IP limit
async def request_password_reset(...):
    """Per-IP limit: 10 requests per minute (enforced by slowapi)"""
    # Service enforces per-email limits (1/10min, 5/day)
    service.request_password_reset(email, ip_address)
    return PasswordResetRequestResponse(...)
```

**Error Response for Rate Limiting**:

```python
from fastapi import HTTPException

@router.post("/request")
async def request_password_reset(...):
    try:
        service.request_password_reset(email, ip_address)
        return PasswordResetRequestResponse(...)
    except RateLimitExceededError as e:
        raise HTTPException(
            status_code=429,
            detail={
                "error": {
                    "code": e.code,
                    "message": e.message,
                    "retry_after_seconds": 600  # 10 minutes in seconds
                }
            },
            headers={"Retry-After": "600"}
        )
```

**T064: Frontend Rate Limit Error Handling**

Update `ForgotPasswordForm.tsx` to show retry timer:

```typescript
const [retryAfter, setRetryAfter] = useState<number | null>(null);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);
  setRetryAfter(null);

  try {
    const response = await passwordResetService.requestReset(email);
    setSuccess(true);
  } catch (err: any) {
    if (err.error?.code === "RATE_LIMIT_EXCEEDED") {
      setRetryAfter(err.error?.retry_after_seconds || 600);
      setError(`Intenta de nuevo en ${Math.ceil(retryAfter / 60)} minutos`);
    } else {
      setError(err.error?.message || "Error desconocido");
    }
  } finally {
    setLoading(false);
  }
};

// Show countdown timer
{retryAfter && (
  <div className="rate-limit-timer">
    Intenta de nuevo en {retryAfter} segundos...
  </div>
)}
```

Optional: Countdown timer that updates every second:

```typescript
useEffect(() => {
  if (!retryAfter) return;

  const interval = setInterval(() => {
    setRetryAfter((prev) => (prev && prev > 1 ? prev - 1 : null));
  }, 1000);

  return () => clearInterval(interval);
}, [retryAfter]);
```

**T065: Daily Reset Task (Deferred Post-MVP)**

For now, just document this:

```python
# TODO: Post-MVP - Add daily cron job to reset password_reset_attempt_count
# Schedule: Every day at 00:00 UTC
# Action: UPDATE user SET password_reset_attempt_count = 0
# Tools: APScheduler or Celery Beat
```

---

## 🧪 Testing Strategy

```bash
# Frontend components (can test with mock data)
npm run test -- PasswordReset
npm run test -- PasswordResetForm
npm run test -- ForgotPasswordForm
npm run test -- ResetTokenVerification
npm run test -- ResetSuccess

# Backend unit tests (rate limiting + expiration)
pytest backend/tests/unit/test_password_reset_service.py::test_rate_limit -v
pytest backend/tests/unit/test_password_reset_service.py::test_token_expiration -v

# Backend integration tests
pytest backend/tests/integration/test_password_reset_request.py::test_rate_limit_returns_429 -v

# Type checking
tsc --noEmit
mypy app/services/password_reset_service.py --strict
```

### Expected Results
- ✅ Frontend components render and work with mock data
- ✅ All rate limiting tests passing
- ✅ All expiration tests passing
- ✅ 0 TypeScript errors
- ✅ 0 mypy errors

---

## 💡 Implementation Tips

1. **Rate Limit Storage**:
   - Use DB fields: `user.last_password_reset_request_at` and `user.password_reset_attempt_count`
   - Update on every request (success or not)

2. **Time Calculations**:
   ```python
   from datetime import datetime, UTC, timedelta

   now = datetime.now(UTC)
   elapsed = now - user.last_password_reset_request_at
   wait_minutes = 10 - int(elapsed.total_seconds() / 60)
   ```

3. **Slowapi Integration**:
   - Already imported in router
   - `@limiter.limit("10/minute")` applies per IP
   - Service layer adds per-email limits

4. **Frontend Countdown**:
   - Extract seconds from retry_after_seconds
   - Update UI every second with setInterval
   - Clear interval on unmount

---

## ✅ Checklist Before Finishing

**Frontend**:
- [ ] All 5 components created (ForgotPasswordForm, PasswordResetForm, ResetTokenVerification, ResetSuccess, PasswordReset view)
- [ ] App.tsx route added
- [ ] Login link to /password-reset added
- [ ] Error handling for 410 (expired), 400 (invalid), 429 (rate limit)
- [ ] Countdown timer shows on rate limit errors
- [ ] TypeScript: `tsc --noEmit` (0 errors)

**Backend - User Story 4 (Expiration)**:
- [ ] verify_token() checks expires_at
- [ ] verify_token() checks used_at
- [ ] 410 Gone returned for expired tokens
- [ ] Tests passing: test_token_expiration_after_24_hours, test_token_reuse_prevention

**Backend - User Story 5 (Rate Limiting)**:
- [ ] _check_rate_limit() implements per-email checks
- [ ] _check_rate_limit() called at start of request_password_reset()
- [ ] Slowapi @limiter.limit("10/minute") on /request endpoint
- [ ] 429 status code with Retry-After header
- [ ] Tests passing: test_rate_limit_* (all 4 tests)
- [ ] All type checking: `mypy app --strict` (0 errors)
- [ ] All linting: `ruff check .` (0 errors)

**Final**:
- [ ] Commit: `git commit -m "feat(US4+US5): add token expiration and rate limiting"`
- [ ] Push: `git push origin 007-password-recovery`

---

## 📞 Support

Check:
1. `specs/007-password-recovery/quickstart.md` — Step-by-step guide
2. `specs/007-password-recovery/contracts/password-reset-api.md` — API contract details
3. `backend/app/common/exceptions.py` — Exception handling

**You're making the feature secure and robust!** 🔒

**Timeline**: Work in parallel with Dev A/B. Frontend can be tested with mock data immediately!
