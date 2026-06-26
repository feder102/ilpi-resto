"""Integration tests for POST /admin/time-tracking/process-month (Feature 013)."""

from datetime import date


def _last_month() -> tuple[int, int]:
    today = date.today()
    if today.month == 1:
        return today.year - 1, 12
    return today.year, today.month - 1


class TestMonthlyProcessingEndpoint:
    def test_admin_can_process_month(self, client, admin_headers):
        year, month = _last_month()
        resp = client.post(
            "/api/v1/employee/time-tracking/process-month",
            json={"year": year, "month": month},
            headers=admin_headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["year"] == year
        assert data["month"] == month
        assert "days_processed" in data
        assert "entries_created" in data
        assert "entries_skipped" in data
        assert "days_without_shifts" in data
        assert isinstance(data["errors"], list)

    def test_moderator_can_process_month(self, client, mod_headers):
        year, month = _last_month()
        resp = client.post(
            "/api/v1/employee/time-tracking/process-month",
            json={"year": year, "month": month},
            headers=mod_headers,
        )
        assert resp.status_code == 200, resp.text

    def test_employee_cannot_process_month(self, client, emp_headers):
        year, month = _last_month()
        resp = client.post(
            "/api/v1/employee/time-tracking/process-month",
            json={"year": year, "month": month},
            headers=emp_headers,
        )
        assert resp.status_code == 403

    def test_unauthenticated_rejected(self, client):
        year, month = _last_month()
        resp = client.post(
            "/api/v1/employee/time-tracking/process-month",
            json={"year": year, "month": month},
        )
        assert resp.status_code == 401

    def test_invalid_month_rejected(self, client, admin_headers):
        for bad in (0, 13, -1, 99):
            resp = client.post(
                "/api/v1/employee/time-tracking/process-month",
                json={"year": 2026, "month": bad},
                headers=admin_headers,
            )
            assert resp.status_code == 422, f"month={bad} -> {resp.status_code}"

    def test_invalid_year_rejected(self, client, admin_headers):
        for bad in (2019, 2101, 0, -1):
            resp = client.post(
                "/api/v1/employee/time-tracking/process-month",
                json={"year": bad, "month": 6},
                headers=admin_headers,
            )
            assert resp.status_code == 422, f"year={bad} -> {resp.status_code}"

    def test_future_month_returns_empty_result(self, client, admin_headers):
        today = date.today()
        future_year = today.year + 1
        resp = client.post(
            "/api/v1/employee/time-tracking/process-month",
            json={"year": future_year, "month": today.month},
            headers=admin_headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["days_processed"] == 0
        assert data["entries_created"] == 0
