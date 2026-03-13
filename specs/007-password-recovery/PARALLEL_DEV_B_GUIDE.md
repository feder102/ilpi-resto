# Developer B: Phase 4-5 - User Stories 2 & 3 (Token Verification + Password Reset)

**Duration**: 6.5 hours
**Status**: Can start after Phase 1-2 complete (foundation ready ✅)
**Branch**: `007-password-recovery`
**Dependency**: Dev A's Phase 3 tests may pass but US2-3 are independently testable

---

## 🎯 Your Mission

Implement **User Stories 2 & 3** — the core password reset functionality.

### User Story 2: Token Verification (3 hours)
Users should:
1. Receive email with reset link containing token
2. Click link → validation checks token
3. Token is valid (not expired, not used) → password reset form displays
4. Token is invalid/expired → error message with retry option

### User Story 3: Set New Password (3.5 hours)
Users should:
1. See password requirements (8+ chars, upper, lower, number, special)
2. Requirements update in real-time as they type
3. Submit valid password → password updated in DB
4. Old password stops working, new password works for login
5. Token marked as used (can't be reused)

---

## ✅ What's Ready For You

You can immediately use:

- ✅ `backend/app/models/password_reset_token.py` — Model (migrated)
- ✅ `backend/app/models/user.py` — User model with rate limiting fields
- ✅ `backend/app/schemas/password_reset.py` — DTOs (need to extend for GET /verify)
- ✅ `backend/app/services/password_reset_service.py` — Service skeleton
- ✅ `backend/app/common/exceptions.py` — All exceptions ready
- ✅ `frontend/src/types/passwordReset.ts` — Types ready
- ✅ `frontend/src/services/passwordResetService.ts` — API client ready
- ✅ Database: password_reset_tokens table with indexes ✅

**Dependency on Dev A**: Dev A's `/auth/password-reset/request` endpoint should be working (but US2-3 can test independently with mock tokens)

---

## 📋 Phase 4-5 Tasks (T024-T045)

### Phase 4: User Story 2 - Token Verification (3 hours)

#### Tests First (1 hour) - `backend/tests/integration/test_password_reset_verify.py`

```python
# Test 1: Valid token
def test_verify_valid_token():
    """Valid token within 24h → password form accessible"""
    # Create mock PasswordResetToken in DB
    # GET /auth/password-reset/verify?token=abc123
    # Assert: 200 OK
    # Assert: response.valid == True
    # Assert: response.user_email != None

# Test 2: Expired token (>24h)
def test_verify_expired_token():
    """Token >24h old → 410 Gone (token expired)"""
    # Create token with expires_at = now - 1 day
    # GET /auth/password-reset/verify?token=expired_token
    # Assert: 410 Gone
    # Assert: error.code == "TOKEN_EXPIRED"
    # Assert: error.message contains "Solicita uno nuevo"

# Test 3: Invalid token (corrupted/wrong)
def test_verify_invalid_token():
    """Invalid token → 400 Bad Request"""
    # GET /auth/password-reset/verify?token=invalid_xyz
    # Assert: 400 Bad Request
    # Assert: error.code == "INVALID_RESET_TOKEN"

# Test 4: Already used token (used_at != NULL)
def test_verify_used_token():
    """Token with used_at timestamp → 400 (Already Used)"""
    # Create token with used_at = now - 1 hour
    # GET /auth/password-reset/verify?token=used_token
    # Assert: 400 Bad Request
    # Assert: error.message mentions "ya fue utilizado"
```

#### Implementation (2 hours)

**T029: Implement `verify_token()` in service**

```python
def verify_token(self, token: str) -> PasswordResetToken:
    """Verify reset token and return token record.

    Steps:
    1. Hash plaintext token: token_hash = hashlib.sha256(token.encode()).hexdigest()
    2. Query DB: SELECT * FROM password_reset_tokens WHERE token_hash=? AND tenant_id=?
    3. Check token exists → raise InvalidResetTokenError if not
    4. Check expires_at > now() → raise TokenExpiredError if expired
    5. Check used_at IS NULL → raise InvalidResetTokenError("Token already used")
    6. Check tenant_id matches → raise InvalidResetTokenError if mismatch
    7. Return token record (PasswordResetToken object)

    Raises:
    - InvalidResetTokenError: If token doesn't exist or already used
    - TokenExpiredError: If token past 24-hour window
    """
```

**T030: Create GET /auth/password-reset/verify endpoint**

```python
@router.get("/verify", response_model=TokenValidityResponse)  # NEW
@limiter.limit("20/minute")  # Token checks are fast
async def check_token_validity(token: str, db: Session = Depends(get_db)):
    """Check if reset token is valid (optional convenience endpoint).

    GET /auth/password-reset/verify?token=abc123

    Returns metadata for frontend password form
    or error if token invalid/expired
    """
    service = PasswordResetService(db, tenant_id=TENANT_ID)
    token_record = service.verify_token(token)

    return TokenValidityResponse(
        valid=True,
        user_email=db.query(User).filter(User.id == token_record.user_id).first().email,
        expires_at=token_record.expires_at.isoformat()
    )
```

**T031-T032: Frontend Token Verification Components**

Create: `frontend/src/components/password-reset/ResetTokenVerification.tsx`

```typescript
export default function ResetTokenVerification({ token }: { token: string }) {
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validate = async () => {
      try {
        const result = await passwordResetService.checkTokenValidity(token);
        setValid(result.valid);
      } catch (err: any) {
        setValid(false);
        setError(err.error?.message || 'El enlace es inválido o ha expirado');
      } finally {
        setValidating(false);
      }
    };

    validate();
  }, [token]);

  if (validating) return <div>Verificando enlace...</div>;

  if (!valid) {
    return (
      <div className="error-dialog">
        <p>{error}</p>
        <Link to="/password-reset">Solicitar nuevo enlace</Link>
      </div>
    );
  }

  // Show password reset form (Phase 5)
  return <PasswordResetForm token={token} />;
}
```

Update: `frontend/src/views/PasswordReset.tsx`

```typescript
// Integrate token verification before password reset form
if (token) {
  return <ResetTokenVerification token={token} />;
}
return <ForgotPasswordForm />;
```

---

### Phase 5: User Story 3 - Set New Password (3.5 hours)

#### Tests First (1.5 hours) - `backend/tests/integration/test_password_reset_full_flow.py`

```python
# Test 1: Password reset success
def test_password_reset_success():
    """Valid token + valid password → password updated"""
    # Create token
    # POST /auth/password-reset/verify with {"token": ..., "new_password": "NewPass123!"}
    # Assert: 200 OK
    # Assert: response.message == "Contraseña restablecida exitosamente"
    # Assert: User.hashed_password updated (and != old password)
    # Assert: Token marked as used (used_at != NULL)

# Test 2: Invalid password (weak)
def test_password_reset_invalid_password():
    """Weak password → 422 Unprocessable Entity"""
    # POST with weak password "abc123" (no special char)
    # Assert: 422 Unprocessable Entity
    # Assert: error.code == "PASSWORD_VALIDATION_FAILED"
    # Assert: error.details.requirements shows which failed

# Test 3: Token invalidation on new request
def test_password_change_invalidates_old_tokens():
    """After successful reset, other unused tokens for same user become invalid"""
    # Create 2 tokens for same user
    # Use first token to reset password
    # Try to use second token → should fail (marked as used)

# Test 4: Old password stops working
def test_old_password_stops_working_after_reset():
    """Login with old password fails after reset"""
    # Request reset and change password
    # Try login with old password → 401 Unauthorized
    # Try login with new password → 200 OK (authenticated)
```

Also add unit tests to `backend/tests/unit/test_password_reset_service.py`:

```python
# Test 5: Password validation
def test_password_validation_all_requirements():
    """Test all 5 password requirements"""
    # Test password too short: "Abc1!" (5 chars) → fails
    # Test no uppercase: "abc123!" → fails
    # Test no lowercase: "ABC123!" → fails
    # Test no number: "Abcdef!" → fails
    # Test no special: "Abc123" → fails
    # Test valid: "MyPass123!" → passes

# Test 6: Bcrypt hashing
def test_bcrypt_hashing():
    """Password hashed with bcrypt cost ≥10"""
    # Hash password with service
    # Verify hash is bcrypt format
    # Verify different iterations produce different hashes
    # Verify bcrypt.verify works on new password
```

#### Implementation (2 hours)

**T040: Implement `_validate_password()` in service**

```python
def _validate_password(self, password: str) -> None:
    """Validate password meets security requirements.

    Requirements:
    - Minimum 8 characters
    - At least 1 uppercase letter (A-Z)
    - At least 1 lowercase letter (a-z)
    - At least 1 digit (0-9)
    - At least 1 special character (!@#$%^&*...)

    Steps:
    1. Check length >= 8
    2. Check regex: [A-Z] exists
    3. Check regex: [a-z] exists
    4. Check regex: [0-9] exists
    5. Check regex: [!@#$%^&*(),.?":{}|<>] exists
    6. If any check fails, raise PasswordValidationError with details

    Raises:
    - PasswordValidationError: With list of failed requirements
    """
```

**T041: Implement `verify_and_reset_password()` in service**

```python
def verify_and_reset_password(
    self, token: str, new_password: str, user_id: UUID | None = None
) -> User:
    """Verify token and reset user password.

    Steps:
    1. Call verify_token(token) to validate token
    2. Call _validate_password(new_password) to check complexity
    3. Get User from token: db.query(User).filter(User.id == token.user_id)
    4. Hash password with bcrypt (cost >= 10):
       from passlib.hash import bcrypt_sha256
       hashed = bcrypt_sha256.using(rounds=10).hash(new_password)
    5. Update User:
       - user.hashed_password = hashed
    6. Mark token as used:
       - token.used_at = datetime.utcnow()
    7. Invalidate other unused tokens for this user:
       - db.query(PasswordResetToken)
         .filter(PasswordResetToken.user_id == user.id)
         .filter(PasswordResetToken.used_at == None)
         .filter(PasswordResetToken.id != token.id)
         .update({PasswordResetToken.used_at: datetime.utcnow()})
    8. Log event to AuditLog: password_changed_via_reset
    9. Commit changes: db.commit()
    10. Return User object

    Raises:
    - InvalidResetTokenError: If token invalid
    - TokenExpiredError: If token expired
    - PasswordValidationError: If password weak
    """
```

**T042: Create POST /auth/password-reset/verify endpoint**

```python
@router.post("/verify", response_model=PasswordResetVerifyResponse)
@limiter.limit("5/minute")  # Password resets are sensitive
async def verify_and_reset_password(
    request: Request, data: PasswordResetVerifySchema, db: Session = Depends(get_db)
):
    """Verify token and reset password.

    POST /auth/password-reset/verify
    {"token": "abc123...", "new_password": "NewPass123!"}

    Returns success with redirect to login
    or error (400/410/422) if validation fails
    """
    service = PasswordResetService(db, tenant_id=TENANT_ID)
    user = service.verify_and_reset_password(data.token, data.new_password)

    return PasswordResetVerifyResponse(
        message="Contraseña restablecida exitosamente",
        action="redirect_to_login",
        redirect_url="/login",
        user={"id": str(user.id), "email": user.email}
    )
```

**T043-T045: Frontend Password Reset Form Components**

Create: `frontend/src/components/password-reset/PasswordResetForm.tsx`

```typescript
export default function PasswordResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [requirements, setRequirements] = useState({
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validatePassword = (pwd: string) => {
    setPassword(pwd);
    setRequirements({
      minLength: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    });
  };

  const allRequirementsMet = Object.values(requirements).every((r) => r);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRequirementsMet) return;

    setLoading(true);
    setError(null);

    try {
      const response = await passwordResetService.verifyAndReset(token, password);
      // Success! Redirect to login
      window.location.href = response.redirect_url;
    } catch (err: any) {
      setError(err.error?.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        placeholder="Nueva contraseña"
        value={password}
        onChange={(e) => validatePassword(e.target.value)}
        disabled={loading}
      />

      <div className="requirements">
        <RequirementCheck
          satisfied={requirements.minLength}
          label="Mínimo 8 caracteres"
        />
        <RequirementCheck
          satisfied={requirements.uppercase}
          label="Al menos una mayúscula (A-Z)"
        />
        <RequirementCheck
          satisfied={requirements.lowercase}
          label="Al menos una minúscula (a-z)"
        />
        <RequirementCheck satisfied={requirements.number} label="Al menos un número (0-9)" />
        <RequirementCheck
          satisfied={requirements.special}
          label="Al menos un carácter especial (!@#$...)"
        />
      </div>

      <button type="submit" disabled={!allRequirementsMet || loading}>
        {loading ? 'Restaurando...' : 'Restaurar contraseña'}
      </button>

      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

Create: `frontend/src/components/password-reset/ResetSuccess.tsx`

```typescript
export default function ResetSuccess() {
  return (
    <div className="success-dialog">
      <h2>¡Contraseña restablecida!</h2>
      <p>Tu contraseña ha sido actualizada exitosamente.</p>
      <Link to="/login">Ir a Iniciar Sesión</Link>
    </div>
  );
}
```

---

## 🧪 Testing Strategy

```bash
# Phase 4 tests
pytest backend/tests/integration/test_password_reset_verify.py -v

# Phase 5 tests
pytest backend/tests/integration/test_password_reset_full_flow.py -v
pytest backend/tests/unit/test_password_reset_service.py::test_password_validation -v
pytest backend/tests/unit/test_password_reset_service.py::test_bcrypt_hashing -v

# Type checking
mypy app/services/password_reset_service.py --strict
mypy app/routers/password_reset_router.py --strict

# Frontend (optional)
npm run test -- PasswordResetForm
```

### Expected Results
- ✅ All tests passing
- ✅ >80% coverage
- ✅ 0 mypy errors
- ✅ 0 ruff errors

---

## 💡 Implementation Tips

1. **Token Hashing**: Always hash before DB lookup
   ```python
   token_hash = hashlib.sha256(token.encode()).hexdigest()
   ```

2. **Password Hashing**: Use bcrypt with cost ≥10
   ```python
   from passlib.hash import bcrypt_sha256
   hashed = bcrypt_sha256.using(rounds=10).hash(password)
   ```

3. **Concurrent Token Invalidation**: When one token is used, mark others unused
   ```python
   db.query(PasswordResetToken)
     .filter(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at == None)
     .update({PasswordResetToken.used_at: datetime.utcnow()})
   ```

4. **Error Details**: Include validation details in 422 response for frontend
   ```python
   {
     "error": {
       "code": "PASSWORD_VALIDATION_FAILED",
       "details": {
         "requirements": [
           {"requirement": "minLength", "satisfied": false, "message": "Mínimo 8 caracteres"}
         ]
       }
     }
   }
   ```

---

## ✅ Checklist Before Finishing

- [ ] Phase 4 tests written and passing
- [ ] Phase 5 tests written and passing
- [ ] Service methods: verify_token(), _validate_password(), verify_and_reset_password()
- [ ] Router: GET /verify, POST /verify endpoints working
- [ ] Frontend: All 3 components (Verification, PasswordResetForm, ResetSuccess)
- [ ] Type checking: `mypy app --strict` (0 errors)
- [ ] Linting: `ruff check .` (0 errors)
- [ ] Full E2E flow: Request → Email → Verify → Reset → Login works
- [ ] Commit: `git commit -m "feat(US2+US3): implement token verification and password reset"`
- [ ] Push: `git push origin 007-password-recovery`

---

## 📞 Support

Check:
1. `specs/007-password-recovery/contracts/password-reset-api.md` — API details
2. `specs/007-password-recovery/data-model.md` — Database schema
3. `backend/app/models/password_reset_token.py` — Model fields
4. `backend/app/common/exceptions.py` — Exception handling

**You're implementing the MVP core!** 🎯
