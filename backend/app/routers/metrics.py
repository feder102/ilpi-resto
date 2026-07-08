"""Personnel metrics reports router (Feature 015).

Admin-only endpoints under ``/api/v1/reports/*`` that back the "Métricas de
Personal" section of the Reports view. RBAC is enforced twice: the
``require_role("Admin")`` dependency on each endpoint and an explicit check in
the service layer.
"""

from datetime import date

from fastapi import APIRouter, Depends, Query

from app.common.exceptions import handle_exceptions
from app.dependencies import DbSession, TenantId, require_role
from app.schemas.metrics import (
    AbsenteeismResponse,
    OvertimeRankingResponse,
    OvertimeRatioResponse,
    VacationLiabilityResponse,
)
from app.services import metrics_service

router = APIRouter(tags=["metrics"])

AdminOnly = Depends(require_role("Admin"))


@router.get("/reports/overtime-ratio", response_model=OvertimeRatioResponse)
@handle_exceptions
def get_overtime_ratio(
    session: DbSession,
    tenant_id: TenantId,
    date_from: date | None = Query(None, description="Inicio del rango (YYYY-MM-DD)"),
    date_to: date | None = Query(None, description="Fin del rango (YYYY-MM-DD)"),
    current_user: dict = AdminOnly,
) -> OvertimeRatioResponse:
    """Ratio of extra hours to ordinary hours for the period."""
    return metrics_service.get_overtime_ratio(
        session, tenant_id, current_user, date_from=date_from, date_to=date_to
    )


@router.get("/reports/overtime-ranking", response_model=OvertimeRankingResponse)
@handle_exceptions
def get_overtime_ranking(
    session: DbSession,
    tenant_id: TenantId,
    date_from: date | None = Query(None, description="Inicio del rango (YYYY-MM-DD)"),
    date_to: date | None = Query(None, description="Fin del rango (YYYY-MM-DD)"),
    limit: int = Query(
        metrics_service.DEFAULT_RANKING_LIMIT, ge=1, le=50, description="Máximo de empleados"
    ),
    current_user: dict = AdminOnly,
) -> OvertimeRankingResponse:
    """Top employees by extra hours in the period."""
    return metrics_service.get_overtime_ranking(
        session, tenant_id, current_user, date_from=date_from, date_to=date_to, limit=limit
    )


@router.get("/reports/absenteeism", response_model=AbsenteeismResponse)
@handle_exceptions
def get_absenteeism(
    session: DbSession,
    tenant_id: TenantId,
    date_from: date | None = Query(None, description="Inicio del rango (YYYY-MM-DD)"),
    date_to: date | None = Query(None, description="Fin del rango (YYYY-MM-DD)"),
    current_user: dict = AdminOnly,
) -> AbsenteeismResponse:
    """Absenteeism rate for the period with justified/unjustified breakdown."""
    return metrics_service.get_absenteeism(
        session, tenant_id, current_user, date_from=date_from, date_to=date_to
    )


@router.get("/reports/vacation-liability", response_model=VacationLiabilityResponse)
@handle_exceptions
def get_vacation_liability(
    session: DbSession,
    tenant_id: TenantId,
    year: int | None = Query(None, ge=2020, le=2100, description="Año de cálculo (YYYY)"),
    current_user: dict = AdminOnly,
) -> VacationLiabilityResponse:
    """Accrued vacation liability per active employee plus staff totals."""
    return metrics_service.get_vacation_liability(session, tenant_id, current_user, year=year)
