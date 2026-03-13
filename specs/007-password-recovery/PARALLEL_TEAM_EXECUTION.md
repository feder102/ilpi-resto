# Parallel Team Execution Plan: Password Recovery

**Feature**: 007-password-recovery
**Team Size**: 3+ developers
**Execution Model**: Parallel feature development
**Estimated Duration**: 2-3 days
**Branch**: `007-password-recovery` (main feature branch)

---

## Team Role Assignment (3-Person Team)

### Developer A: Backend Foundation + User Story 1
- **Phase 1-2**: Setup + Foundational (database, models, exceptions)
- **Phase 3**: User Story 1 - Request Password Reset (request endpoint, service, tests)
- **Total Duration**: ~6 hours
- **Files Created**: 12 files (database, models, schemas, exceptions, router, tests)

### Developer B: User Story 2 & 3
- **Phase 4-5**: User Story 2 & 3 - Token Verification + Password Reset
  - US2: Token verification logic, GET endpoint
  - US3: Password validation, POST /verify endpoint
- **Total Duration**: ~5 hours
- **Files Created**: 8 files (router additions, service methods, tests)

### Developer C: Frontend + User Story 4 & 5
- **Phase 3-5**: Frontend setup parallel with US1 (different language)
- **Phase 6-7**: User Story 4 & 5 - Token Expiration + Rate Limiting
  - US4: Expiration logic, database cleanup
  - US5: Rate limiting enforcement, error handling
- **Total Duration**: ~6 hours
- **Files Created**: 15 files (frontend components, services, tests)

### Optional Developer D & E (5-Person Team):
- **Developer D**: Full testing & integration testing (Phase 8)
- **Developer E**: Documentation + security audit + deployment prep

---

## Day-by-Day Timeline

### Day 1: Setup + Foundational (All Team Together)

**Morning (9:00-12:00)**: Architecture sync + planning
- [ ] All developers clone branch: `git checkout 007-password-recovery`
- [ ] Review spec.md, plan.md, data-model.md together (30 min)
- [ ] Walk through architecture: Clean Architecture, folder structure, file locations (30 min)
- [ ] Review tasks.md Phase 1 & 2 (30 min)
- [ ] Discuss Git workflow: feature branches, commits, PR strategy (15 min)

**Afternoon (13:00-18:00)**: Phase 1 + Phase 2 Execution (All Together)

**Developer A + B + C working together on Phase 1 & 2** (no parallelization yet):

1. **T001-T004: Setup** (All together, 45 min)
   - Dev A creates backend/app/schemas/password_reset.py
   - Dev B creates backend/app/common/exceptions.py extensions
   - Dev C creates frontend/src/types/passwordReset.ts
   - Dev A updates models/__init__.py
   - All review and commit together

2. **T005-T007: Database Migrations** (Dev A leads, others review)
   - Dev A creates migration for password_reset_tokens table
   - Dev A creates migration for user table extensions
   - Dev A runs migrations locally: `alembic upgrade head`
   - All verify schema with `psql` or DB tool
   - Commit: `git commit -m "feat: add password reset database schema"`

3. **T008-T010: Backend Models + Service** (Dev A + B)
   - Dev A creates PasswordResetToken model (T008)
   - Dev B creates password_reset_service.py base class (T010)
   - Dev A updates models/__init__.py (T009)
   - All run type checking: `mypy app --strict` (should pass)
   - Commit: `git commit -m "feat: add password reset models and service base"`

4. **T011-T012: Frontend Types + Service** (Dev C)
   - Dev C creates frontend/src/types/passwordReset.ts (T011)
   - Dev C creates frontend/src/services/passwordResetService.ts (T012)
   - Dev C runs type checking: `tsc --noEmit` (should pass)
   - Commit: `git commit -m "feat: add password reset frontend types and service"`

**End of Day 1**:
- ✅ Phase 1 & 2 complete
- ✅ Database schema created and migrated
- ✅ Models, schemas, exceptions ready
- ✅ Frontend types ready
- ✅ All code type-checked and linted
- ✅ 4 commits to feature branch

---

