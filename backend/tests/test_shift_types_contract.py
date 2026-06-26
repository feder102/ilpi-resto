"""T012-T016: Contract tests for shift-types API endpoints."""

from typing import TYPE_CHECKING

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.shift_type import ShiftType

if TYPE_CHECKING:
    from app.models.tenant import Tenant


class TestPostShiftTypes:
    """T012: POST /shift-types endpoint."""

    def test_create_single_window_shift_type(
        self, client: TestClient, admin_headers: dict
    ):
        """Should create Mañana shift type with single time window."""
        response = client.post(
            "/api/v1/shift-types",
            headers=admin_headers,
            json={
                "name": "Mañana",
                "type": "MAÑANA",
                "time_windows": [{"start": "10:30", "end": "18:00"}],
                "uses_dynamic_close": False,
                "expected_hours": 7.5,
                "description": "Morning shift",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Mañana"
        assert data["type"] == "MAÑANA"
        assert data["total_hours"] == 7.5
        assert data["is_active"] is True
        assert len(data["time_windows"]) == 1

    def test_create_split_window_shift_type(
        self, client: TestClient, admin_headers: dict
    ):
        """T012: Should create Cortado shift type with two time windows."""
        response = client.post(
            "/api/v1/shift-types",
            headers=admin_headers,
            json={
                "name": "Cortado",
                "type": "CORTADO",
                "time_windows": [
                    {"start": "12:30", "end": "16:30"},
                    {"start": "18:30", "end": "22:30"},
                ],
                "uses_dynamic_close": False,
                "expected_hours": 8.0,
                "description": "Split shift",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Cortado"
        assert data["type"] == "CORTADO"
        assert data["total_hours"] == 8.0
        assert len(data["time_windows"]) == 2

    def test_create_dynamic_close_shift_type(
        self, client: TestClient, admin_headers: dict
    ):
        """T012: Should create Noche shift type with dynamic close."""
        response = client.post(
            "/api/v1/shift-types",
            headers=admin_headers,
            json={
                "name": "Noche",
                "type": "NOCHE",
                "time_windows": [{"start": "17:00", "end": "23:59"}],
                "uses_dynamic_close": True,
                "expected_hours": 6.98,  # 17:00-23:59 = 6 hours 59 minutes
                "description": "Evening shift to close",
            },
        )

        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.json()}"
        data = response.json()
        assert data["uses_dynamic_close"] is True
        assert data["expected_hours"] == 6.98

    def test_create_duplicate_name_rejected(
        self, client: TestClient, admin_headers: dict, session: Session, test_tenant
    ):
        """T012: Should reject duplicate shift type names per tenant."""
        # Create first shift type
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

        # Try to create duplicate
        response = client.post(
            "/api/v1/shift-types",
            headers=admin_headers,
            json={
                "name": "Mañana",
                "type": "MAÑANA",
                "time_windows": [{"start": "10:30", "end": "18:00"}],
                "uses_dynamic_close": False,
                "expected_hours": 7.5,
            },
        )

        assert response.status_code == 409
        assert "already exists" in response.json()["error"]["message"]


class TestGetShiftTypes:
    """T013: GET /shift-types endpoint."""

    def test_list_shift_types_paginated(
        self, client: TestClient, admin_headers: dict, session: Session, test_tenant
    ):
        """T013: Should list shift types paginated."""
        # Create 3 shift types
        for name in ["Mañana", "Noche", "Cortado"]:
            st = ShiftType(
                tenant_id=test_tenant.id,
                name=name,
                type=name.upper(),
                time_windows=[{"start": "10:00", "end": "18:00"}],
                uses_dynamic_close=False,
                expected_hours=8.0,
            )
            session.add(st)
        session.commit()

        response = client.get(
            "/api/v1/shift-types?page=1&size=2",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 3
        assert data["page"] == 1
        assert data["pages"] == 2

    def test_get_single_shift_type(
        self, client: TestClient, admin_headers: dict, session: Session, test_tenant
    ):
        """T013: Should get single shift type by ID."""
        st = ShiftType(
            tenant_id=test_tenant.id,
            name="Mañana",
            type="MAÑANA",
            time_windows=[{"start": "10:30", "end": "18:00"}],
            uses_dynamic_close=False,
            expected_hours=7.5,
        )
        session.add(st)
        session.commit()

        response = client.get(
            f"/api/v1/shift-types/{st.id}",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(st.id)
        assert data["name"] == "Mañana"
        assert data["total_hours"] == 7.5

    def test_get_nonexistent_shift_type_404(
        self, client: TestClient, admin_headers: dict
    ):
        """T013: Should return 404 for nonexistent shift type."""
        import uuid

        response = client.get(
            f"/api/v1/shift-types/{uuid.uuid4()}",
            headers=admin_headers,
        )

        assert response.status_code == 404


class TestPutShiftTypes:
    """T015: PUT /shift-types/{id} endpoint."""

    def test_update_shift_type_times(
        self, client: TestClient, admin_headers: dict, session: Session, test_tenant
    ):
        """T015: Should update shift type times."""
        st = ShiftType(
            tenant_id=test_tenant.id,
            name="Mañana",
            type="MAÑANA",
            time_windows=[{"start": "10:30", "end": "18:00"}],
            uses_dynamic_close=False,
            expected_hours=7.5,
        )
        session.add(st)
        session.commit()

        response = client.put(
            f"/api/v1/shift-types/{st.id}",
            headers=admin_headers,
            json={
                "time_windows": [{"start": "10:00", "end": "18:30"}],
                "expected_hours": 8.5,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_hours"] == 8.5

    def test_update_to_duplicate_name_409(
        self, client: TestClient, admin_headers: dict, session: Session, test_tenant
    ):
        """T015: Should reject update if new name is duplicate."""
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
            expected_hours=7.7,
        )
        session.add(st1)
        session.add(st2)
        session.commit()

        response = client.put(
            f"/api/v1/shift-types/{st2.id}",
            headers=admin_headers,
            json={"name": "Mañana"},
        )

        assert response.status_code == 409


class TestDeleteShiftTypes:
    """T016: DELETE /shift-types/{id} endpoint."""

    def test_delete_shift_type_soft_delete(
        self, client: TestClient, admin_headers: dict, session: Session, test_tenant
    ):
        """T016: Should soft-delete shift type (is_active=False)."""
        st = ShiftType(
            tenant_id=test_tenant.id,
            name="Mañana",
            type="MAÑANA",
            time_windows=[{"start": "10:30", "end": "18:00"}],
            uses_dynamic_close=False,
            expected_hours=7.5,
        )
        session.add(st)
        session.commit()

        response = client.delete(
            f"/api/v1/shift-types/{st.id}",
            headers=admin_headers,
        )

        assert response.status_code == 204

        # Verify soft delete (is_active=False)
        session.refresh(st)
        assert st.is_active is False

    def test_delete_nonexistent_shift_type_404(
        self, client: TestClient, admin_headers: dict
    ):
        """T016: Should return 404 for nonexistent shift type."""
        import uuid

        response = client.delete(
            f"/api/v1/shift-types/{uuid.uuid4()}",
            headers=admin_headers,
        )

        assert response.status_code == 404


class TestShiftTypesRBAC:
    """RBAC tests for shift-types endpoints."""

    def test_moderador_can_create_shift_type(
        self, client: TestClient, mod_headers: dict
    ):
        """Should allow Moderador to create shift types."""
        response = client.post(
            "/api/v1/shift-types",
            headers=mod_headers,
            json={
                "name": "Mañana",
                "type": "MAÑANA",
                "time_windows": [{"start": "10:30", "end": "18:00"}],
                "uses_dynamic_close": False,
                "expected_hours": 7.5,
            },
        )

        assert response.status_code == 201

    def test_moderador_cannot_delete_shift_type(
        self, client: TestClient, session: Session, test_tenant, mod_headers: dict
    ):
        """Should deny Moderador deletion of shift types."""
        # Create shift type
        st = ShiftType(
            tenant_id=test_tenant.id,
            name="Mañana",
            type="MAÑANA",
            time_windows=[{"start": "10:30", "end": "18:00"}],
            uses_dynamic_close=False,
            expected_hours=7.5,
        )
        session.add(st)
        session.commit()

        response = client.delete(
            f"/api/v1/shift-types/{st.id}",
            headers=mod_headers,
        )

        assert response.status_code == 403


class TestErrorMessages:
    """T069: Test error messages for various validation failures."""

    def test_duplicate_name_error_message(
        self, client: TestClient, admin_headers: dict, test_tenant: "Tenant", session: Session
    ):
        """Should return clear error message for duplicate shift type name."""
        # Create first shift type
        client.post(
            "/api/v1/shift-types",
            headers=admin_headers,
            json={
                "name": "Mañana",
                "type": "MAÑANA",
                "time_windows": [{"start": "10:30", "end": "18:00"}],
                "uses_dynamic_close": False,
                "expected_hours": 7.5,
            },
        )

        # Attempt to create duplicate
        response = client.post(
            "/api/v1/shift-types",
            headers=admin_headers,
            json={
                "name": "Mañana",
                "type": "MAÑANA",
                "time_windows": [{"start": "10:30", "end": "18:00"}],
                "uses_dynamic_close": False,
                "expected_hours": 7.5,
            },
        )

        assert response.status_code == 409
        data = response.json()
        error_msg = data.get("error", {}).get("message", "").lower() or data.get("detail", "").lower()
        assert "duplicate" in error_msg or "already exists" in error_msg

    def test_invalid_time_windows_error_message(
        self, client: TestClient, admin_headers: dict
    ):
        """Should return clear error message for invalid time window format."""
        response = client.post(
            "/api/v1/shift-types",
            headers=admin_headers,
            json={
                "name": "Invalid Shift",
                "type": "MAÑANA",
                "time_windows": [{"start": "25:00", "end": "18:00"}],  # Invalid hour
                "uses_dynamic_close": False,
                "expected_hours": 7.5,
            },
        )

        assert response.status_code == 422  # Validation error
        data = response.json()
        assert "time" in str(data).lower() or "window" in str(data).lower()

    def test_hours_mismatch_error_message(
        self, client: TestClient, admin_headers: dict
    ):
        """Should return error when expected_hours doesn't match calculated total_hours."""
        response = client.post(
            "/api/v1/shift-types",
            headers=admin_headers,
            json={
                "name": "Cortado Mismatch",
                "type": "CORTADO",
                "time_windows": [
                    {"start": "12:30", "end": "16:30"},  # 4.0 hours
                    {"start": "18:30", "end": "22:30"},  # 4.0 hours = 8.0 total
                ],
                "uses_dynamic_close": False,
                "expected_hours": 7.5,  # Doesn't match 8.0
            },
        )

        assert response.status_code == 400
        data = response.json()
        # Error should mention hours or expected/calculated mismatch
        error_detail = str(data)
        assert "hour" in error_detail.lower() or "expect" in error_detail.lower()

    def test_invalid_window_order_error(
        self, client: TestClient, admin_headers: dict
    ):
        """Should return error when time windows are not chronologically ordered."""
        response = client.post(
            "/api/v1/shift-types",
            headers=admin_headers,
            json={
                "name": "Out of Order",
                "type": "CORTADO",
                "time_windows": [
                    {"start": "18:30", "end": "22:30"},  # Later window first
                    {"start": "12:30", "end": "16:30"},  # Earlier window second
                ],
                "uses_dynamic_close": False,
                "expected_hours": 8.0,
            },
        )

        assert response.status_code == 400
        data = response.json()
        error_detail = str(data).lower()
        assert "order" in error_detail or "chrono" in error_detail or "earlier" in error_detail
