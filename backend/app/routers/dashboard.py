"""T020: Dashboard and reports router — department string → FK (Feature 014)."""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query

from app.dependencies import DbSession, TenantId, require_role
from app.services import dashboard_service

router = APIRouter(tags=["dashboard"])

AdminOrMod = Depends(require_role("Admin", "Moderador"))


@router.get("/dashboard/stats")
def get_stats(
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
):
    return dashboard_service.get_stats(tenant_id, session)


@router.get("/reports/hours-by-day")
def get_hours_by_day(
    session: DbSession,
    tenant_id: TenantId,
    date_from: date | None = Query(None, description="Inicio del rango (YYYY-MM-DD)"),
    date_to: date | None = Query(None, description="Fin del rango (YYYY-MM-DD)"),
    department_id: uuid.UUID | None = Query(None, description="Filtrar por departamento (UUID)"),
    _: dict = AdminOrMod,
):
    return dashboard_service.get_hours_by_day(
        tenant_id, session, date_from=date_from, date_to=date_to, department_id=department_id
    )


@router.get("/reports/department-distribution")
def get_department_distribution(
    session: DbSession,
    tenant_id: TenantId,
    department_id: uuid.UUID | None = Query(None, description="Filtrar por departamento (UUID)"),
    _: dict = AdminOrMod,
):
    return dashboard_service.get_department_distribution(
        tenant_id, session, department_id=department_id
    )