### Day 2: User Stories 1-3 in Parallel (Teams Split)

**Morning (9:00-10:00)**: Daily Sync
- [ ] 15-min standup: What each developer is doing today
- [ ] Dev A: "Building US1 - request reset endpoint + tests"
- [ ] Dev B: "Building US2 & US3 - token verification + password reset"
- [ ] Dev C: "Building frontend components + US4 & US5 logic"
- [ ] Discuss blockers/questions
- [ ] Agree on file paths and interfaces

**10:00-18:00**: Parallel Development

#### Developer A: User Story 1 (Request Password Reset)

**Phase 3: User Story 1** (T013-T023)

```
Timeline: 10:00-16:00 (6 hours)
```

**Tests First (TDD)** (10:00-11:30):
- [ ] T013: Create test_password_reset_request.py
  - `test_request_password_reset_success()` - valid email → 200
  - `test_request_password_reset_rate_limit_10_min()` - second request → 429
- [ ] T014-T017: Unit tests for service layer
  - Test token generation
  - Test email sending
  - Test rate limiting

**Then Implementation** (11:30-16:00):

- [ ] T018: Implement `request_password_reset()` in password_reset_service.py
  - Token generation + hashing
  - Rate limit checking
  - Email sending
  - Audit logging

- [ ] T019: Create password_reset_router.py
  - `POST /auth/password-reset/request` endpoint
  - `@limiter.limit("10/minute")` decorator
  - Error handling

- [ ] T020: Register router in main.py

- [ ] T021-T023: Frontend components
  - ForgotPasswordForm.tsx
  - PasswordReset.tsx view
  - Add route to App.tsx

**Type Check & Linting** (16:00-16:30):
```bash
cd backend && mypy app --strict && ruff check . && cd ../frontend && tsc --noEmit && npm run lint
```

**Testing** (16:30-17:00):
```bash
pytest tests/integration/test_password_reset_request.py -v
npm run test -- password-reset
```

**Commit** (17:00):
```bash
git commit -m "feat(US1): implement request password reset endpoint and frontend form"
```

**Dev A Files Created**:
- backend/app/services/password_reset_service.py (request_password_reset method)
- backend/app/routers/password_reset_router.py (POST /request endpoint)
- backend/tests/integration/test_password_reset_request.py
- backend/tests/unit/test_password_reset_service.py (rate limit, token gen)
- frontend/src/components/password-reset/ForgotPasswordForm.tsx
- frontend/src/views/PasswordReset.tsx
- Updates to frontend/src/App.tsx

---

#### Developer B: User Stories 2 & 3 (Token Verification + Password Reset)

**Phase 4-5: User Stories 2 & 3** (T024-T045)

```
Timeline: 10:00-16:30 (6.5 hours)
```

**Phase 4: User Story 2** (T024-T032) (10:00-13:00)

**Tests First**:
- [ ] T024-T027: Create test_password_reset_verify.py
  - `test_verify_valid_token()` - valid token
  - `test_verify_expired_token()` - expired (410)
  - `test_verify_invalid_token()` - corrupted (400)
  - `test_verify_used_token()` - already used (400)

**Implementation**:
- [ ] T029: Implement `verify_token()` in password_reset_service.py
  - Hash token
  - Query DB
  - Check expiration + used_at
  - Return token record

- [ ] T030: Create GET /auth/password-reset/verify endpoint (optional)
  - Token validity check
  - Return metadata

- [ ] T031-T032: Frontend token verification components
  - ResetTokenVerification.tsx
  - Integration with PasswordReset.tsx view

**Phase 5: User Story 3** (T033-T045) (13:00-16:30)

**Tests First** (13:00-13:45):
- [ ] T033-T035: Create test_password_reset_full_flow.py
  - `test_password_reset_success()` - valid password
  - `test_password_reset_invalid_password()` - weak password (422)
  - `test_password_change_invalidates_old_tokens()` - cleanup tokens

- [ ] T036-T037: Unit tests
  - Password validation (all requirements)
  - Bcrypt hashing

