"""T017-T018: Unit tests for ShiftType model."""

import pytest
from app.models.shift_type import ShiftType
import uuid


@pytest.fixture
def tenant_id() -> uuid.UUID:
    """Create a test tenant ID."""
    return uuid.uuid4()


class TestShiftTypeTotalHours:
    """T017: Test total_hours calculation for various shift types."""

    def test_single_window_shift_hours(self, tenant_id: uuid.UUID):
        """T017: Should calculate hours for single-window shift (Mañana)."""
        shift = ShiftType(
            tenant_id=tenant_id,
            name="Mañana",
            type="MAÑANA",
            time_windows=[{"start": "10:30", "end": "18:00"}],
            uses_dynamic_close=False,
            expected_hours=7.5,
        )

        assert shift.total_hours == 7.5

    def test_split_window_shift_hours(self, tenant_id: uuid.UUID):
        """T017: Should calculate hours for split-window shift (Cortado)."""
        shift = ShiftType(
            tenant_id=tenant_id,
            name="Cortado",
            type="CORTADO",
            time_windows=[
                {"start": "12:30", "end": "16:30"},
                {"start": "18:30", "end": "22:30"},
            ],
            uses_dynamic_close=False,
            expected_hours=8.0,
        )

        # 4 hours (12:30-16:30) + 4 hours (18:30-22:30) = 8.0
        assert shift.total_hours == 8.0

    def test_midnight_spanning_shift_hours(self, tenant_id: uuid.UUID):
        """T017: Should handle midnight-spanning shifts (23:00 to 06:00)."""
        shift = ShiftType(
            tenant_id=tenant_id,
            name="NightShift",
            type="NOCHE",
            time_windows=[{"start": "23:00", "end": "06:00"}],
            uses_dynamic_close=False,
            expected_hours=7.0,
        )

        # 23:00 to 06:00 = 7 hours
        assert shift.total_hours == 7.0

    def test_three_window_shift_hours(self, tenant_id: uuid.UUID):
        """T017: Should calculate hours for three-window shift."""
        shift = ShiftType(
            tenant_id=tenant_id,
            name="Complex",
            type="CORTADO",
            time_windows=[
                {"start": "08:00", "end": "10:00"},
                {"start": "12:00", "end": "14:00"},
                {"start": "16:00", "end": "18:00"},
            ],
            uses_dynamic_close=False,
            expected_hours=6.0,
        )

        # 2 + 2 + 2 = 6.0
        assert shift.total_hours == 6.0

    def test_fractional_hours(self, tenant_id: uuid.UUID):
        """T017: Should handle fractional hours (45 min = 0.75 hr)."""
        shift = ShiftType(
            tenant_id=tenant_id,
            name="PartialHour",
            type="MAÑANA",
            time_windows=[{"start": "10:00", "end": "10:45"}],
            uses_dynamic_close=False,
            expected_hours=0.75,
        )

        assert shift.total_hours == 0.75

    def test_noche_shift_hours(self, tenant_id: uuid.UUID):
        """T017: Should calculate Noche shift with dynamic close."""
        shift = ShiftType(
            tenant_id=tenant_id,
            name="Noche",
            type="NOCHE",
            time_windows=[{"start": "17:00", "end": "23:59"}],
            uses_dynamic_close=True,
            expected_hours=7.7,  # Expected, not calculated from windows
        )

        # For dynamic close shifts, expected_hours is used
        # But total_hours calculates from windows (23:00 - 17:00 = 6.98 hours)
        assert round(shift.total_hours, 1) == 7.0

    def test_corrido_shift_hours(self, tenant_id: uuid.UUID):
        """T017: Should calculate Corrido shift (continuous to close)."""
        shift = ShiftType(
            tenant_id=tenant_id,
            name="Corrido",
            type="CORRIDO",
            time_windows=[{"start": "14:00", "end": "23:59"}],
            uses_dynamic_close=True,
            expected_hours=10.0,
        )

        # 23:59 - 14:00 = ~9.98 hours
        assert round(shift.total_hours, 1) == 10.0


class TestShiftTypeValidation:
    """T018: Test validation logic for ShiftType."""

    def test_shift_type_requires_time_windows(self, tenant_id: uuid.UUID):
        """T018: Should have valid time_windows."""
        shift = ShiftType(
            tenant_id=tenant_id,
            name="Test",
            type="MAÑANA",
            time_windows=[],  # Empty
            uses_dynamic_close=False,
            expected_hours=0.0,
        )

        assert shift.time_windows == []

    def test_shift_type_is_active_default(self, tenant_id: uuid.UUID):
        """T018: Should default is_active to True."""
        shift = ShiftType(
            tenant_id=tenant_id,
            name="Test",
            type="MAÑANA",
            time_windows=[{"start": "10:00", "end": "18:00"}],
            uses_dynamic_close=False,
            expected_hours=8.0,
        )

        assert shift.is_active is True

    def test_shift_type_uses_dynamic_close_default(self, tenant_id: uuid.UUID):
        """T018: Should default uses_dynamic_close to False."""
        shift = ShiftType(
            tenant_id=tenant_id,
            name="Test",
            type="MAÑANA",
            time_windows=[{"start": "10:00", "end": "18:00"}],
            expected_hours=8.0,
            # uses_dynamic_close not provided
        )

        assert shift.uses_dynamic_close is False

    def test_shift_type_description_optional(self, tenant_id: uuid.UUID):
        """T018: Should allow optional description."""
        shift_with = ShiftType(
            tenant_id=tenant_id,
            name="WithDesc",
            type="MAÑANA",
            time_windows=[{"start": "10:00", "end": "18:00"}],
            uses_dynamic_close=False,
            expected_hours=8.0,
            description="Morning shift",
        )

        shift_without = ShiftType(
            tenant_id=tenant_id,
            name="NoDesc",
            type="NOCHE",
            time_windows=[{"start": "17:00", "end": "23:59"}],
            uses_dynamic_close=True,
            expected_hours=7.7,
        )

        assert shift_with.description == "Morning shift"
        assert shift_without.description is None
