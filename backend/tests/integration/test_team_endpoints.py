"""T072c: Integration tests for team endpoints."""

import uuid

import pytest


@pytest.fixture
def shift_type_id(client, admin_headers):
    """Create a shift type and return its ID."""
    resp = client.post("/api/v1/shift-types", json={
        "name": "Mañana Test",
        "type": "MANANA",
        "time_windows": [{"start": "09:00", "end": "17:00"}],
        "expected_hours": 8.0,
    }, headers=admin_headers)
    assert resp.status_code == 201, f"Failed to create shift type: {resp.json()}"
    return resp.json()["id"]


class TestTeamCRUD:
    def _team_data(self, shift_type_id: str) -> dict:
        return {
            "name": "Equipo Test",
            "department": "Cocina",
            "shift_type_id": shift_type_id,
        }

    def test_create_team(self, client, admin_headers, shift_type_id):
        resp = client.post("/api/v1/teams", json=self._team_data(shift_type_id), headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["name"] == "Equipo Test"

    def test_list_teams(self, client, admin_headers, shift_type_id):
        client.post("/api/v1/teams", json=self._team_data(shift_type_id), headers=admin_headers)
        resp = client.get("/api/v1/teams", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_list_by_department(self, client, admin_headers, shift_type_id):
        client.post("/api/v1/teams", json=self._team_data(shift_type_id), headers=admin_headers)
        resp = client.get("/api/v1/teams?department=Cocina", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_add_member(self, client, admin_headers, shift_type_id):
        # Create team
        team_resp = client.post("/api/v1/teams", json=self._team_data(shift_type_id), headers=admin_headers)
        team_id = team_resp.json()["id"]

        # Create employee
        emp_resp = client.post("/api/v1/employees", json={
            "first_name": "TeamMember", "last_name": "Test",
            "email": f"tm-{uuid.uuid4().hex[:8]}@test.es",
            "dni": f"{uuid.uuid4().int % 100000000:08d}A",
            "role": "Empleado", "department": "Cocina", "hire_date": "2024-01-15",
        }, headers=admin_headers)
        emp_id = emp_resp.json()["id"]

        # Add member
        resp = client.post(f"/api/v1/teams/{team_id}/members",
            json={"employee_id": emp_id}, headers=admin_headers)
        assert resp.status_code == 200
        assert len(resp.json()["members"]) == 1

    def test_empleado_forbidden(self, client, emp_headers):
        resp = client.get("/api/v1/teams", headers=emp_headers)
        assert resp.status_code == 403

    def test_unauthenticated_rejected(self, client):
        resp = client.get("/api/v1/teams")
        assert resp.status_code == 401