**Implementation** (13:45-16:30):
- [ ] T040: Implement `_validate_password()` in service
  - 8+ chars, upper, lower, number, special char
  - Raise PasswordValidationError with details

- [ ] T041: Implement `verify_and_reset_password()` in service
  - Validate token
  - Validate password
  - Hash with bcrypt (cost ≥10)
  - Update User.password_hash
  - Mark token used
  - Invalidate other tokens
  - Log to AuditLog

- [ ] T042: Create POST /auth/password-reset/verify endpoint
  - Accept token + new_password
  - Call service
  - Return success + redirect

- [ ] T043-T045: Frontend password reset form + success view
  - PasswordResetForm.tsx (password input, validation display)
  - ResetSuccess.tsx (confirmation)
  - Integration

**Type Check & Linting** (16:30-16:45):
```bash
mypy app --strict && ruff check .
```

**Testing** (16:45-17:00):
```bash
pytest tests/integration/test_password_reset_full_flow.py -v
```

**Commit** (17:00):
```bash
git commit -m "feat(US2+US3): implement token verification and password reset flow"
```

**Dev B Files Created**:
- backend/app/services/password_reset_service.py (verify_token, _validate_password, verify_and_reset_password methods)
- backend/app/routers/password_reset_router.py (GET /verify, POST /verify endpoints)
- backend/tests/integration/test_password_reset_verify.py
- backend/tests/integration/test_password_reset_full_flow.py
- frontend/src/components/password-reset/PasswordResetForm.tsx
- frontend/src/components/password-reset/ResetSuccess.tsx
- frontend/src/components/password-reset/ResetTokenVerification.tsx (optional)

---

#### Developer C: Frontend Components + Backend Security (US4 & US5)

**Phase 6-7: User Stories 4 & 5** (T046-T065)

```
Timeline: 10:00-17:00 (7 hours)
```

**Parallel Tasks**:
- User Stories 4 & 5 are independent
- Can work on both token expiration + rate limiting in parallel

**User Story 4: Token Expiration** (10:00-12:30)

- [ ] T046-T049: Tests (1 hour)
  - Token expires after 24h
  - Token reuse prevention
  - Token invalidation on new request

- [ ] T050-T054: Implementation (1.5 hours)
  - Verify migration includes expiration index (T005 already done)
  - Update verify_token() to check expiration (in service)
  - Update verify_and_reset_password() to invalidate tokens (already done by Dev B)
  - Update request_password_reset() to invalidate previous tokens
  - Add error response handling (410 Gone for expired)

**User Story 5: Rate Limiting** (12:30-17:00)

- [ ] T055-T059: Tests (1.5 hours)
  - Rate limit 10-minute check per email
  - Rate limit 5-per-day check per email
  - Rate limit 10-per-minute check per IP
  - Rate limit reset after window expires

- [ ] T060-T065: Implementation (2 hours)
  - Implement _check_rate_limit() in service
  - Call from request_password_reset()
  - Add rate limiting decorator to routers
  - Handle 429 errors with retry_after_seconds
  - Frontend error handling (show retry timer)

**Type Check & Linting** (17:00-17:15):
```bash
mypy app --strict && ruff check . && npm run lint
```

**Testing** (17:15-17:30):
```bash
pytest tests/unit/test_password_reset_service.py::test_rate_limit -v
pytest tests/unit/test_password_reset_service.py::test_token_expiration -v
```

**Commit** (17:30):
```bash
git commit -m "feat(US4+US5): add token expiration and rate limiting"
```

**Dev C Files Created/Modified**:
- backend/app/services/password_reset_service.py (_check_rate_limit, expiration checks)
- backend/app/routers/password_reset_router.py (rate limiting decorators)
- backend/tests/unit/test_password_reset_service.py (rate limit + expiration tests)
- Updates to frontend error handling (show retry timer on 429)

---

**End of Day 2**:
- ✅ User Stories 1-5 COMPLETE (all acceptance criteria)
- ✅ 3 feature commits pushed
- ✅ All backend endpoints working
- ✅ All frontend components built
- ✅ Rate limiting enforced
- ✅ Token expiration working
- ✅ Type checking passes (3-person team)
- ✅ Unit tests passing

