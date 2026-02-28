"""T007: Shift type service with CRUD and validation."""

import logging
import uuid

from sqlmodel import Session, select

from app.common.exceptions import (
    DuplicateError,
    NotFoundError,
    ValidationError,
)
from app.models.shift_type import ShiftType
from app.schemas.shift_type import (
    ShiftTypeCreate,
    ShiftTypeResponse,
    ShiftTypeUpdate,
)

logger = logging.getLogger(__name__)


def _validate_time_windows(time_windows: list[dict[str, str]]) -> None:
    """Validate time windows format and ordering."""
    if not time_windows:
        raise ValidationError("At least one time window is required")

    if len(time_windows) > 3:
        raise ValidationError("Maximum 3 time windows allowed per shift type")

    # Check windows are ordered chronologically
    for i, window in enumerate(time_windows):
        start_str = window.get("start", "00:00")
        end_str = window.get("end", "00:00")

        # Parse times
        start_h, start_m = map(int, start_str.split(":"))
        end_h, end_m = map(int, end_str.split(":"))

        start_total = start_h * 60 + start_m
        end_total = end_h * 60 + end_m

        # Check start < end (same day or midnight span)
        if start_total == end_total:
            raise ValidationError(f"Window {i+1}: start and end times cannot be equal")

        # For windows after the first, check ordering
        if i > 0:
            prev_end_str = time_windows[i-1].get("end", "00:00")
            prev_end_h, prev_end_m = map(int, prev_end_str.split(":"))
            prev_end_total = prev_end_h * 60 + prev_end_m

            if start_total < prev_end_total:
                raise ValidationError(
                    f"Windows must be chronologically ordered. "
                    f"Window {i+1} starts before Window {i} ends"
                )


def _validate_expected_hours(
    time_windows: list[dict[str, str]], expected_hours: float, tolerance: float = 0.01
) -> None:
    """Validate expected_hours matches calculated total (within tolerance)."""
    # Calculate total from windows
    total_minutes = 0
    for window in time_windows:
        start_str = window.get("start", "00:00")
        end_str = window.get("end", "00:00")

        start_h, start_m = map(int, start_str.split(":"))
        end_h, end_m = map(int, end_str.split(":"))

        start_total_m = start_h * 60 + start_m
        end_total_m = end_h * 60 + end_m

        # Handle midnight spans
        if end_total_m < start_total_m:
            end_total_m += 24 * 60

        total_minutes += end_total_m - start_total_m

    calculated = round(total_minutes / 60, 2)

    if abs(calculated - expected_hours) > tolerance:
        raise ValidationError(
            f"Expected hours ({expected_hours}) doesn't match calculated hours ({calculated}). "
            f"Tolerance: ±{tolerance}"
        )


def create(
    data: ShiftTypeCreate, tenant_id: uuid.UUID, session: Session
) -> ShiftTypeResponse:
    """Create new shift type with validation."""
    # Check for duplicate name per tenant
    existing = session.exec(
        select(ShiftType).where(
            ShiftType.tenant_id == tenant_id,
            ShiftType.name == data.name,
        )
    ).first()

    if existing:
        raise DuplicateError(
            f"Shift type '{data.name}' already exists for this tenant",
            "DUPLICATE_SHIFT_TYPE",
        )

    # Validate time windows
    _validate_time_windows([w.model_dump() for w in data.time_windows])

    # Validate expected hours
    _validate_expected_hours(
        [w.model_dump() for w in data.time_windows],
        data.expected_hours,
    )

    # Create shift type
    shift_type = ShiftType(
        tenant_id=tenant_id,
        name=data.name,
        type=data.type,
        time_windows=[w.model_dump() for w in data.time_windows],
        uses_dynamic_close=data.uses_dynamic_close,
        expected_hours=data.expected_hours,
        description=data.description,
    )

    session.add(shift_type)
    session.commit()
    session.refresh(shift_type)

    # T025: Log shift type creation
    logger.info(
        "Shift type created",
        extra={
            "event_type": "SHIFT_TYPE_CREATE",
            "shift_type_id": str(shift_type.id),
            "shift_type_name": shift_type.name,
            "shift_type": shift_type.type,
            "tenant_id": str(tenant_id),
        },
    )

    return ShiftTypeResponse(
        id=shift_type.id,
        tenant_id=shift_type.tenant_id,
        name=shift_type.name,
        type=shift_type.type,
        time_windows=shift_type.time_windows,
        uses_dynamic_close=shift_type.uses_dynamic_close,
        expected_hours=shift_type.expected_hours,
        total_hours=shift_type.total_hours,
        description=shift_type.description,
        is_active=shift_type.is_active,
        created_at=shift_type.created_at,
        updated_at=shift_type.updated_at,
    )


def list_shift_types(
    tenant_id: uuid.UUID,
    session: Session,
    active_only: bool = True,
    page: int = 1,
    size: int = 20,
) -> dict:
    """List shift types for tenant, paginated."""
    query = select(ShiftType).where(ShiftType.tenant_id == tenant_id)

    if active_only:
        query = query.where(ShiftType.is_active == True)  # noqa: E712

    # Get total count before pagination
    total = len(session.exec(query).all())

    # Apply pagination
    offset = (page - 1) * size
    items = session.exec(query.offset(offset).limit(size)).all()

    return {
        "items": [
            ShiftTypeResponse(
                id=st.id,
                tenant_id=st.tenant_id,
                name=st.name,
                type=st.type,
                time_windows=st.time_windows,
                uses_dynamic_close=st.uses_dynamic_close,
                expected_hours=st.expected_hours,
                total_hours=st.total_hours,
                description=st.description,
                is_active=st.is_active,
                created_at=st.created_at,
                updated_at=st.updated_at,
            )
            for st in items
        ],
        "page": page,
        "size": size,
        "total": total,
        "pages": (total + size - 1) // size,
    }


