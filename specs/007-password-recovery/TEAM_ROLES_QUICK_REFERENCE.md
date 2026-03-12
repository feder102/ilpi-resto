# Team Roles Quick Reference

**Feature**: 007-password-recovery
**Duration**: 2-3 days
**Team Size**: 3+ developers
**Execution Model**: Parallel

---

## Role Assignments at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│ DEVELOPER A: Backend Foundation + User Story 1              │
│ "Request Password Reset"                                    │
├─────────────────────────────────────────────────────────────┤
│ Day 1: Phase 1-2 (Setup + Foundational)                     │
│   - Database migrations (T005-T007)                         │
│   - PasswordResetToken model (T008-T009)                    │
│   - Password reset service base (T010)                      │
│                                                              │
│ Day 2: Phase 3 (User Story 1)                               │
│   - Tests: request_password_reset tests (T013-T017)         │
│   - Service: request_password_reset() method (T018)         │
│   - Router: POST /auth/password-reset/request (T019)        │
│   - Register router (T020)                                  │
│   - Frontend: ForgotPasswordForm.tsx (T021-T023)            │
│                                                              │
│ Day 3: Integration + Testing                                │
│   - Full test suite (T066-T075)                             │
│   - Type checking + linting (T069-T072)                     │
│   - Manual QA (T084)                                        │
│   - Security audit (T082-T083)                              │
│                                                              │
│ Files: 12 (models, migrations, service, router, tests, UI) │
│ Duration: ~6 hours Day 1 + 6 hours Day 2 + 4 hours Day 3   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ DEVELOPER B: User Stories 2 & 3                             │
│ "Token Verification + Password Reset"                       │
├─────────────────────────────────────────────────────────────┤
│ Day 1: Wait for Phase 1-2 completion                        │
│   - (Parallel: code review, planning, setup dev environment)│
│                                                              │
│ Day 2: Phase 4-5 (User Stories 2-3)                         │
│   Phase 4 (10:00-13:00):                                    │
│   - Tests: verify_token tests (T024-T027)                   │
│   - Service: verify_token() method (T029)                   │
│   - Router: GET /auth/password-reset/verify (T030)          │
│   - Frontend: Token verification components (T031-T032)     │
│                                                              │
│   Phase 5 (13:00-16:30):                                    │
│   - Tests: password reset tests (T033-T039)                 │
│   - Service: password validation + verify_and_reset (T040-T041)
│   - Router: POST /auth/password-reset/verify (T042)         │
│   - Frontend: PasswordResetForm + ResetSuccess (T043-T045)  │
│                                                              │
│ Day 3: Integration + Testing                                │
│   - Conflict resolution (service.py merging)                │
│   - Integration testing                                     │
│                                                              │
│ Files: 8 (service methods, router endpoints, components)    │
│ Duration: ~6.5 hours Day 2 + 3 hours Day 3                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ DEVELOPER C: Frontend Setup + User Stories 4 & 5            │
│ "Token Expiration + Rate Limiting"                          │
├─────────────────────────────────────────────────────────────┤
│ Day 1: Phase 1-2 (Types + Services)                         │
│   - Frontend types (T011)                                   │
│   - Frontend API service (T012)                             │
│   - (Parallel with other devs on backend)                   │
│                                                              │
│ Day 2: Phase 6-7 (User Stories 4-5)                         │
│   Phase 4 (10:00-12:30):                                    │
│   - Tests: token expiration tests (T046-T049)               │
│   - Service: expiration logic (T050-T054)                   │
│   - Router: error handling (410 Gone)                       │
│                                                              │
│   Phase 5 (12:30-17:00):                                    │
│   - Tests: rate limiting tests (T055-T059)                  │
│   - Service: _check_rate_limit() method (T060-T062)         │
│   - Router: rate limiting decorators (T063)                 │
│   - Frontend: error handling + retry timer (T064)           │
│   - Cleanup tasks (T065, deferred to post-MVP)              │
│                                                              │
│ Day 3: Integration + Polish                                 │
│   - Documentation finalization (T076-T081)                  │
│   - Final testing                                           │
│                                                              │
│ Files: 15 (frontend components, service methods, tests)     │
│ Duration: ~3 hours Day 1 + 7 hours Day 2 + 4 hours Day 3    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ OPTIONAL DEVELOPER D: QA + Testing Lead                     │
│ "Testing + Quality Assurance"                               │
├─────────────────────────────────────────────────────────────┤
│ Day 1: Review plan + environment setup                      │
│                                                              │
│ Day 2: Create test infrastructure                           │
│   - Mock data for testing                                   │
│   - Test email service setup                                │
│                                                              │
│ Day 3: Full Phase 8 (Testing + QA)                          │
│   - Run full test suite (T066-T075)                         │
│   - Manual QA checklist (T084)                              │
│   - Performance testing (optional)                          │
│   - Security audit (T082-T083)                              │
│                                                              │
│ Files: Test infrastructure + QA reports                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ OPTIONAL DEVELOPER E: Documentation Lead                    │
│ "Docs + Deployment"                                         │
├─────────────────────────────────────────────────────────────┤
│ Day 1-2: Parallel - Create doc templates                    │
│                                                              │
│ Day 3: Phase 8 Documentation                                │
│   - Email templates (T076)                                  │
│   - Environment setup docs (T077-T078)                      │
│   - README updates (T079-T080)                              │
│   - Implementation index (T087)                             │
│   - Deployment checklist                                    │
│   - Post-launch support plan                                │
│                                                              │
│ Files: Documentation + deployment guides                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Daily Task Checklist

