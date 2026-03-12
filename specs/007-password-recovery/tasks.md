# Tasks: Password Recovery

**Input**: Design documents from `/specs/007-password-recovery/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are OPTIONAL. The tasks below include integration tests for each user story (recommended for security-critical features like password recovery).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Backend setup (Phase 1-2) is shared, then user stories can be implemented in parallel (P1 stories first, then P2 stories).

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no inter-task dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4, US5) - stories are independent and testable separately
- File paths are absolute and specific

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Update backend/app/models/__init__.py to prepare for PasswordResetToken import (Alembic metadata discovery)
- [x] T002 [P] Create backend/app/schemas/password_reset.py with request/response Pydantic DTOs (PasswordResetRequestSchema, PasswordResetVerifySchema, PasswordResetRequestResponse, PasswordResetVerifyResponse)
- [x] T003 [P] Extend backend/app/common/exceptions.py with password reset exceptions (InvalidResetTokenError, TokenExpiredError, RateLimitExceededError, PasswordValidationError)
- [x] T004 [P] Create backend/app/common/email_service.py or extend existing to add send_password_reset_email() method with async email template

**Checkpoint**: Project structure ready for database and backend implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create Alembic migration: backend/alembic/versions/[timestamp]_add_password_reset_token_table.py to create password_reset_tokens table with all fields (id, tenant_id, user_id, token_hash, expires_at, used_at, ip_address, created_at) and indexes
- [x] T006 Create Alembic migration: backend/alembic/versions/[timestamp]_extend_user_for_password_reset.py to add fields to user table (last_password_reset_request_at, password_reset_attempt_count)
- [x] T007 Run both migrations: `alembic upgrade head` to create database schema
- [x] T008 Create backend/app/models/password_reset_token.py with PasswordResetToken SQLModel entity (id, tenant_id, user_id, token_hash, expires_at, used_at, ip_address, created_at with proper foreign keys and indexes)
- [x] T009 Update backend/app/models/__init__.py to import and re-export PasswordResetToken for Alembic
- [x] T010 Create backend/app/services/password_reset_service.py with base service class and utility methods (_generate_reset_token, _validate_password, _send_reset_email, _check_rate_limit)
- [x] T011 [P] Create frontend/src/types/passwordReset.ts with TypeScript interfaces (PasswordResetRequest, PasswordResetVerifyRequest, PasswordResetResponse, PasswordValidationRequirement, ApiError)
- [x] T012 [P] Create frontend/src/services/passwordResetService.ts with API client methods (requestReset, verifyAndReset, checkTokenValidity)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Request Password Reset (Priority: P1) 🎯 MVP

**Goal**: Users can initiate password recovery by submitting their email address and receive a reset link via email

**Independent Test**: User can request a password reset by entering registered email and receive success confirmation (email sent asynchronously)

**Acceptance Criteria**:
1. User sees "Forgot Password" form with email input field
2. Submitting valid registered email returns success message (email enumeration protection)
3. Submitting unregistered email returns same success message (security)
4. Rate limiting enforced: 1 request per 10 minutes per email (shows "wait before requesting again" message)
5. Reset email contains valid token link (can be verified in logs/test email)

### Tests for User Story 1 ⚠️

- [ ] T013 [P] [US1] Create backend/tests/integration/test_password_reset_request.py with test_request_password_reset_success() - user requests reset for registered email, expects 200 + success message
- [ ] T014 [P] [US1] Create backend/tests/integration/test_password_reset_request.py with test_request_password_reset_email_enumeration() - registered + unregistered emails return same message
- [ ] T015 [P] [US1] Create backend/tests/integration/test_password_reset_request.py with test_request_password_reset_rate_limit_10_min() - second request within 10 min returns 429 rate limit error
- [ ] T016 [P] [US1] Create backend/tests/unit/test_password_reset_service.py with test_request_password_reset_generates_valid_token() - token is hashed and stored correctly
- [ ] T017 [P] [US1] Create backend/tests/unit/test_password_reset_service.py with test_email_sent_asynchronously() - email is queued/sent without blocking request

### Implementation for User Story 1

- [ ] T018 [US1] Implement request_password_reset(email: str, tenant_id: UUID, ip_address: str) in backend/app/services/password_reset_service.py
  - Validate email format
  - Check rate limiting (1 request per 10min, 5 per day per email)
  - Generate token (plaintext) and hash (SHA256) separately
  - Store PasswordResetToken in DB with hash only (plaintext never stored)
  - Send email asynchronously with reset link containing plaintext token
  - Update User.last_password_reset_request_at and increment password_reset_attempt_count
  - Log event to AuditLog (password_reset_requested)
  - Return nothing (service handles all side effects)
  - Email enumeration: Return same response regardless of email existence

- [ ] T019 [US1] Create backend/app/routers/password_reset_router.py with POST /auth/password-reset/request endpoint
  - Extract IP address from request: `request.client.host`
  - Accept PasswordResetRequestSchema (email)
  - Call service: `password_reset_service.request_password_reset(email, tenant_id, ip_address)`
  - Return PasswordResetRequestResponse (message, expires_in_hours, note)
  - Apply rate limiting decorator: `@limiter.limit("10/minute")` to prevent IP-level brute force
  - Handle exceptions: InvalidEmailError (400), RateLimitExceededError (429), EmailServiceError (503)

- [ ] T020 [US1] Register password_reset_router in backend/app/main.py by adding `app.include_router(password_reset_router.router)` after other routers

- [ ] T021 [US1] Create frontend/src/components/password-reset/ForgotPasswordForm.tsx component
  - Render email input field with label "Correo electrónico"
  - Render submit button "Solicitar enlace de recuperación"
  - Implement form validation (email format via regex or library)
  - Show loading state while submitting (spinner/disabled button)
  - On success (200): Show success message + redirect to confirmation view
  - On error (400/429/503): Show error dialog with error.message from API response
  - Show timer for rate limit errors (if retry_after_seconds provided)
  - TypeScript strict mode - all props typed, no `any` types

- [ ] T022 [US1] Create frontend/src/views/PasswordReset.tsx page container
  - Route parameter extraction: Get `token` from URL query string `?token=abc123`
  - Conditional rendering: If token exists, show password reset form (US3) else show forgot password form (US1)
  - State management for form submission (loading, error, success)
  - Error boundary handling

- [ ] T023 [US1] Update frontend/src/App.tsx to add public route for password reset
  - Add route: `<Route path="/password-reset" element={<PasswordReset />} />`
  - Ensure route is PUBLIC (no auth required, placed outside ProtectedLayout)
  - Add link from login page: "¿Olvidaste tu contraseña?" → `/password-reset`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can request password resets and receive emails.

---

## Phase 4: User Story 2 - Click Password Reset Link (Priority: P1)

**Goal**: Users can verify their identity via the reset token link and access the password reset form

**Independent Test**: User can click reset link from email (with token) and see password reset form. Invalid/expired tokens show appropriate error messages.

**Acceptance Criteria**:
1. Valid token shows password reset form (allows password input)
2. Expired token (>24h) shows error + "request new link" option (410 Gone)
3. Invalid/corrupted token shows error + "request new link" option (400)
4. Already-used token shows error + "request new link" option (400)
5. Token in URL is extracted and verified on component mount

### Tests for User Story 2 ⚠️

- [ ] T024 [P] [US2] Create backend/tests/integration/test_password_reset_verify.py with test_verify_valid_token() - valid token allows password reset form access (200 response)
- [ ] T025 [P] [US2] Create backend/tests/integration/test_password_reset_verify.py with test_verify_expired_token() - token >24h returns 410 Gone error
- [ ] T026 [P] [US2] Create backend/tests/integration/test_password_reset_verify.py with test_verify_invalid_token() - malformed token returns 400 Invalid
- [ ] T027 [P] [US2] Create backend/tests/integration/test_password_reset_verify.py with test_verify_used_token() - token with used_at timestamp returns 400 Already Used
- [ ] T028 [P] [US2] Create frontend/src/components/password-reset/__tests__/PasswordResetForm.test.tsx with test_token_validation_on_mount() - invalid token shows error dialog

### Implementation for User Story 2

- [ ] T029 [US2] Implement verify_token(token: str, tenant_id: UUID) in backend/app/services/password_reset_service.py
  - Hash plaintext token with SHA256
  - Query DB: SELECT * FROM password_reset_tokens WHERE token_hash = ? AND tenant_id = ?
  - Check token exists (raise InvalidResetTokenError if not)
  - Check expires_at > now() (raise TokenExpiredError if not)
  - Check used_at IS NULL (raise InvalidResetTokenError("Token already used") if not)
  - Check tenant_id matches (raise InvalidResetTokenError if not)
  - Return PasswordResetToken object (metadata only, not for password change)

- [ ] T030 [US2] Create GET /auth/password-reset/verify endpoint (optional convenience endpoint for frontend)
  - Accept token as query parameter: `?token=abc123`
  - Call service: `verify_token(token, tenant_id)`
  - Return {valid: true, user_email, expires_at} on success (200)
  - Return {error: {code: INVALID_RESET_TOKEN}} on failure (400)
  - Apply rate limiting: `@limiter.limit("20/minute")` (token checks are fast, allow more)

- [ ] T031 [US2] Create frontend/src/components/password-reset/ResetTokenVerification.tsx component
  - Accept token as prop (extracted from URL query string)
  - On mount: Call passwordResetService.checkTokenValidity(token)
  - While checking: Show loading spinner "Verificando enlace..."
  - If valid: Show password reset form (move to US3)
  - If invalid: Show error dialog with "El enlace es inválido o ha expirado"
  - Offer "Solicitar nuevo enlace" button → redirect to /password-reset
  - TypeScript strict mode

- [ ] T032 [US2] Update frontend/src/views/PasswordReset.tsx to integrate token verification
  - On mount with token: Render ResetTokenVerification component
  - ResetTokenVerification validates token then renders PasswordResetForm (US3) on success
  - On error: Show error message with retry option

**Checkpoint**: At this point, User Stories 1 AND 2 are functional. Users can request resets and verify token links.

---

## Phase 5: User Story 3 - Set New Password (Priority: P1)

**Goal**: Users can reset their password with a valid token and immediately log in with the new password

**Independent Test**: User can submit valid new password via reset form, password is updated in DB, user can log in with new credentials

**Acceptance Criteria**:
1. Form shows password validation requirements (8+ chars, upper, lower, number, special)
2. Requirements update in real-time as user types (password strength indicator)
3. Submit button disabled until all requirements met
4. Valid password accepted, updates user.password_hash in DB
5. Old password no longer works, new password works for login
6. Token marked as used (used_at timestamp) after reset
7. Other unused tokens for same user become invalid
8. Redirect to login page after successful reset

### Tests for User Story 3 ⚠️

- [ ] T033 [P] [US3] Create backend/tests/integration/test_password_reset_full_flow.py with test_password_reset_success() - valid token + valid password → update DB, mark token used, return 200
- [ ] T034 [P] [US3] Create backend/tests/integration/test_password_reset_full_flow.py with test_password_reset_invalid_password() - weak password returns 422 with validation details
- [ ] T035 [P] [US3] Create backend/tests/integration/test_password_reset_full_flow.py with test_password_change_invalidates_old_tokens() - after reset, other unused tokens for same user become invalid
- [ ] T036 [P] [US3] Create backend/tests/unit/test_password_reset_service.py with test_password_validation_all_requirements() - validate 8+, upper, lower, number, special char requirements
- [ ] T037 [P] [US3] Create backend/tests/unit/test_password_reset_service.py with test_bcrypt_hashing() - password hashed with bcrypt cost ≥10
- [ ] T038 [P] [US3] Create frontend/src/components/password-reset/__tests__/PasswordResetForm.test.tsx with test_password_validation_requirements() - requirements update as user types
- [ ] T039 [P] [US3] Create frontend/src/components/password-reset/__tests__/PasswordResetForm.test.tsx with test_submit_button_disabled_until_requirements_met() - button state toggles with password strength

### Implementation for User Story 3

- [ ] T040 [US3] Implement _validate_password(password: str) in backend/app/services/password_reset_service.py
  - Check length >= 8 characters
  - Check at least 1 uppercase letter (A-Z)
  - Check at least 1 lowercase letter (a-z)
  - Check at least 1 digit (0-9)
  - Check at least 1 special character (!@#$%^&*(),.?":{}|<>)
  - Raise PasswordValidationError with details on failure (which requirements failed)
  - Return None on success

- [ ] T041 [US3] Implement verify_and_reset_password(token: str, new_password: str, tenant_id: UUID) in backend/app/services/password_reset_service.py
  - Call verify_token(token, tenant_id) to get token record (validates hash, expiration, not used)
  - Call _validate_password(new_password) to check complexity requirements
  - Hash new_password with bcrypt (cost >= 10): `passlib.hash.bcrypt_sha256.using(rounds=10).hash(new_password)`
  - Get User by ID from token: `user = db.query(User).filter(User.id == token.user_id, User.tenant_id == tenant_id).first()`
  - Update User.password_hash with bcrypt hash
  - Mark token as used: `token.used_at = datetime.utcnow()`
  - Invalidate other unused tokens: `db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at == None, PasswordResetToken.id != token.id).update({PasswordResetToken.used_at: datetime.utcnow()})`
  - Log event to AuditLog (password_changed_via_reset)
  - Commit changes
  - Return User object (for response)

- [ ] T042 [US3] Add POST /auth/password-reset/verify endpoint to backend/app/routers/password_reset_router.py
  - Accept PasswordResetVerifySchema (token, new_password)
  - Call service: `user = password_reset_service.verify_and_reset_password(token, new_password, tenant_id)`
  - Return PasswordResetVerifyResponse (message, action: redirect_to_login, redirect_url: /login, user: {id, email})
  - Apply rate limiting: `@limiter.limit("5/minute")` (password resets are sensitive, limit strictly)
  - Handle exceptions: InvalidResetTokenError (400), TokenExpiredError (410), PasswordValidationError (422)

- [ ] T043 [US3] Create frontend/src/components/password-reset/PasswordResetForm.tsx component
  - Accept token as prop
  - Render password input field with label "Nueva contraseña"
  - Render password requirements list:
    - Minimum 8 caracteres (8+)
    - Al menos una mayúscula (A-Z)
    - Al menos una minúscula (a-z)
    - Al menos un número (0-9)
    - Al menos un carácter especial (!@#$%...)
  - On input change: Call validatePassword(password) and update requirement indicators (✓ green or ✗ red)
  - Submit button disabled until all requirements satisfied
  - On submit: Call passwordResetService.verifyAndReset(token, newPassword)
  - Show loading state while submitting
  - On success (200): Show success message + redirect to /login
  - On error (400/410/422): Show error dialog with details (password validation errors if 422)
  - TypeScript strict mode

- [ ] T044 [US3] Create frontend/src/components/password-reset/ResetSuccess.tsx component
  - Display confirmation message: "Contraseña restablecida exitosamente"
  - Display "Ir a Iniciar Sesión" button → redirect to /login
  - Optional: Timer to auto-redirect after 3 seconds

- [ ] T045 [US3] Update frontend/src/views/PasswordReset.tsx to show success component after password reset
  - Add state for success/completed flag
  - After verifyAndReset succeeds: Set completed = true, render ResetSuccess component
  - ResetSuccess button/timer redirects to /login

**Checkpoint**: At this point, User Stories 1, 2, and 3 are fully functional. Users can complete full password reset flow from email request to new password login. This is MVP-ready for release.

---

## Phase 6: User Story 4 - Token Expiration & Invalidation (Priority: P2)

**Goal**: System automatically invalidates reset tokens after 24 hours and when password is changed, preventing unauthorized access and replay attacks

**Independent Test**: System rejects expired tokens (>24h) and prevents reuse of tokens that have been used

**Acceptance Criteria**:
1. Token expires after 24 hours from creation (410 Gone error)
2. Already-used tokens cannot be reused (400 Invalid error)
3. Creating new reset request invalidates previous unused tokens for same email
4. User cannot use old password after successful reset
5. Database cleanup task removes expired tokens (deferred to post-MVP)

### Tests for User Story 4 ⚠️

- [ ] T046 [P] [US4] Create backend/tests/unit/test_password_reset_service.py with test_token_expiration_after_24_hours() - token created at time T, at T+24h+1min expires_at < now() returns true
- [ ] T047 [P] [US4] Create backend/tests/unit/test_password_reset_service.py with test_token_reuse_prevention() - token marked used_at cannot be used again
- [ ] T048 [P] [US4] Create backend/tests/integration/test_password_reset_full_flow.py with test_token_invalidation_on_new_request() - requesting new reset for same email invalidates previous unused tokens
- [ ] T049 [P] [US4] Create backend/tests/integration/test_password_reset_full_flow.py with test_old_password_stops_working_after_reset() - login with old password fails after successful password reset

### Implementation for User Story 4

- [ ] T050 [US4] Update database schema: Alembic migration already created in Phase 2 (T005) includes expires_at with 24-hour window
  - Verify migration sets: `expires_at = created_at + interval '24 hours'`
  - Verify index on expires_at for cleanup queries

- [ ] T051 [US4] Update verify_token() in backend/app/services/password_reset_service.py to check expiration (already done in T029 implementation)
  - Ensure check: `if token.expires_at <= datetime.utcnow(): raise TokenExpiredError()`
  - Return 410 Gone on timeout (client should show "link expired" and offer to request new link)

- [ ] T052 [US4] Update verify_and_reset_password() to invalidate other tokens (already done in T041 implementation)
  - Ensure update query invalidates unused tokens: `db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at == None, PasswordResetToken.id != token.id).update(...)`

- [ ] T053 [US4] Update request_password_reset() in backend/app/services/password_reset_service.py to invalidate previous unused tokens for email
  - Before creating new token, get user: `user = db.query(User).filter(User.email == email, User.tenant_id == tenant_id).first()`
  - Invalidate previous unused tokens: `db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at == None).update({PasswordResetToken.used_at: datetime.utcnow()})`
  - Then create new token as normal

- [ ] T054 [US4] Implement token expiration verification in GET /auth/password-reset/verify endpoint (T030)
  - verify_token() already checks expiration
  - On TokenExpiredError: Return 410 error response

**Checkpoint**: User Story 4 adds critical security. Tokens auto-expire and cannot be reused.

---

## Phase 7: User Story 5 - Rate Limiting & Account Protection (Priority: P2)

**Goal**: System limits password reset requests to prevent abuse, brute force attacks, and spam on user email accounts

**Independent Test**: System blocks excessive reset requests from same email and same IP address with clear retry messages

**Acceptance Criteria**:
1. Per-email rate limit: 1 request per 10 minutes per email (shows retry timer)
2. Per-email daily limit: 5 requests per day per email
3. Per-IP rate limit: 10 requests per minute per IP (blocks distributed attacks)
4. Rate limit errors return 429 with retry_after_seconds
5. Rate limit message in Spanish: "Intenta de nuevo en X minutos"
6. Rate limits reset properly at boundary times (10min, 24h)

### Tests for User Story 5 ⚠️

- [ ] T055 [P] [US5] Create backend/tests/unit/test_password_reset_service.py with test_rate_limit_10_minutes() - second request within 10min raises RateLimitExceededError
- [ ] T056 [P] [US5] Create backend/tests/unit/test_password_reset_service.py with test_rate_limit_5_per_day() - 6th request in same day raises RateLimitExceededError
- [ ] T057 [P] [US5] Create backend/tests/unit/test_password_reset_service.py with test_rate_limit_per_ip_10_per_min() - 11 requests from same IP in 60sec raises RateLimitExceededError
- [ ] T058 [P] [US5] Create backend/tests/integration/test_password_reset_request.py with test_rate_limit_retry_after_10_minutes() - after 10min+1sec, user can request again (reset counters)
- [ ] T059 [P] [US5] Create backend/tests/integration/test_password_reset_request.py with test_rate_limit_reset_at_24_hour_boundary() - daily limit resets at 00:00 UTC

### Implementation for User Story 5

- [ ] T060 [US5] Implement _check_rate_limit(email: str, ip_address: str, tenant_id: UUID) in backend/app/services/password_reset_service.py
  - Query User: `user = db.query(User).filter(User.email == email, User.tenant_id == tenant_id).first()`
  - Per-email 10-minute check:
    ```python
    if user and user.last_password_reset_request_at:
        elapsed = datetime.utcnow() - user.last_password_reset_request_at
        if elapsed < timedelta(minutes=10):
            wait_minutes = 10 - int(elapsed.total_seconds() / 60)
            raise RateLimitExceededError(f"Intenta de nuevo en {wait_minutes} minutos")
    ```
  - Per-email daily check:
    ```python
    if user and user.password_reset_attempt_count >= 5:
        raise RateLimitExceededError("Límite diario de solicitudes excedido")
    ```
  - Per-IP check: Use slowapi (already integrated in FastAPI)
    - Configured via @limiter.limit("10/minute") on /request endpoint

- [ ] T061 [US5] Call _check_rate_limit() at start of request_password_reset() method
  - Call before checking email existence
  - On RateLimitExceededError: Catch in router and return 429 with retry_after_seconds

- [ ] T062 [US5] Ensure POST /auth/password-reset/request has rate limiting decorator (already done in T019)
  - Verify: `@limiter.limit("10/minute")` is applied to block IP-level brute force
  - This is separate from per-email rate limiting (defense-in-depth)

- [ ] T063 [US5] Update error response for RateLimitExceededError to include retry_after_seconds in router
  - Calculate: `retry_after_seconds = int(elapsed.total_seconds()) + (10 * 60)` (round up to next 10-min window)
  - Return HTTP 429 with `Retry-After` header and JSON body: `{error: {code: RATE_LIMIT_EXCEEDED, message: "...", retry_after_seconds: 540}}`

- [ ] T064 [US5] Update frontend error handling in ForgotPasswordForm (T021) to show rate limit timer
  - If API returns 429: Extract retry_after_seconds
  - Show message: "Intenta de nuevo en {retry_after_seconds / 60} minutos"
  - Optional: Count down timer updates every second until retry window available

- [ ] T065 [US5] Add cleanup task for password reset attempt counters (deferred to post-MVP)
  - Daily cron job: At 00:00 UTC, reset User.password_reset_attempt_count = 0 for all users
  - For MVP: Document in quickstart.md, implementation post-MVP

**Checkpoint**: User Stories 1-5 are fully implemented. Complete password recovery feature with security hardening.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, testing, and quality assurance

- [ ] T066 [P] Create comprehensive integration test: backend/tests/integration/test_password_reset_e2e.py with full happy path (request → email → verify → reset → login)
- [ ] T067 [P] Create backend/tests/integration/test_password_reset_error_scenarios.py covering all error cases (invalid token, expired, rate limit, weak password, email service failure)
- [ ] T068 [P] Create comprehensive frontend integration test: frontend/src/components/password-reset/__tests__/passwordResetFlow.test.tsx testing full UI flow
- [ ] T069 Run backend type checking: `mypy backend/app --strict` (should pass with zero errors)
- [ ] T070 Run backend linting: `ruff check backend/` (should pass)
- [ ] T071 Run frontend type checking: `tsc --noEmit` (should pass with zero errors)
- [ ] T072 Run frontend linting: `npm run lint` (should pass)
- [ ] T073 [P] Create backend/tests/unit/test_email_service.py for async email sending
- [ ] T074 [P] Run full test suite: `pytest backend/tests/ -v --cov=app.services.password_reset_service --cov=app.routers.password_reset_router` (target >80% coverage)
- [ ] T075 [P] Run frontend tests: `npm run test -- password-reset` (all tests pass)
- [ ] T076 Finalize email template in backend/app/common/email_service.py with HTML + plain text versions
- [ ] T077 Update backend/.env.example with email configuration placeholders (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
- [ ] T078 Update frontend/.env.example with API base URL placeholder (VITE_API_BASE)
- [ ] T079 Update backend README.md with password recovery setup instructions (migrations, email config, testing)
- [ ] T080 Update frontend README.md with password recovery feature overview
- [ ] T081 Create or update backend/app/seed.py to include test user for password reset testing (optional, for manual testing)
- [ ] T082 [P] Security audit: Verify no plaintext tokens in logs, passwords hashed, rate limiting effective
- [ ] T083 [P] Code review: Ensure all files follow Clean Architecture principles (routers → services → models, no DB queries in routers)
- [ ] T084 Manual testing checklist:
  - [ ] Start backend: `uvicorn app.main:app --reload` (no errors)
  - [ ] Start frontend: `npm run dev` (no errors)
  - [ ] Check FastAPI docs: http://localhost:8000/docs (endpoints visible)
  - [ ] Request password reset for registered email
  - [ ] Check email (logs or test inbox): Link visible and clickable
  - [ ] Click link: Password reset form displays
  - [ ] Enter invalid password: Validation errors shown
  - [ ] Enter valid password: Success message + redirect to login
  - [ ] Login with new password: Authentication succeeds
  - [ ] Login with old password: Authentication fails
  - [ ] Test rate limiting: Request 2x in 5 min → error on 2nd
  - [ ] Test token expiration: Create token, set expires_at to past, try to use → error
- [ ] T085 Update backend/app/main.py to register any remaining configuration or middleware
- [ ] T086 Verify documentation: spec.md, plan.md, data-model.md, contracts/, quickstart.md all up to date
- [ ] T087 Create IMPLEMENTATION_INDEX.md in specs/007-password-recovery/ with summary of all created files and their purposes (similar to Feature 005)

**Final Checkpoint**: All tests passing, code reviewed, documentation complete, manual testing validated. Ready for merge to main branch.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion - **BLOCKS all user stories**
- **User Stories (Phase 3-5)**: All depend on Foundational phase (Phase 2) completion
  - User stories can proceed in parallel (P1 stories work together, P2 stories work together)
  - Or sequentially in priority order (US1 → US2 → US3 → US4 → US5)
- **Polish (Phase 8)**: Depends on at least User Stories 1-3 (US1, US2, US3) being complete

### User Story Dependencies

- **User Story 1 (Request Reset, P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 2 (Verify Token, P1)**: Can start after Phase 2 - Uses PasswordResetToken from US1 but independently testable
- **User Story 3 (Set Password, P1)**: Can start after Phase 2 - Uses token from US1/US2 but independently testable
- **User Story 4 (Expiration, P2)**: Can start after Phase 2 - Depends on token model (Phase 2) but independently testable
- **User Story 5 (Rate Limiting, P2)**: Can start after Phase 2 - Independently testable

### Within Each User Story

- Tests (if included) MUST be written first and FAIL before implementation
- Models/Schemas before services
- Services before routers/components
- Core implementation before integration
- Story complete and validated before moving to next priority

### Parallel Opportunities

**Phase 1 Parallelization** (after Setup starts):
```
T001: Update models/__init__.py
T002: Create schemas/password_reset.py [P]
T003: Extend common/exceptions.py [P]
T004: Extend email_service.py [P]
```
T002, T003, T004 can all run in parallel (different files, no dependencies)

**Phase 2 Parallelization** (after Phase 1 complete):
```
T005-T007: Database migrations (sequential - must apply in order)
T008-T010: Backend models + services [P] (after migrations)
T011-T012: Frontend types + services [P]
```
T008-T010 can run in parallel with T011-T012 (frontend independent of backend models)

**Phase 3-5 Parallelization** (after Phase 2 complete):
```
Developer A: User Story 1 (Request Reset) - T013-T023
Developer B: User Story 2 (Verify Token) - T024-T032
Developer C: User Story 3 (Set Password) - T033-T045
Developer D: User Story 4 (Expiration) - T046-T054
Developer E: User Story 5 (Rate Limiting) - T055-T065
```
All 5 user stories can be worked on in parallel (independent features, different files, no blocking dependencies)

**Within User Story 1 (Request Reset)**:
```
Tests parallelizable: T013, T014, T015, T016, T017 [P]
Backend parallelizable: T018 (service) blocks T019 (router, depends on service)
Frontend parallelizable: T021, T022, T023 [P] (can be done while backend is being built)
```

**Example Parallel Execution for 3-Person Team**:
```
Day 1:
  Team: Complete Phase 1 + Phase 2 together