def get_by_id(
    shift_type_id: uuid.UUID, tenant_id: uuid.UUID, session: Session
) -> ShiftTypeResponse:
    """Get single shift type by ID."""
    shift_type = session.exec(
        select(ShiftType).where(
            ShiftType.id == shift_type_id,
            ShiftType.tenant_id == tenant_id,
        )
    ).first()

    if not shift_type:
        raise NotFoundError("Shift type not found")

    # Get teams using this shift type (for informational purposes)
    # teams_count = len(session.exec(
    #     select(Team).where(Team.shift_type_id == shift_type_id)
    # ).all())

    return ShiftTypeResponse(
        id=shift_type.id,
        tenant_id=shift_type.tenant_id,
        name=shift_type.name,
        type=shift_type.type,
        time_windows=shift_type.time_windows,
        uses_dynamic_close=shift_type.uses_dynamic_close,
        expected_hours=shift_type.expected_hours,
        total_hours=shift_type.total_hours,
        description=shift_type.description,
        is_active=shift_type.is_active,
        created_at=shift_type.created_at,
        updated_at=shift_type.updated_at,
    )


def update(
    shift_type_id: uuid.UUID,
    data: ShiftTypeUpdate,
    tenant_id: uuid.UUID,
    session: Session,
) -> ShiftTypeResponse:
    """Update shift type."""
    shift_type = session.exec(
        select(ShiftType).where(
            ShiftType.id == shift_type_id,
            ShiftType.tenant_id == tenant_id,
        )
    ).first()

    if not shift_type:
        raise NotFoundError("Shift type not found")

    # Check for duplicate name if changing name
    if data.name and data.name != shift_type.name:
        existing = session.exec(
            select(ShiftType).where(
                ShiftType.tenant_id == tenant_id,
                ShiftType.name == data.name,
            )
        ).first()

        if existing:
            raise DuplicateError(
                f"Shift type '{data.name}' already exists for this tenant",
                "DUPLICATE_SHIFT_TYPE",
            )

    # Update fields
    if data.name is not None:
        shift_type.name = data.name
    if data.type is not None:
        shift_type.type = data.type
    if data.time_windows is not None:
        time_windows_dict = [w.model_dump() for w in data.time_windows]
        _validate_time_windows(time_windows_dict)
        shift_type.time_windows = time_windows_dict
    if data.uses_dynamic_close is not None:
        shift_type.uses_dynamic_close = data.uses_dynamic_close
    if data.expected_hours is not None:
        shift_type.expected_hours = data.expected_hours
    if data.description is not None:
        shift_type.description = data.description

    # Validate expected hours if windows or hours changed
    if data.time_windows is not None or data.expected_hours is not None:
        _validate_expected_hours(
            shift_type.time_windows,
            shift_type.expected_hours,
        )

    session.add(shift_type)
    session.commit()
    session.refresh(shift_type)

    # T025: Log shift type update
    logger.info(
        "Shift type updated",
        extra={
            "event_type": "SHIFT_TYPE_UPDATE",
            "shift_type_id": str(shift_type.id),
            "shift_type_name": shift_type.name,
            "tenant_id": str(tenant_id),
        },
    )

    return ShiftTypeResponse(
        id=shift_type.id,
        tenant_id=shift_type.tenant_id,
        name=shift_type.name,
        type=shift_type.type,
        time_windows=shift_type.time_windows,
        uses_dynamic_close=shift_type.uses_dynamic_close,
        expected_hours=shift_type.expected_hours,
        total_hours=shift_type.total_hours,
        description=shift_type.description,
        is_active=shift_type.is_active,
        created_at=shift_type.created_at,
        updated_at=shift_type.updated_at,
    )


def delete(shift_type_id: uuid.UUID, tenant_id: uuid.UUID, session: Session) -> None:
    """Soft-delete shift type (prevents deletion if teams assigned)."""
    shift_type = session.exec(
        select(ShiftType).where(
            ShiftType.id == shift_type_id,
            ShiftType.tenant_id == tenant_id,
        )
    ).first()

    if not shift_type:
        raise NotFoundError("Shift type not found")

    # Check if any teams use this shift type
    # Note: Currently Team model uses shift_type as string, not FK
    # This check will be enabled after Team model migration in Phase 5
    # teams_using = session.exec(
    #     select(Team).where(
    #         Team.shift_type_id == shift_type_id,
    #         Team.is_active == True,
    #     )
    # ).all()
    #
    # if teams_using:
    #     team_names = [t.name for t in teams_using]
    #     raise ShiftTypeInUseError(
    #         f"Shift type is assigned to {len(teams_using)} team(s): {', '.join(team_names)}"
    #     )

    # Soft delete
    shift_type.is_active = False
    session.add(shift_type)
    session.commit()

    # T025: Log shift type deletion
    logger.info(
        "Shift type deleted",
        extra={
            "event_type": "SHIFT_TYPE_DELETE",
            "shift_type_id": str(shift_type_id),
            "shift_type_name": shift_type.name,
            "tenant_id": str(tenant_id),
        },
    )
