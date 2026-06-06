"""T072c: Integration tests for shift endpoints.

Feature 010: manual clock-in/out endpoints were removed; only roster/list remain.
"""

import uuid


class TestShiftFlow:
    def _create_employee(self, client, admin_headers):
        resp = client.post("/api/v1/employees", json={
            "first_name": "Shift", "last_name": "Test",
            "email": f"shift-{uuid.uuid4().hex[:8]}@test.es",
            "dni": f"{uuid.uuid4().int % 100000000:08d}A",
            "role": "Empleado", "department": "Barra", "hire_date": "2024-01-15",
        }, headers=admin_headers)
        assert resp.status_code == 201
        return resp.json()["id"]

    def test_list_shifts(self, client, admin_headers):
        resp = client.get("/api/v1/shifts", headers=admin_headers)
        assert resp.status_code == 200
        assert "items" in resp.json()

    def test_unauthenticated_rejected(self, client):
        resp = client.get("/api/v1/shifts")
        assert resp.status_code == 401

    def test_legacy_clock_in_removed(self, client, admin_headers):
        emp_id = self._create_employee(client, admin_headers)
        resp = client.post("/api/v1/shifts/clock-in",
            json={"employee_id": emp_id}, headers=admin_headers)
        assert resp.status_code == 404

    def test_legacy_clock_out_removed(self, client, admin_headers):
        resp = client.post(f"/api/v1/shifts/{uuid.uuid4()}/clock-out",
            json={}, headers=admin_headers)
        assert resp.status_code == 404
