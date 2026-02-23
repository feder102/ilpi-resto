"""T060: Team model."""

import uuid
from datetime import datetime, time, timezone

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Team(SQLModel, table=True):
    __tablename__ = "team"
    __table_args__ = (
        UniqueConstraint("tenant_id", "name", "department", name="uq_team_tenant_name_dept"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    name: str = Field(max_length=100)
    department: str
    shift_type: str = Field(max_length=50)
    shift_start: time
    shift_end: time
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