**MVP Ready for Testing** ✅

---

### Day 3: Integration, Polish & Release (All Team Together)

**Morning (9:00-12:00)**: Integration Testing + Conflict Resolution

**All developers reunite for integration**:

1. **Merge conflicts resolution** (30 min)
   ```bash
   git pull origin 007-password-recovery
   # Handle any merge conflicts from parallel development
   # Usually minimal if developers followed file assignments
   ```

2. **Integration testing** (30 min)
   ```bash
   # Start services
   cd backend && uvicorn app.main:app --reload &
   cd ../frontend && npm run dev &

   # Test full flow: request → email → verify → reset → login
   # Open http://localhost:5173/password-reset
   ```

3. **Manual QA checklist** (T084) (45 min)
   - [ ] Request password reset for registered email
   - [ ] Check email for link
   - [ ] Click link, form displays
   - [ ] Invalid password shows validation errors
   - [ ] Valid password accepted
   - [ ] Redirect to login
   - [ ] Login with new password succeeds
   - [ ] Login with old password fails
   - [ ] Test rate limiting: 2 requests in 5 min → error on 2nd
   - [ ] Test token expiration (manually update DB to old timestamp)

4. **Fix any integration bugs** (15 min)
   - Small issues from parallel development
   - Cross-cutting concerns

**Afternoon (13:00-17:00)**: Phase 8 Polish & Documentation

**Developer A**: Testing + Code Quality
- [ ] T066-T075: Run full test suite
  ```bash
  pytest backend/tests/ -v --cov=app.services.password_reset_service --cov-report=html
  npm run test -- password-reset
  ```
  - Target: >80% coverage
  - All tests green ✅

- [ ] T069-T072: Type checking + Linting
  ```bash
  mypy backend/app --strict          # 0 errors
  ruff check backend/                # 0 errors
  tsc --noEmit                       # 0 errors
  npm run lint                       # 0 errors
  ```

**Developer B**: Documentation
- [ ] T076-T081: Update documentation
  - Email template finalization
  - .env.example with placeholders
  - README updates
  - Seed data (optional)

- [ ] T086: Verify all spec documents are current

**Developer C**: Security Audit
- [ ] T082-T083: Security review
  - No plaintext tokens in logs ✅
  - Passwords hashed with bcrypt ✅
  - Rate limiting effective ✅
  - Clean Architecture principles followed ✅

- [ ] T087: Create IMPLEMENTATION_INDEX.md with summary

**Final Testing** (16:00-16:30):
```bash
# Full end-to-end
docker-compose up -d
# Wait for services
sleep 5
# Test full flow
# Verify both containers healthy
docker-compose logs
```

**Final Commit** (16:30):
```bash
git commit -m "feat: password recovery complete - testing, docs, security validated"
```

**Prepare for Merge** (16:30-17:00):
- [ ] Create PR: `git push origin 007-password-recovery`
- [ ] All checks pass in CI/CD (if configured)
- [ ] Code review completed (optional: have another team member review)
- [ ] Merge to main: `git merge 007-password-recovery`

**End of Day 3**:
- ✅ All 87 tasks complete
- ✅ >80% test coverage
- ✅ 0 type errors, 0 linting errors
- ✅ Manual QA passed (all scenarios)
- ✅ Security audit passed
- ✅ Documentation complete
- ✅ **READY FOR PRODUCTION DEPLOYMENT** 🚀

---

## Git Workflow for Parallel Team

### Initial Setup (Day 1 Morning)

```bash
# All developers
git fetch origin
git checkout 007-password-recovery
git pull origin 007-password-recovery
```

### During Development (Day 2-3)

**Option A: Single Shared Branch** (Recommended for 3 developers)
```bash
# All developers push to 007-password-recovery
# Frequently pull to stay in sync
git pull origin 007-password-recovery
git push origin 007-password-recovery
```

**Commit Strategy**:
- Commit frequently (every task or logical group)
- Use clear messages: `git commit -m "feat(US1): implement request password reset service"`
- Push to origin at least once per phase

