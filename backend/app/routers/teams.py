"""T067: Teams router."""

import uuid

from fastapi import APIRouter, Depends, Query

from app.dependencies import DbSession, TenantId, require_role
from app.schemas.team import TeamCreate, TeamMemberAdd, TeamUpdate
from app.services import team_service

router = APIRouter(tags=["teams"])

AdminOrMod = Depends(require_role("Admin", "Moderador"))
AdminOnly = Depends(require_role("Admin"))


@router.get("/teams")
def list_teams(
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
    department: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    return team_service.list_teams(tenant_id, session, department, page, size)


@router.post("/teams", status_code=201)
def create_team(
    body: TeamCreate,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
):
    return team_service.create(body, tenant_id, session)


@router.get("/teams/{team_id}")
def get_team(
    team_id: uuid.UUID,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
):
    return team_service.get_by_id(team_id, tenant_id, session)


@router.put("/teams/{team_id}")
def update_team(
    team_id: uuid.UUID,
    body: TeamUpdate,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
):
    return team_service.update(team_id, body, tenant_id, session)


@router.delete("/teams/{team_id}")
def delete_team(
    team_id: uuid.UUID,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOnly,
):
    return team_service.delete(team_id, tenant_id, session)


@router.post("/teams/{team_id}/members")
def add_member(
    team_id: uuid.UUID,
    body: TeamMemberAdd,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
):
    return team_service.add_member(team_id, body.employee_id, tenant_id, session)


@router.delete("/teams/{team_id}/members/{employee_id}")
def remove_member(
    team_id: uuid.UUID,
    employee_id: uuid.UUID,
    session: DbSession,
    tenant_id: TenantId,
    _: dict = AdminOrMod,
):
    return team_service.remove_member(team_id, employee_id, tenant_id, session)
