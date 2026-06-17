"""Feature 011: Integration tests for absence tracking."""

import uuid
from datetime import date, timedelta


def _absence_payload(employee_id, work_date=None, justified=False, reason=None):
    if work_date is None:
        work_date = date.today().isoformat()
    elif isinstance(work_date, date):
        work_date = work_date.isoformat()

    payload = {
        "employee_id": str(employee_id),
        "date": work_date,
        "justified": justified,
    }
    if reason:
        payload["reason"] = reason
    return payload


class TestAbsenceCreation:
    def test_admin_can_create_absence(self, client, admin_headers, test_employee, test_shift):
        resp = client.post(
            "/api/v1/employee/time-tracking/absences",
            json=_absence_payload(test_employee.id, justified=False),
            headers=admin_headers,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["employee_id"] == str(test_employee.id)
        assert data["justified"] is False
        assert "reason" in data

    def test_moderator_can_create_absence(self, client, mod_headers, test_employee, test_shift):
        resp = client.post(
            "/api/v1/employee/time-tracking/absences",
            json=_absence_payload(test_employee.id, justified=True, reason="Enfermo"),
            headers=mod_headers,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["justified"] is True
        assert data["reason"] == "Enfermo"

    def test_employee_cannot_create_absence(self, client, emp_headers, test_employee, test_shift):
        resp = client.post(
            "/api/v1/employee/time-tracking/absences",
            json=_absence_payload(test_employee.id),
            headers=emp_headers,
        )
        assert resp.status_code == 403

    def test_unknown_employee_returns_404(self, client, admin_headers):
        resp = client.post(
            "/api/v1/employee/time-tracking/absences",
            json=_absence_payload(uuid.uuid4()),
            headers=admin_headers,
        )
        assert resp.status_code == 404

    def test_absence_without_shift_rejected(self, client, admin_headers, test_employee):
        future_date = (date.today() + timedelta(days=30)).isoformat()
        resp = client.post(
            "/api/v1/employee/time-tracking/absences",
            json=_absence_payload(test_employee.id, work_date=future_date),
            headers=admin_headers,
        )
        assert resp.status_code == 422, resp.text
        error = resp.json()
        assert "no tiene un turno asignado" in error.get("error", {}).get("message", "").lower()

    def test_duplicate_absence_rejected(self, client, admin_headers, test_employee, test_shift):
        today = date.today().isoformat()
        payload = _absence_payload(test_employee.id, work_date=today)

        resp1 = client.post(
            "/api/v1/employee/time-tracking/absences",
            json=payload,
            headers=admin_headers,
        )
        assert resp1.status_code == 201

        resp2 = client.post(
            "/api/v1/employee/time-tracking/absences",
            json=payload,
            headers=admin_headers,
        )
        assert resp2.status_code == 422


class TestAbsenceInStatistics:
    def test_absences_counted_in_statistics(
        self, client, admin_headers, test_employee, test_shift
    ):
        today = date.today()

        client.post(
            "/api/v1/employee/time-tracking/absences",
            json=_absence_payload(test_employee.id, justified=False),
            headers=admin_headers,
        )

        resp = client.get(
            f"/api/v1/employee/time-tracking/statistics/employee/{test_employee.id}"
            f"?year={today.year}&month={today.month}",
            headers=admin_headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()

        assert data["total_absences"] == 1
        assert data["unjustified_absences"] == 1
        assert data["justified_absences"] == 0

    def test_justified_absence_counted(
        self, client, admin_headers, test_employee, test_shift
    ):
        today = date.today()

        client.post(
            "/api/v1/employee/time-tracking/absences",
            json=_absence_payload(test_employee.id, justified=True),
            headers=admin_headers,
        )

        resp = client.get(
            f"/api/v1/employee/time-tracking/statistics/employee/{test_employee.id}"
            f"?year={today.year}&month={today.month}",
            headers=admin_headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()

        assert data["total_absences"] == 1
        assert data["justified_absences"] == 1
        assert data["unjustified_absences"] == 0

    def test_absence_removes_shift_from_hours(
        self, client, admin_headers, test_employee, test_shift
    ):
        today = date.today()

        resp_before = client.get(
            f"/api/v1/employee/time-tracking/statistics/employee/{test_employee.id}"
            f"?year={today.year}&month={today.month}",
            headers=admin_headers,
        )
        hours_before = float(resp_before.json()["total_hours"])
        days_before = resp_before.json()["days_worked"]

        client.post(
            "/api/v1/employee/time-tracking/absences",
            json=_absence_payload(test_employee.id),
            headers=admin_headers,
        )

        resp_after = client.get(
            f"/api/v1/employee/time-tracking/statistics/employee/{test_employee.id}"
            f"?year={today.year}&month={today.month}",
            headers=admin_headers,
        )
        hours_after = float(resp_after.json()["total_hours"])
        days_after = resp_after.json()["days_worked"]

        assert hours_after < hours_before, "Hours should decrease after absence"
        assert days_after < days_before, "Days worked should decrease after absence"


class TestAbsenceListing:
    def test_list_absences_by_employee(self, client, admin_headers, test_employee, test_shift):
        client.post(
            "/api/v1/employee/time-tracking/absences",
            json=_absence_payload(test_employee.id, justified=True),
            headers=admin_headers,
        )

        resp = client.get(
            f"/api/v1/employee/time-tracking/absences?employee_id={test_employee.id}",
            headers=admin_headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["total"] >= 1
        assert len(data["items"]) >= 1
        assert data["items"][0]["employee_id"] == str(test_employee.id)

    def test_list_absences_filters_by_date_range(
        self, client, admin_headers, test_employee, test_shift
    ):
        today = date.today()
        tomorrow = (today + timedelta(days=1)).isoformat()

        client.post(
            "/api/v1/employee/time-tracking/absences",
            json=_absence_payload(test_employee.id, work_date=tomorrow, justified=False),
            headers=admin_headers,
        )

        resp = client.get(
            f"/api/v1/employee/time-tracking/absences"
            f"?start_date={tomorrow}&end_date={tomorrow}",
            headers=admin_headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert len(data["items"]) >= 1


class TestAbsenceDeletion:
    def test_admin_can_delete_absence(self, client, admin_headers, test_employee, test_shift):
        today = date.today().isoformat()

        resp_create = client.post(
            "/api/v1/employee/time-tracking/absences",
            json=_absence_payload(test_employee.id, work_date=today),
            headers=admin_headers,
        )
        absence_id = resp_create.json()["id"]

        resp_delete = client.delete(
            f"/api/v1/employee/time-tracking/absences/{absence_id}",
            headers=admin_headers,
        )
        assert resp_delete.status_code == 204

    def test_delete_absence_regenerates_shift_entry(
        self, client, admin_headers, test_employee, test_shift
    ):
        today = date.today()

        resp_create = client.post(
            "/api/v1/employee/time-tracking/absences",
            json=_absence_payload(test_employee.id),
            headers=admin_headers,
        )
        absence_id = resp_create.json()["id"]

        resp_after_create = client.get(
            f"/api/v1/employee/time-tracking/statistics/employee/{test_employee.id}"
            f"?year={today.year}&month={today.month}",
            headers=admin_headers,
        )
        absences_after_create = resp_after_create.json()["total_absences"]

        client.delete(
            f"/api/v1/employee/time-tracking/absences/{absence_id}",
            headers=admin_headers,
        )

        resp_after_delete = client.get(
            f"/api/v1/employee/time-tracking/statistics/employee/{test_employee.id}"
            f"?year={today.year}&month={today.month}",
            headers=admin_headers,
        )
        absences_after_delete = resp_after_delete.json()["total_absences"]

        assert absences_after_delete < absences_after_create, "Absence count should decrease"

    def test_employee_cannot_delete_absence(self, client, emp_headers, admin_headers, test_employee, test_shift):
        resp_create = client.post(
            "/api/v1/employee/time-tracking/absences",
            json=_absence_payload(test_employee.id),
            headers=admin_headers,
        )
        absence_id = resp_create.json()["id"]

        resp_delete = client.delete(
            f"/api/v1/employee/time-tracking/absences/{absence_id}",
            headers=emp_headers,
        )
        assert resp_delete.status_code == 403
