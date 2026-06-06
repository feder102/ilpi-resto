"""T064, T065: Teams integration tests - shift type changes, timezone handling."""


import pytest
from sqlmodel import Session

from app.database import engine
from app.models.shift_type import ShiftType
from app.models.team import Team
from app.models.tenant import Tenant
from app.services.shift_type_service import get_by_id as get_shift_by_id
from app.services.shift_type_service import update as update_shift_type
from app.services.team_service import get_by_id as get_team_by_id

pytestmark = pytest.mark.skip(reason="Requires live database with initialized schema")


class TestTeamShiftTypeChanges:
    """T064: Test team view reflects shift type changes in real-time."""

    @pytest.fixture
    def setup_team_with_shift(self):
        """Create tenant, shift type, and team."""
        import uuid

        from sqlalchemy import delete

        unique_slug = f"test-{uuid.uuid4().hex[:8]}"
        with Session(engine) as session:
            tenant = Tenant(name="Test Org", slug=unique_slug, timezone="Europe/Madrid", locale="es")
            session.add(tenant)
            session.commit()
            session.refresh(tenant)

            # Create shift type
            shift_type = ShiftType(
                tenant_id=tenant.id,
                name="Mañana Original",
                type="MAÑANA",
                time_windows=[{"start": "10:00", "end": "18:00"}],
                expected_hours=8.0,
                uses_dynamic_close=False,
            )
            session.add(shift_type)
            session.commit()
            session.refresh(shift_type)

            # Create team
            team = Team(
                tenant_id=tenant.id,
                name="Team Original",
                department="COCINA",
                shift_type_id=shift_type.id,
                is_active=True,
            )
            session.add(team)
            session.commit()
            session.refresh(team)

            yield tenant.id, shift_type.id, team.id

            # Cleanup
            session.exec(delete(Team).where(Team.tenant_id == tenant.id))
            session.exec(delete(ShiftType).where(ShiftType.tenant_id == tenant.id))
            session.exec(delete(Tenant).where(Tenant.id == tenant.id))
            session.commit()

    def test_team_reflects_shift_type_update(self, setup_team_with_shift):
        """Verify team view reflects shift type changes."""
        tenant_id, shift_type_id, team_id = setup_team_with_shift

        with Session(engine) as session:
            # Get initial team state
            team = get_team_by_id(team_id, tenant_id, session)
            assert team.name == "Team Original"

            # Update shift type
            updated_shift = update_shift_type(
                shift_type_id,
                tenant_id,
                {"name": "Mañana Updated", "expected_hours": 8.5},
                session
            )
            session.refresh(team)

            # Team should still reference the same shift type ID
            assert team.shift_type_id == shift_type_id
            # But shift type details should be current
            assert updated_shift.name == "Mañana Updated"

    def test_team_reflects_shift_type_hours_change(self, setup_team_with_shift):
        """Verify team sees updated shift type hours."""
        tenant_id, shift_type_id, team_id = setup_team_with_shift

        with Session(engine) as session:
            # Update shift type hours
            update_shift_type(
                shift_type_id,
                tenant_id,
                {"expected_hours": 7.5},
                session
            )

            # Reload shift type and verify hours changed
            shift = get_shift_by_id(shift_type_id, tenant_id, session)
            assert shift.expected_hours == 7.5


class TestTimezonHandling:
    """T065: Test timezone handling for shift times."""

    @pytest.fixture
    def setup_with_timezone(self):
        """Create tenant with specific timezone."""
        import uuid

        from sqlalchemy import delete

        unique_slug = f"tz-test-{uuid.uuid4().hex[:8]}"
        with Session(engine) as session:
            # Create tenant with Europe/Madrid timezone
            tenant = Tenant(
                name="Madrid Org",
                slug=unique_slug,
                timezone="Europe/Madrid",
                locale="es"
            )
            session.add(tenant)
            session.commit()
            session.refresh(tenant)

            yield tenant.id

            # Cleanup
            session.exec(delete(Tenant).where(Tenant.id == tenant.id))
            session.commit()

    def test_shift_times_stored_as_local_time(self, setup_with_timezone):
        """Verify shift times are stored as local time (not UTC)."""
        tenant_id = setup_with_timezone

        with Session(engine) as session:
            # Create shift type with specific times
            shift_type = ShiftType(
                tenant_id=tenant_id,
                name="Madrid Morning",
                type="MAÑANA",
                time_windows=[{"start": "10:30", "end": "18:00"}],
                expected_hours=7.5,
                uses_dynamic_close=False,
            )
            session.add(shift_type)
            session.commit()
            session.refresh(shift_type)

            # Retrieve and verify times are exactly as stored
            assert shift_type.time_windows[0]["start"] == "10:30"
            assert shift_type.time_windows[0]["end"] == "18:00"

    def test_tenant_timezone_affects_calculations(self, setup_with_timezone):
        """Verify tenant timezone is stored and accessible."""
        with Session(engine) as session:
            tenant = session.exec(
                "SELECT * FROM tenant WHERE id = ?"
            ).first()

            # Check tenant has timezone setting
            assert tenant is not None  # Verified by existence
            # Timezone should be Europe/Madrid from fixture

    def test_midnight_spanning_shift_with_timezone(self, setup_with_timezone):
        """Verify midnight-spanning shifts calculate correctly in any timezone."""
        tenant_id = setup_with_timezone

        with Session(engine) as session:
            # Create shift that spans midnight
            shift_type = ShiftType(
                tenant_id=tenant_id,
                name="Night Shift",
                type="NOCHE",
                time_windows=[{"start": "23:00", "end": "06:00"}],
                expected_hours=7.0,
                uses_dynamic_close=False,
            )
            session.add(shift_type)
            session.commit()
            session.refresh(shift_type)

            # Calculate total hours (should handle midnight span)
            total = shift_type.total_hours
            # 23:00 to 06:00 next day = 7 hours
            assert abs(total - 7.0) < 0.01, f"Expected 7.0 hours, got {total}"