Day 2-3:
  Person A: Phase 3 (US1: Request Reset) - Full story end-to-end
  Person B: Phase 4 (US2: Verify Token) - Full story end-to-end
  Person C: Phase 5 (US3: Set Password) - Full story end-to-end

Day 4:
  Person A: Phase 6 (US4: Expiration)
  Person B: Phase 7 (US5: Rate Limiting)
  Person C: Phase 8 Polish - Testing, integration, docs
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only) 🎯 RECOMMENDED

1. Complete Phase 1: Setup (Shared infrastructure) — ~2 hours
2. Complete Phase 2: Foundational (Database, models, exceptions) — ~3 hours
3. Complete Phase 3: User Story 1 (Request Reset) — ~1-2 hours
4. Complete Phase 4: User Story 2 (Verify Token) — ~1-2 hours
5. Complete Phase 5: User Story 3 (Set Password) — ~2-3 hours
6. **STOP and VALIDATE**: Test Password Recovery end-to-end (user can reset forgotten password)
7. Phase 8 Polish: Tests, type checking, linting, docs
8. Deploy/Demo Password Recovery MVP

**MVP Duration**: ~5 days for 1 developer (or ~2 days for 2-3 developers in parallel)

**MVP Value**: Users can fully recover forgotten passwords via email reset flow

