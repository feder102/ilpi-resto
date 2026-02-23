"""T058c: Integration tests for vacation endpoints."""

import uuid
from datetime import date, timedelta


class TestVacationFlow:
    def _create_employee(self, client, admin_headers):
        resp = client.post("/api/v1/employees", json={
            "first_name": "Vacaciones", "last_name": "Test",
            "email": f"vac-{uuid.uuid4().hex[:8]}@test.es",
            "dni": f"{uuid.uuid4().int % 100000000:08d}A",
            "role": "Empleado", "department": "Cocina", "hire_date": "2024-01-15",
        }, headers=admin_headers)
        assert resp.status_code == 201
        return resp.json()["id"]

    def test_create_and_approve(self, client, admin_headers):
        emp_id = self._create_employee(client, admin_headers)
        start = (date.today() + timedelta(days=30)).isoformat()
        end = (date.today() + timedelta(days=39)).isoformat()

        # Create request
        resp = client.post("/api/v1/vacations", json={
            "employee_id": emp_id, "start_date": start, "end_date": end,
        }, headers=admin_headers)
        assert resp.status_code == 201
        req = resp.json()
        assert req["requested_days"] == 10
        assert req["status"] == "Pendiente"

        # Approve
        resp = client.put(f"/api/v1/vacations/{req['id']}/approve",
            json={"version": req["version"]}, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "Aprobado"

        # Check balance
        resp = client.get(f"/api/v1/vacations/balance/{emp_id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["used_days"] == 10
        assert resp.json()["remaining_days"] == 20

    def test_insufficient_balance(self, client, admin_headers):
        emp_id = self._create_employee(client, admin_headers)
        start = (date.today() + timedelta(days=30)).isoformat()
        end = (date.today() + timedelta(days=70)).isoformat()  # 41 days > 30

        resp = client.post("/api/v1/vacations", json={
            "employee_id": emp_id, "start_date": start, "end_date": end,
        }, headers=admin_headers)
        assert resp.status_code == 409
        assert "insuficiente" in resp.json()["error"]["message"]

    def test_reject(self, client, admin_headers):
        emp_id = self._create_employee(client, admin_headers)
        start = (date.today() + timedelta(days=30)).isoformat()
        end = (date.today() + timedelta(days=34)).isoformat()

        resp = client.post("/api/v1/vacations", json={
            "employee_id": emp_id, "start_date": start, "end_date": end,
        }, headers=admin_headers)
        req = resp.json()

        resp = client.put(f"/api/v1/vacations/{req['id']}/reject",
            json={"version": req["version"]}, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "Rechazado"

    def test_list_vacations(self, client, admin_headers):
        resp = client.get("/api/v1/vacations", headers=admin_headers)
        assert resp.status_code == 200
        assert "items" in resp.json()

    def test_empleado_restricted(self, client, emp_headers):
        resp = client.get("/api/v1/vacations", headers=emp_headers)
        assert resp.status_code == 200

    def test_unauthenticated_rejected(self, client):
        resp = client.get("/api/v1/vacations")
        assert resp.status_code == 401