### Day 1: Setup + Foundational (All Team Together)

**Morning (9:00-12:00)**: Planning Sync
- [ ] Clone branch: `git checkout 007-password-recovery`
- [ ] All review spec.md (20 min)
- [ ] All review plan.md (15 min)
- [ ] Review data-model.md together (15 min)
- [ ] Walkthrough tasks.md Phase 1-2 (15 min)
- [ ] Git workflow agreement (15 min)

**Afternoon (13:00-18:00)**: Phase 1 & 2 Execution

| Time | Task | Owner | Verify |
|------|------|-------|--------|
| 13:00-13:45 | Create schemas, exceptions, types (T001-T004) | All | `git log --oneline` (4 commits) |
| 13:45-14:15 | Database migrations (T005-T007) | Dev A | `psql -c "\\dt password_reset"` |
| 14:15-15:00 | Models + service base (T008-T010) | Dev A+B | `mypy app --strict` passes |
| 15:00-15:30 | Frontend types + service (T011-T012) | Dev C | `tsc --noEmit` passes |
| 15:30-16:00 | Code review + sync | All | `git status` (all committed) |
| 16:00-17:00 | Parallel setup debugging | All | Backend/frontend start cleanly |

**End of Day 1 Checklist**:
- [ ] Database schema created (migrations ran successfully)
- [ ] `mypy app --strict` passes (0 errors)
- [ ] `tsc --noEmit` passes (0 errors)
- [ ] Models importable in Python
- [ ] Types importable in TypeScript
- [ ] 4 commits pushed to `007-password-recovery`
- [ ] All developers ready for parallel work (Day 2)

---

### Day 2: Parallel Development (Teams Split)

**Morning (9:00-10:00)**: Daily Standup + Sync

```
Dev A: "Building US1 (request reset endpoint + tests)"
Dev B: "Building US2 & US3 (token verify + password reset)"
Dev C: "Building US4 & US5 (expiration + rate limiting)"

Questions:
- Any blockers?
- Any questions on file locations?
- API contract clarity?

Coordination:
- Dev A finishes router by 15:00 (Dev B may need it)
- Dev B tests against Dev A's router implementation
- Dev C independent (unit tests sufficient)
```

**10:00-17:00**: Parallel Execution