### Incremental Delivery (Add Security in Second Sprint)

1. MVP (User Stories 1-3) deployed and validated
2. Phase 6: User Story 4 (Token Expiration) — Add expiration enforcement
3. Phase 7: User Story 5 (Rate Limiting) — Add attack prevention

### Parallel Team Strategy (3+ Developers)

1. **Team Sprint Planning**:
   - All team members complete Phase 1 + Phase 2 together
   - Ensures shared understanding of architecture

2. **Parallel Story Development**:
   - Assign each developer one user story
   - Stories work on different files, no conflicts
   - Each story independently testable

3. **Daily Sync**:
   - 15 min standup on blockers
   - Share patterns across stories
   - Coordinate integration testing

4. **Integration Point**:
   - When each story complete, run full end-to-end tests
   - Ensure stories work together (login after password reset, etc.)

---

## Acceptance Criteria for Each Phase

### Phase 1 Complete When:
- All project structure files created
- Models/__init__.py prepared for Alembic imports
- All exception classes defined
- Email service methods available

### Phase 2 Complete When:
- Database migrations run successfully: `alembic upgrade head` (✅)
- PasswordResetToken table exists with all fields and indexes
- User table has password reset tracking fields
- All models and services can be imported without errors
- Frontend types and API service ready

### Phase 3 (US1) Complete When:
- User can submit email on "Forgot Password" form
- Backend receives request, validates rate limiting
- Email sent asynchronously to registered email (or fails gracefully)
- Success message returned (regardless of email existence)
- All 5 tests pass (T013-T017)
- Type checking passes: `mypy`, `tsc --noEmit`
- Linting passes: `ruff check`, `npm run lint`

