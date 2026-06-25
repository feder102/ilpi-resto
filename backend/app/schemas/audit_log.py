"""Schemas for audit log endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class AuditLogRead(BaseModel):
    id: uuid.UUID
    entity_type: str
    entity_id: str
    action: str
    old_value: str | None
    new_value: str | None
    changed_by: uuid.UUID
    changed_by_email: str | None
    created_at: datetime


class PaginatedAuditLog(BaseModel):
    items: list[AuditLogRead]
    total: int
    page: int
    size: int
    pages: int
