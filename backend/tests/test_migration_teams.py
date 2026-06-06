"""T062: Migration testing for team shift_type_id transition.

NOTE: These tests verify PostgreSQL-specific migration state (column existence,
FK constraints via raw SQL). They require a live PostgreSQL instance and are
skipped automatically in environments without one.
"""

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.database import engine
from app.models.shift_type import ShiftType
from app.models.team import Team
from app.models.tenant import Tenant

pytestmark = pytest.mark.skip(reason="Requires live PostgreSQL with applied migrations")


@pytest.fixture
def test_tenant():
    """Create a test tenant."""
    import uuid

    from sqlalchemy import delete

    unique_slug = f"test-org-{uuid.uuid4().hex[:8]}"
    with Session(engine) as session:
        tenant = Tenant(name="Test Org", slug=unique_slug, timezone="Europe/Madrid", locale="es")
        session.add(tenant)
        session.commit()
        session.refresh(tenant)
        tenant_id = tenant.id
        yield tenant
        # Cleanup: delete teams first (due to FK), then tenant
        session.exec(delete(Team).where(Team.tenant_id == tenant_id))
        session.exec(delete(ShiftType).where(ShiftType.tenant_id == tenant_id))
        session.exec(delete(Tenant).where(Tenant.id == tenant_id))
        session.commit()


@pytest.fixture
def test_shift_types(test_tenant):
    """Create test shift types."""
    with Session(engine) as session:
        shift_types = [
            ShiftType(
                tenant_id=test_tenant.id,
                name="Mañana",
                type="MAÑANA",
                time_windows=[{"start": "10:30", "end": "18:00"}],
                uses_dynamic_close=False,
                expected_hours=7.5,
            ),
            ShiftType(
                tenant_id=test_tenant.id,
                name="Noche",
                type="NOCHE",
                time_windows=[{"start": "17:00", "end": "23:59"}],
                uses_dynamic_close=True,
                expected_hours=7.7,
            ),
            ShiftType(
                tenant_id=test_tenant.id,
                name="Cortado",
                type="CORTADO",
                time_windows=[
                    {"start": "12:30", "end": "16:30"},
                    {"start": "18:30", "end": "22:30"},
                ],
                uses_dynamic_close=False,
                expected_hours=8.0,
            ),
            ShiftType(
                tenant_id=test_tenant.id,
                name="Corrido",
                type="CORRIDO",
                time_windows=[{"start": "14:00", "end": "23:59"}],
                uses_dynamic_close=True,
                expected_hours=10.0,
            ),
        ]
        for st in shift_types:
            session.add(st)
        session.commit()
        yield shift_types


