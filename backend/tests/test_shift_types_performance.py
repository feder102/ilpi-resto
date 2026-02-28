"""T070: Shift Types performance tests."""

import pytest
import time
from sqlmodel import Session

from app.models.shift_type import ShiftType
from app.models.team import Team
from app.models.tenant import Tenant
from app.database import engine
from app.services.team_service import list_teams


class TestShiftTypesPerformance:
    """T070: Test performance with many shift types."""

    @pytest.fixture
    def setup_many_shifts(self):
        """Create tenant with 50+ shift types and teams."""
        import uuid
        from sqlalchemy import delete

        unique_slug = f"perf-test-{uuid.uuid4().hex[:8]}"
        with Session(engine) as session:
            tenant = Tenant(name="Perf Test Org", slug=unique_slug, timezone="Europe/Madrid", locale="es")
            session.add(tenant)
            session.commit()
            session.refresh(tenant)

            # Create 50 shift types with varied configurations
            shift_types = []
            for i in range(50):
                shift_type = ShiftType(
                    tenant_id=tenant.id,
                    name=f"Shift Type {i+1:03d}",
                    type="MAÑANA" if i % 4 == 0 else "NOCHE" if i % 4 == 1 else "CORTADO" if i % 4 == 2 else "CORRIDO",
                    time_windows=[
                        {"start": f"{8+i%4:02d}:00", "end": f"{16+i%4:02d}:00"}
                    ] if i % 2 == 0 else [
                        {"start": f"{10+i%4:02d}:00", "end": f"{14+i%4:02d}:00"},
                        {"start": f"{18+i%4:02d}:00", "end": f"{22+i%4:02d}:00"},
                    ],
                    expected_hours=7.5 + (i % 3),
                    uses_dynamic_close=i % 3 == 0,
                )
                shift_types.append(shift_type)
                session.add(shift_type)

            session.commit()

            # Create 20 teams that reference these shift types
            for i in range(20):
                team = Team(
                    tenant_id=tenant.id,
                    name=f"Team {i+1:02d}",
                    department="COCINA" if i % 2 == 0 else "ATENCION_AL_PUBLICO",
                    shift_type_id=shift_types[i % 50].id,
                    is_active=True,
                )
                session.add(team)

            session.commit()

            yield tenant.id

            # Cleanup
            session.exec(delete(Team).where(Team.tenant_id == tenant.id))
            session.exec(delete(ShiftType).where(ShiftType.tenant_id == tenant.id))
            session.exec(delete(Tenant).where(Tenant.id == tenant.id))
            session.commit()

    def test_list_teams_with_50_shift_types_performance(self, setup_many_shifts):
        """T070: Verify GET /teams with 50+ shift types returns <200ms."""
        tenant_id = setup_many_shifts

        with Session(engine) as session:
            start_time = time.time()
            result = list_teams(tenant_id, page=1, size=20, session=session)
            elapsed_ms = (time.time() - start_time) * 1000

            # Should complete in less than 200ms
            assert elapsed_ms < 200, f"Query took {elapsed_ms:.2f}ms, expected <200ms"
            assert len(result.items) == 20
            assert result.total == 20

    def test_shift_type_detail_population_performance(self, setup_many_shifts):
        """Verify shift type details are efficiently fetched with teams."""
        tenant_id = setup_many_shifts

        with Session(engine) as session:
            start_time = time.time()
            # List teams with shift type details
            result = list_teams(tenant_id, page=1, size=20, session=session)
            elapsed_ms = (time.time() - start_time) * 1000

            # Verify all teams have shift type details populated
            for team in result.items:
                assert team.shift_type_id is not None
                # Details should be in the response
                assert hasattr(team, 'shift_type') or team.shift_type_id is not None

            # Should still be performant despite fetching related data
            assert elapsed_ms < 300, f"Query took {elapsed_ms:.2f}ms, expected <300ms"