**Conflict Avoidance**:
- Dev A: Only touches `backend/app/services/password_reset_service.py` + `backend/app/routers/password_reset_router.py`
- Dev B: Only touches service methods (T029, T040-T041) + router endpoints (T042)
- Dev C: Only touches `backend/tests/` + rate limiting implementation

**Minimal Conflicts Expected**:
- Different files = no conflicts
- Same file (service.py): Each dev adds different methods (request_password_reset, verify_token, verify_and_reset_password, _check_rate_limit) → conflicts manageable
  - Merge conflict resolution: Keep both methods, resolve import order

### Final Merge (Day 3 EOD)

```bash
# Ensure all commits pushed
git push origin 007-password-recovery

# Create PR for review (if required)
gh pr create --title "feat: password recovery feature (007)" \
  --body "Complete password recovery flow with security hardening"

# After review approval
git checkout main
git pull origin main
git merge 007-password-recovery
git push origin main
```

---

## Daily Sync Format (15 minutes each morning)

```
9:00 AM Daily Standup:

Dev A (Backend Foundation + US1):
  - Yesterday: Completed Phase 1-2, working on US1
  - Today: Finish US1 tests and implementation
  - Blockers: None

Dev B (US2 + US3):
  - Yesterday: Waiting for Phase 2 completion
  - Today: Start US2 token verification (Phase 4)
  - Blockers: Need PasswordResetToken model from Dev A ✅ ready

Dev C (Frontend + US4 + US5):
  - Yesterday: Created types and services
  - Today: Build frontend components + US4 expiration logic
  - Blockers: None

Next Sync: 9:00 AM Day 2
```

---

## File Assignment Matrix (No Conflicts)

| File | Primary Dev | Secondary Dev | Conflict Risk |
|------|------------|---------------|---------------|
| `backend/app/models/password_reset_token.py` | Dev A | - | None |
| `backend/app/schemas/password_reset.py` | Dev A | - | None |
| `backend/app/services/password_reset_service.py` | Dev A + Dev B + Dev C | All | Low (different methods) |
| `backend/app/routers/password_reset_router.py` | Dev A + Dev B | Both | Low (different endpoints) |
| `backend/alembic/versions/` | Dev A | - | None |
| `backend/tests/` | Dev A + Dev B + Dev C | All | None (different test files) |
| `frontend/src/types/passwordReset.ts` | Dev C | - | None |
| `frontend/src/services/passwordResetService.ts` | Dev C | - | None |
| `frontend/src/components/password-reset/` | Dev C | - | None |
| `frontend/src/views/PasswordReset.tsx` | Dev C | - | None |
| `frontend/src/App.tsx` | Dev C | - | Low (add one route) |

**Conflict Management**:
- service.py: Multiple methods → rebase frequently, communicate method names
- router.py: Multiple endpoints → coordinate endpoint paths
- App.tsx: Only one route added → no conflict
- Other files: 0 conflict risk

---

## Testing Strategy for Parallel Teams

### Unit Tests (Parallel, No Dependencies)
```
Dev A: backend/tests/unit/test_password_reset_service.py
       - test_request_password_reset_*
       - test_token_generation_*
       - test_rate_limit_*

Dev B: backend/tests/unit/test_password_reset_service.py (same file, different methods)
       - test_verify_token_*
       - test_password_validation_*

Dev C: backend/tests/unit/test_password_reset_service.py (same file, different methods)
       - test_token_expiration_*
       - test_rate_limit_enforcement_*
```

**Run Together**:
```bash
pytest backend/tests/unit/test_password_reset_service.py -v
```

### Integration Tests (Parallel)
```
Dev A: backend/tests/integration/test_password_reset_request.py
Dev B: backend/tests/integration/test_password_reset_full_flow.py
Dev C: (no new integration tests, unit tests sufficient)
```

### Frontend Tests (Parallel, Dev C Only)
```bash
npm run test -- password-reset
```

### E2E Testing (Day 3, All Together)
```bash
# Full flow: request → email → verify → reset → login
# Manual testing with browser
# 15-minute manual QA checklist (T084)
```

---

## Quality Gates (All Must Pass Before Merge)

