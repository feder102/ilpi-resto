"""T072c: Integration tests for shift endpoints."""

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

    def test_clock_in_and_out(self, client, admin_headers):
        emp_id = self._create_employee(client, admin_headers)

        # Clock in
        resp = client.post("/api/v1/shifts/clock-in",
            json={"employee_id": emp_id}, headers=admin_headers)
        assert resp.status_code == 201
        shift = resp.json()
        assert shift["exit_time"] is None

        # Clock out
        resp = client.post(f"/api/v1/shifts/{shift['id']}/clock-out",
            json={}, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["exit_time"] is not None

    def test_duplicate_clock_in(self, client, admin_headers):
        emp_id = self._create_employee(client, admin_headers)

        client.post("/api/v1/shifts/clock-in",
            json={"employee_id": emp_id}, headers=admin_headers)
        resp = client.post("/api/v1/shifts/clock-in",
            json={"employee_id": emp_id}, headers=admin_headers)
        assert resp.status_code == 422  # ValidationError

    def test_clock_in_with_task(self, client, admin_headers):
        emp_id = self._create_employee(client, admin_headers)

        resp = client.post("/api/v1/shifts/clock-in",
            json={"employee_id": emp_id, "task_label": "Parrilla"},
            headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["task_label"] == "Parrilla"

    def test_list_shifts(self, client, admin_headers):
        resp = client.get("/api/v1/shifts", headers=admin_headers)
        assert resp.status_code == 200
        assert "items" in resp.json()

    def test_unauthenticated_rejected(self, client):
        resp = client.get("/api/v1/shifts")
        assert resp.status_code == 401
