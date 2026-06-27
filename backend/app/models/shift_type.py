"""T001: Shift type model for predefined shift configurations."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, CheckConstraint, Column, Index, UniqueConstraint
from sqlmodel import Field, SQLModel


class ShiftType(SQLModel, table=True):
    """Predefined shift configuration (Mañana, Noche, Cortado, Corrido)."""

    __tablename__ = "shift_type"
    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_shift_type_tenant_name"),
        Index("idx_shift_type_tenant_active", "tenant_id", "is_active"),
        Index("idx_shift_type_tenant_name", "tenant_id", "name"),
        CheckConstraint("expected_hours >= 0.5 AND expected_hours <= 24.0"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    name: str = Field(max_length=100)
    type: str = Field(default="", max_length=20)
    time_windows: list[dict[str, str]] = Field(
        sa_column=Column(JSON),
        description="Array of {start: 'HH:MM', end: 'HH:MM'}",
    )
    uses_dynamic_close: bool = Field(default=False)
    expected_hours: float
    description: str | None = Field(None, max_length=500)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @property
    def total_hours(self) -> float:
        """Calculate total hours from time windows, handling midnight spans."""
        total_minutes = 0
        for window in self.time_windows:
            start_str = window.get("start", "00:00")
            end_str = window.get("end", "00:00")

            # Parse HH:MM format
            start_h, start_m = map(int, start_str.split(":"))
            end_h, end_m = map(int, end_str.split(":"))

            start_total_m = start_h * 60 + start_m
            end_total_m = end_h * 60 + end_m

            # Handle midnight spans (e.g., 23:00 to 06:00)
            if end_total_m < start_total_m:
                end_total_m += 24 * 60

            total_minutes += end_total_m - start_total_m

        return round(total_minutes / 60, 2)
