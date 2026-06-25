"""Schemas for vacation settings endpoints."""

from pydantic import BaseModel, Field


class VacationSettingsRead(BaseModel):
    default_vacation_days: int


class VacationSettingsUpdate(BaseModel):
    default_vacation_days: int = Field(..., ge=1, le=365)
