# Requirements Checklist: Admin-Driven Shift Hours & Extra Hours

**Feature**: 010-admin-shift-time-tracking

## Removal of manual marking

- [ ] CHK001 Employee dashboard no longer renders any clock-in/out widget.
- [ ] CHK002 Endpoints `clock-in`, `clock-out`, `today`, `records` (employee) return 404.
- [ ] CHK003 Legacy admin endpoints `/shifts/clock-in` and `/shifts/{id}/clock-out` return 404.
- [ ] CHK004 `TimeRecord` model removed and `time_record` table dropped via migration.
- [ ] CHK005 No residual references to `TimeRecord` in backend (`grep -r TimeRecord backend/app`).

## Shift-derived hours

- [ ] CHK006 Worked hours are generated from assigned shifts (`TimeEntry`, `source="shift"`).
- [ ] CHK007 Employee sees monthly total hours (read-only) in dashboard.

## Extra hours

- [ ] CHK008 Admin can create extra hours for an employee (`source="extra"`).
- [ ] CHK009 Moderador can create extra hours.
- [ ] CHK010 Empleado receives 403 when attempting to create extra hours.
- [ ] CHK011 `hours <= 0` or `> 24` returns 400.
- [ ] CHK012 Non-existent / cross-tenant employee returns 404.
- [ ] CHK013 Extra hours stored with `start_time/end_time/shift_type_id = NULL`.
- [ ] CHK014 Multiple extra entries for same employee/date are allowed and sum.
- [ ] CHK015 Statistics include extra hours in total AND report `extra_hours` separately.
- [ ] CHK016 Audit log records extra-hours creation (actor, target, hours).

## Quality gates

- [ ] CHK017 `mypy app --strict` passes.
- [ ] CHK018 `ruff check .` passes.
- [ ] CHK019 `pytest` passes (manual-clock tests removed/updated; extra-hours tests added).
- [ ] CHK020 Frontend `npm run lint` and `npm run build` pass.
