"""T047c: User management service."""

import uuid
from datetime import datetime, timezone

from sqlmodel import Session, func, select

from app.common.exceptions import DuplicateError, NotFoundError
from app.common.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate, UserListItem, UserUpdate


def create_user(
    data: UserCreate, tenant_id: uuid.UUID, session: Session
) -> UserListItem:
    existing = session.exec(
        select(User).where(User.tenant_id == tenant_id, User.email == data.email)
    ).first()
    if existing:
        raise DuplicateError("Ya existe un usuario con este email", "DUPLICATE_EMAIL")

    user = User(
        tenant_id=tenant_id,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
        employee_id=data.employee_id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return _to_response(user)


def list_users(
    tenant_id: uuid.UUID,
    session: Session,
    role_filter: str | None = None,
    page: int = 1,
    size: int = 20,
) -> dict:
    query = select(User).where(User.tenant_id == tenant_id)
    if role_filter:
        query = query.where(User.role == role_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    offset = (page - 1) * size
    users = session.exec(query.offset(offset).limit(size)).all()
    pages = (total + size - 1) // size if total > 0 else 1

    return {
        "items": [_to_response(u) for u in users],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


def update_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    tenant_id: uuid.UUID,
    session: Session,
) -> UserListItem:
    user = session.exec(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    ).first()
    if not user:
        raise NotFoundError("Usuario no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = hash_password(update_data.pop("password"))
    else:
        update_data.pop("password", None)

    for key, value in update_data.items():
        setattr(user, key, value)
    user.updated_at = datetime.now(timezone.utc)

    session.add(user)
    session.commit()
    session.refresh(user)
    return _to_response(user)


def deactivate_user(
    user_id: uuid.UUID, tenant_id: uuid.UUID, session: Session
) -> dict:
    user = session.exec(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    ).first()
    if not user:
        raise NotFoundError("Usuario no encontrado")

    user.is_active = False
    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    return {"message": "Usuario desactivado"}


def _to_response(user: User) -> UserListItem:
    return UserListItem(
        id=user.id,
        email=user.email,
        role=user.role,
        employee_id=user.employee_id,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
    )