| Dev | Phase | Start | End | Checkpoint | Verify |
|-----|-------|-------|-----|------------|--------|
| A | US1 (Tests first) | 10:00 | 11:30 | Tests written, failing ✓ | `pytest tests/ -v` (FAIL) |
| A | US1 (Implementation) | 11:30 | 16:00 | All tests pass ✓ | `pytest tests/` (PASS) |
| A | Type check + Lint | 16:00 | 16:30 | 0 errors ✓ | `mypy` + `ruff` (PASS) |
| A | Commit | 16:30 | 17:00 | Push to origin ✓ | `git log` (last commit visible) |
| | | | | | |
| B | US2 (Tests) | 10:00 | 11:00 | Tests written, failing ✓ | `pytest tests/` (FAIL) |
| B | US2 (Implementation) | 11:00 | 13:00 | All tests pass ✓ | `pytest tests/` (PASS) |
| B | US3 (Tests) | 13:00 | 13:45 | Tests written, failing ✓ | `pytest tests/` (FAIL) |
| B | US3 (Implementation) | 13:45 | 16:30 | All tests pass ✓ | `pytest tests/` (PASS) |
| B | Type check + Lint | 16:30 | 16:45 | 0 errors ✓ | `mypy` + `ruff` (PASS) |
| B | Commit | 16:45 | 17:00 | Push to origin ✓ | `git log` (last commit visible) |
| | | | | | |
| C | US4 (Tests + Impl) | 10:00 | 12:30 | All tests pass ✓ | `pytest tests/unit/` (PASS) |
| C | US5 (Tests + Impl) | 12:30 | 16:00 | All tests pass ✓ | `pytest tests/unit/` (PASS) |
| C | Type check + Lint | 16:00 | 16:30 | 0 errors ✓ | `mypy` + `tsc` (PASS) |
| C | Commit | 16:30 | 17:00 | Push to origin ✓ | `git log` (last commit visible) |

**End of Day 2 Checklist**:
- [ ] All 5 user stories implemented (US1-US5)
- [ ] All tests passing (>80% coverage target)
- [ ] Type checking: `mypy app --strict` (0 errors)
- [ ] Linting: `ruff check .` (0 errors)
- [ ] Frontend: `tsc --noEmit` (0 errors)
- [ ] Frontend: `npm run lint` (0 errors)
- [ ] 3 feature commits pushed to `007-password-recovery`
- [ ] No merge conflicts (different files)
- [ ] **MVP READY FOR TESTING** ✅

---

### Day 3: Integration + Release (All Team Together)

**Morning (9:00-12:00)**: Integration Testing

| Time | Task | Owner | Verify |
|------|------|-------|--------|
| 09:00-09:30 | Pull latest + resolve conflicts (if any) | Dev A | `git status` clean |
| 09:30-10:00 | Start backend + frontend | All | Both running at `http://localhost:5173` |
| 10:00-11:00 | Full E2E manual testing (T084) | Dev A (lead) | All 10 scenarios ✓ |
| 11:00-11:30 | Fix integration bugs (if any) | All | Zero blocker bugs |
| 11:30-12:00 | Sync + checkpoint | All | Ready for afternoon polish |

**E2E Test Scenarios (T084)**:
1. [ ] Request password reset (email → success)
2. [ ] Receive email with link
3. [ ] Click link → password form displays
4. [ ] Invalid password → validation error
5. [ ] Valid password → success redirect
6. [ ] Login with new password → success ✓
7. [ ] Login with old password → fail ✓
8. [ ] Rate limiting (2 requests → 2nd fails)
9. [ ] Token expiration (optional: mock time)
10. [ ] Complete flow timing (<5 minutes)

**Afternoon (13:00-17:00)**: Phase 8 Polish + Release

| Time | Task | Owner | Verify |
|------|------|-------|--------|
| 13:00-13:30 | Full test suite (T066-T075) | Dev A | `pytest` + `npm test` (PASS) |
| 13:30-14:00 | Coverage report (target >80%) | Dev A | `pytest --cov` (80%+) |
| 14:00-14:15 | Security audit (T082) | Dev C | Checklist ✓ |
| 14:15-14:30 | Code review (Clean Architecture) | Dev B | Principles validated ✓ |
| 14:30-15:00 | Documentation finalize (T076-T081) | Dev B + D | Docs complete ✓ |
| 15:00-15:30 | Create IMPLEMENTATION_INDEX.md (T087) | Dev C | Summary complete ✓ |
| 15:30-16:00 | Final verification + checklist | All | All gates passed ✓ |
| 16:00-16:30 | Create merge PR | Dev A | PR created + reviewed ✓ |
| 16:30-17:00 | Merge to main + celebrate 🎉 | Dev A | Main updated ✓ |

