"""T072c: Integration tests for team endpoints."""

import uuid


class TestTeamCRUD:
    TEAM_DATA = {
        "name": "Equipo Test",
        "department": "Cocina",
        "shift_type": "Mañana",
        "shift_start": "09:00",
        "shift_end": "17:00",
    }

    def test_create_team(self, client, admin_headers):
        resp = client.post("/api/v1/teams", json=self.TEAM_DATA, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["name"] == "Equipo Test"

    def test_list_teams(self, client, admin_headers):
        client.post("/api/v1/teams", json=self.TEAM_DATA, headers=admin_headers)
        resp = client.get("/api/v1/teams", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_list_by_department(self, client, admin_headers):
        client.post("/api/v1/teams", json=self.TEAM_DATA, headers=admin_headers)
        resp = client.get("/api/v1/teams?department=Cocina", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_add_member(self, client, admin_headers):
        # Create team
        team_resp = client.post("/api/v1/teams", json=self.TEAM_DATA, headers=admin_headers)
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