### Type Safety
```bash
# Backend
mypy backend/app --strict
# Frontend
tsc --noEmit
```

### Linting
```bash
# Backend
ruff check backend/
# Frontend
npm run lint
```

### Testing
```bash
# Backend
pytest backend/tests/ --cov=app.services.password_reset_service -v
# Target: >80% coverage
# Frontend
npm run test -- password-reset
# Target: All tests green
```

### Manual QA Checklist (T084)
- [ ] Request password reset (email → success message)
- [ ] Receive email with link
- [ ] Click link → form displays
- [ ] Enter invalid password → validation error
- [ ] Enter valid password → success + redirect
- [ ] Login with new password → success
- [ ] Login with old password → fail
- [ ] Test rate limiting (2 requests → 2nd fails)
- [ ] Test token expiration (wait 24h or mock time)

### Security Audit
- [ ] No plaintext tokens in logs
- [ ] Passwords hashed with bcrypt (cost ≥10)
- [ ] Rate limiting enforced
- [ ] HTTPS/TLS enforced (headers)
- [ ] Tenant isolation verified

---

## Communication Protocol

### Slack/Chat Channels
```
#password-recovery          # Daily discussions
#code-review               # Pull request reviews
#blockers                  # Urgent blockers
```

### Daily Meetings
- **9:00 AM**: 15-min standup (status, blockers, sync)
- **12:00 PM**: 15-min sync (lunch break checkpoint)
- **15:00 PM**: 30-min integration checkpoint (Day 3 only)

### Escalation Path
```
Dev A/B/C blocked?
  ↓
Slack message in #blockers
  ↓
Tech Lead responds within 15 minutes
  ↓
Unblock or adjust task assignment
```

---

## Success Criteria for Parallel Execution

✅ **Day 1 Complete**: All of Phase 1 + Phase 2 working
- Database migrations applied
- Models compile
- All type checking passes

✅ **Day 2 Complete**: All User Stories 1-5 implemented
- Endpoints working
- Frontend components render
- Unit tests passing (80%+ coverage)

✅ **Day 3 Complete**: Integration, testing, merge to main
- Full E2E flow tested
- Type checking: 0 errors
- Linting: 0 errors
- Security audit: passed
- Manual QA: all scenarios passed
- **Ready for production deployment** 🚀

---

## Troubleshooting Parallel Development

### Issue: Merge Conflict in service.py
**Solution**:
```bash
git fetch origin
git merge origin/007-password-recovery
# Resolve: Keep both methods, coordinate import order
# Retest: pytest tests/ (ensure both methods work together)
git push origin 007-password-recovery
```

### Issue: Test failure in integration tests
**Solution**:
```bash
# Identify which test failing
pytest tests/integration/test_password_reset_full_flow.py::test_name -v

# Debug with Dev who wrote test
# Fix in that dev's PR
git add tests/
git commit -m "fix(tests): resolve test failure in password reset flow"
```

### Issue: Type checking fails
**Solution**:
```bash
mypy app --strict
# Copy error output, fix type annotations
# Rerun: mypy app --strict (should pass)
```

### Issue: Frontend not connecting to backend
**Solution**:
```bash
# Check backend running: curl http://localhost:8000/docs
# Check frontend VITE_API_BASE env var
# Verify CORS configured in FastAPI
# Check browser console for 404/CORS errors
```

---

## Celebration 🎉

**End of Day 3**: Feature 007 Password Recovery is complete and deployed to production!

- ✅ Users can recover forgotten passwords
- ✅ Secure token-based reset flow
- ✅ Rate limiting prevents abuse
- ✅ Token expiration enforced
- ✅ Full audit logging
- ✅ Type-safe code (mypy + TypeScript strict)
- ✅ >80% test coverage
- ✅ 0 linting errors
- ✅ 0 production incidents

**Team learned**:
- How to execute large features in parallel
- Clean Architecture in practice
- Security-first development (bcrypt, tokens, rate limiting)
- Type safety benefits (caught bugs early)
- Test-driven development benefits

**Next feature**: Ready for Feature 008! 🚀
