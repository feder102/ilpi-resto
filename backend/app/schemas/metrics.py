"""Pydantic DTOs for personnel metrics reports (Feature 015).

Response schemas for the Admin-only reports exposed under ``/api/v1/reports/*``:
overtime ratio, absenteeism rate, overtime ranking and accrued vacation liability.
"""

import uuid
from datetime import date

from pydantic import BaseModel


class OvertimeRatioResponse(BaseModel):
    """Overtime vs. ordinary hours ratio for a period.

    ``ratio_pct`` is ``None`` when there are no ordinary hours in the range.
    """

    date_from: date
    date_to: date
    ordinary_hours: float
    extra_hours: float
    ratio_pct: float | None


class OvertimeRankingItem(BaseModel):
    """A single employee entry in the overtime ranking."""

    employee_id: uuid.UUID
    employee_name: str
    extra_hours: float


class OvertimeRankingResponse(BaseModel):
    """Top employees by extra hours for a period (descending)."""

    date_from: date
    date_to: date
    items: list[OvertimeRankingItem]


class AbsenteeismResponse(BaseModel):
    """Absenteeism rate for a period with justified/unjustified breakdown.

    ``rate_pct`` is 0 when there are no planned shifts in the range.
    ``alert`` is True when the rate exceeds the configured threshold.
    """

    date_from: date
    date_to: date
    total_absences: int
    justified_absences: int
    unjustified_absences: int
    planned_shifts: int
    rate_pct: float
    alert: bool


class VacationLiabilityItem(BaseModel):
    """Accrued vacation liability for a single active employee."""

    employee_id: uuid.UUID
    employee_name: str
    annual_days: int
    months_worked: int
    accrued_days: int
    used_days: int
    liability_days: int


class VacationLiabilityResponse(BaseModel):
    """Accrued vacation liability per active employee plus staff totals.

    ``liability_days`` may be negative for an employee that has taken more
    days than accrued to date (an advance).
    """

    year: int
    items: list[VacationLiabilityItem]
    total_accrued: int
    total_used: int
    total_liability: int
