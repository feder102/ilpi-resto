"""T063, T066: Shift Types integration tests - deletion with team refs, pagination."""

import pytest
from sqlmodel import Session, select

from app.common.exceptions import ValidationError
from app.models.shift_type import ShiftType
from app.models.team import Team
from app.models.tenant import Tenant
from app.database import engine
from app.services.shift_type_service import (
    delete as delete_shift_type,
    list_shift_types,
    get_by_id,
)


class TestShiftTypeDeletion:
    """T063: Test shift type deletion prevented when teams assigned."""

    @pytest.fixture
    def setup_with_team(self):
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
                name="Mañana Test",
                type="MAÑANA",
                time_windows=[{"start": "10:30", "end": "18:00"}],
                expected_hours=7.5,
                uses_dynamic_close=False,
            )
            session.add(shift_type)
            session.commit()
            session.refresh(shift_type)

            # Create team using this shift type
            team = Team(
                tenant_id=tenant.id,
                name="Team Test",
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

    def test_cannot_delete_shift_type_with_assigned_teams(self, setup_with_team):
        """Verify deletion is prevented when teams are assigned."""
        tenant_id, shift_type_id, team_id = setup_with_team

        with Session(engine) as session:
            with pytest.raises(ValidationError) as exc_info:
                delete_shift_type(shift_type_id, tenant_id, session)

            assert "cannot be deleted" in str(exc_info.value).lower()

    def test_can_delete_shift_type_without_teams(self):
        """Verify shift type can be deleted when no teams assigned."""
        import uuid
        from sqlalchemy import delete as sql_delete

        unique_slug = f"test-{uuid.uuid4().hex[:8]}"
        with Session(engine) as session:
            tenant = Tenant(name="Test Org", slug=unique_slug, timezone="Europe/Madrid", locale="es")
            session.add(tenant)
            session.commit()
            session.refresh(tenant)

            shift_type = ShiftType(
                tenant_id=tenant.id,
                name="Orphan Shift",
                type="NOCHE",
                time_windows=[{"start": "17:00", "end": "23:59"}],
                expected_hours=6.98,
                uses_dynamic_close=True,
            )
            session.add(shift_type)
            session.commit()

            # Should succeed (no teams assigned)
            # Delete returns None (not True)
            delete_shift_type(shift_type.id, tenant.id, session)

            # Cleanup
            session.exec(sql_delete(Tenant).where(Tenant.id == tenant.id))
            session.commit()


class TestShiftTypesPagination:
    """T066: Test pagination on GET /shift-types endpoint."""

    @pytest.fixture
    def setup_multiple_shifts(self):
        """Create tenant with multiple shift types."""
        import uuid
        from sqlalchemy import delete

        unique_slug = f"test-{uuid.uuid4().hex[:8]}"
        with Session(engine) as session:
            tenant = Tenant(name="Test Org", slug=unique_slug, timezone="Europe/Madrid", locale="es")
            session.add(tenant)
            session.commit()
            session.refresh(tenant)

            # Create 15 shift types
            for i in range(15):
                shift_type = ShiftType(
                    tenant_id=tenant.id,
                    name=f"Shift Type {i+1:02d}",
                    type="MAÑANA",
                    time_windows=[{"start": f"{9+i//4:02d}:00", "end": f"{17+i//4:02d}:00"}],
                    expected_hours=8.0,
                    uses_dynamic_close=False,
                )
                session.add(shift_type)
            session.commit()

            yield tenant.id

            # Cleanup
            session.exec(delete(ShiftType).where(ShiftType.tenant_id == tenant.id))
            session.exec(delete(Tenant).where(Tenant.id == tenant.id))
            session.commit()

    def test_pagination_first_page(self, setup_multiple_shifts):
        """Verify first page returns correct number of items."""
        tenant_id = setup_multiple_shifts

        with Session(engine) as session:
            result = list_shift_types(tenant_id, page=1, size=10, session=session)

            assert len(result.items) == 10
            assert result.page == 1
            assert result.size == 10
            assert result.total == 15
            assert result.pages == 2  # ceil(15/10)

    def test_pagination_second_page(self, setup_multiple_shifts):
        """Verify second page returns remaining items."""
        tenant_id = setup_multiple_shifts

        with Session(engine) as session:
            result = list_shift_types(tenant_id, page=2, size=10, session=session)

            assert len(result.items) == 5
            assert result.page == 2
            assert result.total == 15
            assert result.pages == 2

    def test_pagination_custom_size(self, setup_multiple_shifts):
        """Verify custom page size works."""
        tenant_id = setup_multiple_shifts

        with Session(engine) as session:
            result = list_shift_types(tenant_id, page=1, size=5, session=session)

            assert len(result.items) == 5
            assert result.size == 5
            assert result.pages == 3  # ceil(15/5)

    def test_pagination_page_out_of_range(self, setup_multiple_shifts):
        """Verify out-of-range page returns empty list."""
        tenant_id = setup_multiple_shifts

        with Session(engine) as session:
            result = list_shift_types(tenant_id, page=99, size=10, session=session)

            assert len(result.items) == 0
            assert result.page == 99
            assert result.total == 15
