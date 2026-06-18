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


class TestBulkRosterShifts:
    def _create_employee(self, client, admin_headers):
        resp = client.post("/api/v1/employees", json={
            "first_name": "Bulk", "last_name": "Test",
            "email": f"bulk-{uuid.uuid4().hex[:8]}@test.es",
            "dni": f"{uuid.uuid4().int % 100000000:08d}B",
            "role": "Empleado", "department": "Cocina", "hire_date": "2024-01-15",
        }, headers=admin_headers)
        assert resp.status_code == 201
        return resp.json()["id"]

    def _create_shift_type(self, session, test_tenant):
        from app.models.shift_type import ShiftType

        st = ShiftType(
            tenant_id=test_tenant.id,
            name="Mañana",
            type="MANANA",
            time_windows=[{"start": "08:00", "end": "14:00"}],
            expected_hours=6.0,
            is_active=True,
        )
        session.add(st)
        session.commit()
        session.refresh(st)
        return st

    def test_bulk_create_success(self, client, session, test_tenant, admin_headers):
        emp1 = self._create_employee(client, admin_headers)
        emp2 = self._create_employee(client, admin_headers)
        st = self._create_shift_type(session, test_tenant)

        resp = client.post("/api/v1/rosters/shifts/bulk", json={
            "employee_ids": [emp1, emp2],
            "shift_type_id": str(st.id),
            "start_date": "2099-01-05",  # Monday
            "end_date": "2099-01-09",    # Friday
            "include_weekends": True,
        }, headers=admin_headers)
        assert resp.status_code == 201
        body = resp.json()
        # 5 days * 2 employees
        assert body["created_count"] == 10
        assert body["skipped_count"] == 0

    def test_bulk_only_working_days(self, client, session, test_tenant, admin_headers):
        emp1 = self._create_employee(client, admin_headers)
        st = self._create_shift_type(session, test_tenant)

        resp = client.post("/api/v1/rosters/shifts/bulk", json={
            "employee_ids": [emp1],
            "shift_type_id": str(st.id),
            "start_date": "2099-01-05",  # Monday
            "end_date": "2099-01-11",    # Sunday
            "include_weekends": False,
        }, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["created_count"] == 5  # Mon-Fri only

    def test_bulk_forbidden_for_empleado(self, client, session, test_tenant, emp_headers):
        st = self._create_shift_type(session, test_tenant)
        resp = client.post("/api/v1/rosters/shifts/bulk", json={
            "employee_ids": [str(uuid.uuid4())],
            "shift_type_id": str(st.id),
            "start_date": "2099-01-05",
            "end_date": "2099-01-09",
            "include_weekends": True,
        }, headers=emp_headers)
        assert resp.status_code == 403

    def test_bulk_unauthenticated_rejected(self, client):
        resp = client.post("/api/v1/rosters/shifts/bulk", json={
            "employee_ids": [str(uuid.uuid4())],
            "shift_type_id": str(uuid.uuid4()),
            "start_date": "2099-01-05",
            "end_date": "2099-01-09",
            "include_weekends": True,
        })
        assert resp.status_code == 401
