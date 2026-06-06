"""T037-T039: Contract tests for teams API with shift type integration."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.shift_type import ShiftType
from app.models.team import Team


class TestPostTeams:
    """T037: POST /teams endpoint with shift types."""

    def test_create_team_with_shift_type(
        self, client: TestClient, admin_headers: dict, session: Session, test_tenant
    ):
        """Should create team with shift_type_id reference."""
        # First create a shift type
        shift_type = ShiftType(
            tenant_id=test_tenant.id,
            name="Mañana",
            type="MAÑANA",
            time_windows=[{"start": "10:30", "end": "18:00"}],
            uses_dynamic_close=False,
            expected_hours=7.5,
        )
        session.add(shift_type)
        session.commit()
        session.refresh(shift_type)

        # Create team with shift_type_id
        response = client.post(
            "/api/v1/teams",
            headers=admin_headers,
            json={
                "name": "Cocina A",
                "department": "Cocina",
                "shift_type_id": str(shift_type.id),
            },
        )

        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.json()}"
        data = response.json()
        assert data["name"] == "Cocina A"
        assert data["department"] == "Cocina"
        assert data["shift_type_id"] == str(shift_type.id)
        # Verify shift details included
        assert data["shift_type"] is not None
        assert data["shift_type"]["name"] == "Mañana"
        assert data["total_hours"] == 7.5

    def test_create_team_with_invalid_shift_type(
        self, client: TestClient, admin_headers: dict, test_tenant
    ):
        """T037: Should reject team creation with invalid shift_type_id."""
        response = client.post(
            "/api/v1/teams",
            headers=admin_headers,
            json={
                "name": "Cocina B",
                "department": "Cocina",
                "shift_type_id": str(uuid.uuid4()),  # Non-existent shift type
            },
        )

        assert response.status_code == 422
        assert "VALIDATION_ERROR" in response.json()["error"]["code"]

    def test_create_team_duplicate_name_same_dept(
        self, client: TestClient, admin_headers: dict, session: Session, test_tenant
    ):
        """Should reject duplicate team name in same department."""
        # Create shift type
        shift_type = ShiftType(
            tenant_id=test_tenant.id,
            name="Mañana",
            type="MAÑANA",
            time_windows=[{"start": "10:30", "end": "18:00"}],
            uses_dynamic_close=False,
            expected_hours=7.5,
        )
        session.add(shift_type)
        session.commit()

        # Create first team
        team1 = Team(
            tenant_id=test_tenant.id,
            name="Cocina A",
            department="Cocina",
            shift_type_id=shift_type.id,
        )
        session.add(team1)
        session.commit()

        # Try to create duplicate
        response = client.post(
            "/api/v1/teams",
            headers=admin_headers,
            json={
                "name": "Cocina A",
                "department": "Cocina",
                "shift_type_id": str(shift_type.id),
            },
        )

        assert response.status_code == 409
        assert "DUPLICATE_TEAM" in response.json()["error"]["code"]


class TestGetTeams:
    """T037b: GET /teams endpoints with shift types."""

    def test_list_teams_with_shift_details(
        self, client: TestClient, admin_headers: dict, session: Session, test_tenant
    ):
        """Should list teams with shift type details included."""
        # Create shift type
        shift_type = ShiftType(
            tenant_id=test_tenant.id,
            name="Mañana",
            type="MAÑANA",
            time_windows=[{"start": "10:30", "end": "18:00"}],
            uses_dynamic_close=False,
            expected_hours=7.5,
        )
        session.add(shift_type)
        session.commit()

        # Create team
        team = Team(
            tenant_id=test_tenant.id,
            name="Cocina A",
            department="Cocina",
            shift_type_id=shift_type.id,
        )
        session.add(team)
        session.commit()

        response = client.get(
            "/api/v1/teams",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["name"] == "Cocina A"
        assert data["items"][0]["shift_type"]["name"] == "Mañana"
        assert data["items"][0]["total_hours"] == 7.5

    def test_get_single_team_with_shift_details(
        self, client: TestClient, admin_headers: dict, session: Session, test_tenant
    ):
        """T037b: Should get single team with complete shift details."""
        # Create shift type
        shift_type = ShiftType(
            tenant_id=test_tenant.id,
            name="Cortado",
            type="CORTADO",
            time_windows=[
                {"start": "12:30", "end": "16:30"},
                {"start": "18:30", "end": "22:30"},
            ],
            uses_dynamic_close=False,
            expected_hours=8.0,
        )
        session.add(shift_type)
        session.commit()

        # Create team
        team = Team(
            tenant_id=test_tenant.id,
            name="Cocina B",
            department="Cocina",
            shift_type_id=shift_type.id,
        )
        session.add(team)
        session.commit()

        response = client.get(
            f"/api/v1/teams/{team.id}",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Cocina B"
        assert data["shift_type"]["name"] == "Cortado"
        assert data["time_windows"] == [
            {"start": "12:30", "end": "16:30"},
            {"start": "18:30", "end": "22:30"},
        ]
        assert data["total_hours"] == 8.0


class TestPutTeams:
    """T037c: PUT /teams/{id} endpoint with shift type changes."""

    def test_update_team_change_shift_type(
        self, client: TestClient, admin_headers: dict, session: Session, test_tenant
    ):
        """Should update team's shift_type_id and reflect changes."""
        # Create two shift types
        st1 = ShiftType(
            tenant_id=test_tenant.id,
            name="Mañana",
            type="MAÑANA",
            time_windows=[{"start": "10:30", "end": "18:00"}],
            uses_dynamic_close=False,
            expected_hours=7.5,
        )
        st2 = ShiftType(
            tenant_id=test_tenant.id,
            name="Noche",
            type="NOCHE",
            time_windows=[{"start": "17:00", "end": "23:59"}],
            uses_dynamic_close=True,
            expected_hours=6.98,
        )
        session.add(st1)
        session.add(st2)
        session.commit()

        # Create team with st1
        team = Team(
            tenant_id=test_tenant.id,
            name="Cocina A",
            department="Cocina",
            shift_type_id=st1.id,
        )
        session.add(team)
        session.commit()

        # Update to st2
        response = client.put(
            f"/api/v1/teams/{team.id}",
            headers=admin_headers,
            json={"shift_type_id": str(st2.id)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["shift_type_id"] == str(st2.id)
        assert data["shift_type"]["name"] == "Noche"
        assert data["total_hours"] == 6.98

    def test_update_team_invalid_shift_type(
        self, client: TestClient, admin_headers: dict, session: Session, test_tenant
    ):
        """Should reject update with invalid shift_type_id."""
        # Create shift type and team
        shift_type = ShiftType(
            tenant_id=test_tenant.id,
            name="Mañana",
            type="MAÑANA",
            time_windows=[{"start": "10:30", "end": "18:00"}],
            uses_dynamic_close=False,
            expected_hours=7.5,
        )
        session.add(shift_type)
        session.commit()

        team = Team(
            tenant_id=test_tenant.id,
            name="Cocina A",
            department="Cocina",
            shift_type_id=shift_type.id,
        )
        session.add(team)
        session.commit()

        # Try to update with invalid shift_type_id
        response = client.put(
            f"/api/v1/teams/{team.id}",
            headers=admin_headers,
            json={"shift_type_id": str(uuid.uuid4())},
        )

        assert response.status_code == 422
        assert "VALIDATION_ERROR" in response.json()["error"]["code"]