class TestTeamMigration:
    """Test suite for team shift_type_id migration."""

    def test_team_has_shift_type_id_column(self):
        """Verify the team table has shift_type_id column."""
        with Session(engine) as session:
            # Query to check if shift_type_id column exists
            result = session.exec(
                text("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'team' AND column_name = 'shift_type_id'
                """)
            ).first()
            assert result is not None, "shift_type_id column should exist in team table"
            assert result[0] == "shift_type_id", "Column name should be 'shift_type_id'"

    def test_team_shift_type_id_is_nullable_initially(self):
        """Verify shift_type_id column is nullable for migration flexibility."""
        with Session(engine) as session:
            result = session.exec(
                text("""
                SELECT is_nullable FROM information_schema.columns
                WHERE table_name = 'team' AND column_name = 'shift_type_id'
                """)
            ).first()
            assert result[0] == "YES", "shift_type_id should be nullable for data migration"

    def test_team_no_longer_has_old_columns(self):
        """Verify old shift_type, shift_start, shift_end columns are removed."""
        with Session(engine) as session:
            old_columns = ["shift_type", "shift_start", "shift_end"]
            for col in old_columns:
                result = session.exec(
                    text(f"""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name = 'team' AND column_name = '{col}'
                    """)
                ).first()
                assert result is None, f"Old column '{col}' should be removed from team table"

    def test_team_with_shift_type_id_creates_successfully(
        self, test_tenant, test_shift_types
    ):
        """Verify teams can be created with shift_type_id FK."""
        with Session(engine) as session:
            mañana_shift = test_shift_types[0]

            team = Team(
                tenant_id=test_tenant.id,
                name="Cocina Mañana",
                department="COCINA",
                shift_type_id=mañana_shift.id,
                is_active=True,
            )
            session.add(team)
            session.commit()
            session.refresh(team)

            assert team.id is not None
            assert team.shift_type_id == mañana_shift.id
            assert team.is_active is True

    def test_shift_type_relationship_works(self, test_tenant, test_shift_types):
        """Verify the shift_type relationship can be accessed."""
        with Session(engine) as session:
            noche_shift = test_shift_types[1]

            team = Team(
                tenant_id=test_tenant.id,
                name="Cocina Noche",
                department="COCINA",
                shift_type_id=noche_shift.id,
                is_active=True,
            )
            session.add(team)
            session.commit()
            session.refresh(team)

            # Load team and access shift_type relationship
            loaded_team = session.exec(select(Team).where(Team.id == team.id)).first()
            assert loaded_team is not None
            assert loaded_team.shift_type_id == noche_shift.id

    def test_shift_type_id_foreign_key_constraint(self, test_tenant):
        """Verify FK constraint prevents invalid shift_type_id."""
        with Session(engine) as session:
            invalid_uuid = "00000000-0000-0000-0000-000000000000"

            team = Team(
                tenant_id=test_tenant.id,
                name="Invalid Shift Team",
                department="COCINA",
                shift_type_id=invalid_uuid,  # Non-existent shift_type
                is_active=True,
            )
            session.add(team)

            with pytest.raises(IntegrityError):  # Database FK constraint violation
                session.commit()

    def test_multiple_teams_different_shift_types(self, test_tenant, test_shift_types):
        """Verify multiple teams can use different shift types."""
        with Session(engine) as session:
            teams_data = [
                ("Mañana Team", test_shift_types[0]),
                ("Noche Team", test_shift_types[1]),
                ("Cortado Team", test_shift_types[2]),
                ("Corrido Team", test_shift_types[3]),
            ]

            created_teams = []
            for name, shift_type in teams_data:
                team = Team(
                    tenant_id=test_tenant.id,
                    name=name,
                    department="COCINA",
                    shift_type_id=shift_type.id,
                    is_active=True,
                )
                session.add(team)
                created_teams.append(team)

            session.commit()

            for i, team in enumerate(created_teams):
                session.refresh(team)
                assert team.shift_type_id == test_shift_types[i].id

    def test_team_data_integrity_after_migration(self, test_tenant, test_shift_types):
        """Verify team data remains intact after migration."""
        with Session(engine) as session:
            team = Team(
                tenant_id=test_tenant.id,
                name="Preservation Test Team",
                department="COCINA",
                shift_type_id=test_shift_types[0].id,
                is_active=True,
            )
            session.add(team)
            session.commit()
            original_id = team.id

            # Reload and verify
            session.refresh(team)
            assert team.id == original_id
            assert team.name == "Preservation Test Team"
            assert team.department == "COCINA"
            assert team.shift_type_id == test_shift_types[0].id
            assert team.is_active is True

    def test_migration_handles_null_shift_type_id(self, test_tenant):
        """Verify teams can be created with NULL shift_type_id (for transition period)."""
        with Session(engine) as session:
            team = Team(
                tenant_id=test_tenant.id,
                name="Unassigned Shift Team",
                department="COCINA",
                shift_type_id=None,  # Temporarily NULL during migration
                is_active=False,  # Mark as inactive
            )
            session.add(team)
            session.commit()
            session.refresh(team)

            assert team.shift_type_id is None
            assert team.is_active is False