### Phase 4 (US2) Complete When:
- User can click email link with token
- Token verified and form displayed (or error shown)
- Invalid/expired tokens show appropriate errors
- All 5 tests pass (T024-T028)

### Phase 5 (US3) Complete When:
- User can submit new password
- Password validation works (real-time + on submit)
- Password updated in database (bcrypt hashed)
- Token marked as used
- User can log in with new password, not old password
- All 7 tests pass (T033-T039)

### Phase 6 (US4) Complete When:
- Tokens expire after 24 hours (cannot be used)
- Used tokens cannot be reused
- New reset request invalidates previous tokens
- All 4 tests pass (T046-T049)

### Phase 7 (US5) Complete When:
- Rate limiting enforced (1/10min, 5/day per email, 10/min per IP)
- Clear error messages with retry timers
- All 5 tests pass (T055-T059)

### Phase 8 Complete When:
- All 30 tests pass with >80% coverage (T066-T075)
- Type checking passes (mypy + tsc): 0 errors
- Linting passes (ruff + eslint): 0 warnings
- Manual testing checklist (T084) all ✅
- Documentation updated and complete
- Code review approved
- Ready to merge to main

---

## Notes

- [P] tasks = parallelizable (different files, no inter-task dependencies)
- [Story] label maps task to specific user story (US1-US5) for traceability
- Each user story is independently completable, testable, and deployable
- Commit after each phase completion (8 commits total, or per user story: 5+ commits)
- Stop at any checkpoint to validate story works independently (don't merge broken pieces)
- Backend + Frontend tasks often run in parallel (different languages, different developers)
- Email integration is critical: test with actual SMTP or mailhog for local development
- Security is paramount: verify passwords hashed, tokens never plaintext, rate limiting effective before deploying