**Final Checklist Before Merge**:

**Code Quality** ✅
- [ ] `mypy app --strict` (0 errors)
- [ ] `ruff check .` (0 errors)
- [ ] `tsc --noEmit` (0 errors)
- [ ] `npm run lint` (0 errors)

**Testing** ✅
- [ ] Backend unit tests (PASS)
- [ ] Backend integration tests (PASS)
- [ ] Frontend component tests (PASS)
- [ ] Coverage >80%
- [ ] Manual E2E (all 10 scenarios PASS)

**Security** ✅
- [ ] No plaintext tokens in logs
- [ ] Passwords hashed with bcrypt (cost ≥10)
- [ ] Rate limiting enforced
- [ ] HTTPS headers present
- [ ] Tenant isolation verified

**Documentation** ✅
- [ ] README.md updated
- [ ] Email templates finalized
- [ ] .env.example created
- [ ] IMPLEMENTATION_INDEX.md created
- [ ] Quickstart.md matches implementation

**Ready for Deployment** ✅
- [ ] All commits pushed
- [ ] PR reviewed and approved
- [ ] CI/CD passing (if configured)
- [ ] Merged to main
- [ ] Tag release: `git tag v1.0.0-password-recovery`

---

## Quick Troubleshooting

### "Type checking failing"
```bash
# Dev experiencing: mypy app --strict or tsc --noEmit fails

Solution:
1. mypy app --strict (copy full error)
2. Fix type annotations (usually import or missing type)
3. Rerun: mypy app --strict (should pass)
4. Rerun all: pytest tests/ (ensure fix doesn't break tests)
5. Commit: git commit -m "fix(types): resolve mypy errors"
```

### "Merge conflict in service.py"
```bash
# Multiple devs edited password_reset_service.py

Solution:
1. git fetch origin
2. git merge origin/007-password-recovery
3. Resolve: Keep all methods from both devs
4. Verify: mypy app --strict (0 errors)
5. Test: pytest tests/ (all pass)
6. Commit: git commit -m "merge: resolve service.py conflicts"
7. Push: git push origin 007-password-recovery
```

### "Frontend not calling backend"
```bash
# Frontend can't reach backend API

Checklist:
1. Backend running? curl http://localhost:8000/docs (should 200)
2. Frontend env var? Check VITE_API_BASE in frontend/.env
3. CORS configured? Check FastAPI add_middleware(CORSMiddleware)
4. Port correct? Frontend expects 8000, has it configured?
5. Network? Check browser console (should see API calls)

Fix:
- Update frontend/.env: VITE_API_BASE=http://localhost:8000
- Restart frontend: Ctrl+C, npm run dev
- Check: curl http://localhost:8000/docs (backend OK?)
```

---

## Success Metrics (End of Day 3)

✅ **Feature Complete**: Password recovery fully implemented
✅ **Tests**: >80% coverage, all passing
✅ **Type Safety**: 0 errors (mypy + tsc)
✅ **Code Quality**: 0 linting errors
✅ **Security**: Bcrypt + rate limiting + tokens + audit logging
✅ **Manual QA**: All 10 scenarios passed
✅ **Documentation**: Complete and accurate
✅ **Deployment**: Ready for production

🎉 **Password Recovery Feature Released to Production!**

---

## Post-Release (Day 4+)

**Monitor**:
- [ ] No production errors in logs
- [ ] Password reset request volume reasonable
- [ ] Email delivery success rate >95%
- [ ] Rate limiting blocking attacks (monitor 429 errors)

**Deferred to Future Sprints**:
- [ ] Async email queue (Celery + Redis)
- [ ] SMS-based password reset
- [ ] Password reset history/audit dashboard
- [ ] Multi-language support
- [ ] Rate limit analytics

**Next Feature**: 008-... (TBD by team)
