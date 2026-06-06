"""Feature 010: Integration tests for admin-driven extra hours and removal of manual marking."""

import uuid
from datetime import date


def _extra_payload(employee_id, hours="3.00", note="Cobertura"):
    today = date.today()
    return {
        "employee_id": str(employee_id),
        "work_date": today.isoformat(),
        "hours": hours,
        "note": note,
    }


class TestExtraHoursCreation:
    def test_admin_can_create_extra_hours(self, client, admin_headers, test_employee):
        resp = client.post(
            "/api/v1/employee/time-tracking/extra-hours",
            json=_extra_payload(test_employee.id),
            headers=admin_headers,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["source"] == "extra"
        assert data["employee_id"] == str(test_employee.id)
        assert data["start_time"] is None
        assert data["end_time"] is None
        assert float(data["hours_worked"]) == 3.0
        assert data["note"] == "Cobertura"

    def test_moderator_can_create_extra_hours(self, client, mod_headers, test_employee):
        resp = client.post(
            "/api/v1/employee/time-tracking/extra-hours",
            json=_extra_payload(test_employee.id, hours="2.5"),
            headers=mod_headers,
        )
        assert resp.status_code == 201, resp.text
        assert float(resp.json()["hours_worked"]) == 2.5

    def test_employee_cannot_create_extra_hours(self, client, emp_headers, test_employee):
        resp = client.post(
            "/api/v1/employee/time-tracking/extra-hours",
            json=_extra_payload(test_employee.id),
            headers=emp_headers,
        )
        assert resp.status_code == 403

    def test_invalid_hours_rejected(self, client, admin_headers, test_employee):
        for bad in ("0", "0.0", "25", "-1"):
            resp = client.post(
                "/api/v1/employee/time-tracking/extra-hours",
                json=_extra_payload(test_employee.id, hours=bad),
                headers=admin_headers,
            )
            assert resp.status_code == 422, f"hours={bad} -> {resp.status_code}"

    def test_unknown_employee_returns_404(self, client, admin_headers):
        resp = client.post(
            "/api/v1/employee/time-tracking/extra-hours",
            json=_extra_payload(uuid.uuid4()),
            headers=admin_headers,
        )
        assert resp.status_code == 404

    def test_multiple_extra_entries_same_day_allowed(self, client, admin_headers, test_employee):
        for _ in range(2):
            resp = client.post(
                "/api/v1/employee/time-tracking/extra-hours",
                json=_extra_payload(test_employee.id, hours="1.00"),
                headers=admin_headers,
            )
            assert resp.status_code == 201, resp.text


class TestExtraHoursInStatistics:
    def test_extra_hours_reported_separately(self, client, admin_headers, test_employee):
        today = date.today()
        client.post(
            "/api/v1/employee/time-tracking/extra-hours",
            json=_extra_payload(test_employee.id, hours="4.00"),
            headers=admin_headers,
        )
        resp = client.get(
            f"/api/v1/employee/time-tracking/statistics/employee/{test_employee.id}"
            f"?year={today.year}&month={today.month}",
            headers=admin_headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert float(data["extra_hours"]) == 4.0
        assert float(data["total_hours"]) == 4.0
        # Extra-only days are not counted as worked days
        assert data["days_worked"] == 0
        assert "Horas extra" in data["breakdown_by_shift_type"]

    def test_entries_filter_by_extra_source(self, client, admin_headers, test_employee):
        today = date.today()
        client.post(
            "/api/v1/employee/time-tracking/extra-hours",
            json=_extra_payload(test_employee.id, hours="5.00"),
            headers=admin_headers,
        )
        resp = client.get(
            "/api/v1/employee/time-tracking/entries"
            f"?start_date={today.isoformat()}&end_date={today.isoformat()}&source=extra",
            headers=admin_headers,
        )
        assert resp.status_code == 200, resp.text
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["source"] == "extra"


class TestManualMarkingRemoved:
    def test_employee_clock_in_removed(self, client, admin_headers):
        resp = client.post("/api/v1/employee/time-tracking/clock-in", headers=admin_headers)
        assert resp.status_code == 404

    def test_employee_clock_out_removed(self, client, admin_headers):
        resp = client.post("/api/v1/employee/time-tracking/clock-out", headers=admin_headers)
        assert resp.status_code == 404

    def test_employee_today_removed(self, client, admin_headers):
        resp = client.get("/api/v1/employee/time-tracking/today", headers=admin_headers)
        assert resp.status_code == 404

    def test_employee_records_removed(self, client, admin_headers):
        resp = client.get("/api/v1/employee/time-tracking/records", headers=admin_headers)
        assert resp.status_code == 404
