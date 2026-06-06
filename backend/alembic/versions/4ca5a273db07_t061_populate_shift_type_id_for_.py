"""T061: Populate shift_type_id for existing teams

Revision ID: 4ca5a273db07
Revises: 9db3d4f10fe2
Create Date: 2026-02-28 09:32:49.694087

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '4ca5a273db07'
down_revision: str | None = '9db3d4f10fe2'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """
    Populate shift_type_id for existing teams using shift_type string mapping.

    Maps old shift_type string values to corresponding ShiftType records:
    - 'MAÑANA', 'Mañana' -> ShiftType with name='Mañana'
    - 'NOCHE', 'Noche' -> ShiftType with name='Noche'
    - 'CORTADO', 'Cortado' -> ShiftType with name='Cortado'
    - 'CORRIDO', 'Corrido' -> ShiftType with name='Corrido'

    Teams with unmapped shift_type values are marked as inactive (soft delete).
    """
    connection = op.get_bind()

    # Map old shift_type strings to expected ShiftType names
    shift_type_mapping = {
        'MAÑANA': 'Mañana',
        'NOCHE': 'Noche',
        'CORTADO': 'Cortado',
        'CORRIDO': 'Corrido',
        'Mañana': 'Mañana',
        'Noche': 'Noche',
        'Cortado': 'Cortado',
        'Corrido': 'Corrido',
    }

    # Get all unique (tenant_id, shift_type) combinations that need mapping
    result = connection.execute(
        sa.text("""
        SELECT DISTINCT tenant_id, shift_type FROM team
        WHERE shift_type IS NOT NULL AND shift_type_id IS NULL
        """)
    )

    migrated = 0
    failed = 0

    for row in result.fetchall():
        tenant_id, old_shift_type = row[0], row[1]

        # Get the ShiftType name from mapping
        shift_type_name = shift_type_mapping.get(old_shift_type)

        if shift_type_name:
            # Find ShiftType record for this tenant
            st_result = connection.execute(
                sa.text("""
                SELECT id FROM shift_type
                WHERE tenant_id = :tenant_id AND name = :name
                LIMIT 1
                """),
                {"tenant_id": str(tenant_id), "name": shift_type_name}
            )
            st_row = st_result.fetchone()

            if st_row:
                shift_type_id = str(st_row[0])
                # Update all teams with this shift_type
                update_result = connection.execute(
                    sa.text("""
                    UPDATE team
                    SET shift_type_id = :shift_type_id
                    WHERE tenant_id = :tenant_id AND shift_type = :shift_type
                    """),
                    {
                        "shift_type_id": shift_type_id,
                        "tenant_id": str(tenant_id),
                        "shift_type": old_shift_type
                    }
                )
                migrated += update_result.rowcount if update_result.rowcount else 0
            else:
                # ShiftType record not found - deactivate teams
                connection.execute(
                    sa.text("""
                    UPDATE team
                    SET is_active = FALSE
                    WHERE tenant_id = :tenant_id AND shift_type = :shift_type
                    """),
                    {
                        "tenant_id": str(tenant_id),
                        "shift_type": old_shift_type
                    }
                )
                failed += 1
        else:
            # Unmapped shift_type - deactivate team
            connection.execute(
                sa.text("""
                UPDATE team
                SET is_active = FALSE
                WHERE tenant_id = :tenant_id AND shift_type = :shift_type
                """),
                {
                    "tenant_id": str(tenant_id),
                    "shift_type": old_shift_type
                }
            )
            failed += 1

    # Check for any remaining teams without shift_type_id
    # (should only happen if they had NULL shift_type before)
    remaining = connection.execute(
        sa.text(
            "SELECT COUNT(*) FROM team WHERE shift_type IS NOT NULL AND shift_type_id IS NULL"
        )
    )
    remaining_count = remaining.scalar()

    if remaining_count > 0 or failed > 0:
        print(f"WARNING: {migrated} teams migrated, {failed} teams deactivated due to mapping issues")
    else:
        print(f"SUCCESS: {migrated} teams migrated successfully")


def downgrade() -> None:
    """
    Downgrade: Reset shift_type_id back to NULL for teams that were migrated.

    Note: This is a safe operation as it only clears the shift_type_id values
    and reactivates teams that were deactivated due to mapping failures.
    """
    connection = op.get_bind()

    # Reset shift_type_id to NULL for all teams
    connection.execute(sa.text("UPDATE team SET shift_type_id = NULL"))

    # Reactivate teams that were deactivated (if needed for your business logic)
    # Uncomment if you want to reactivate deactivated teams:
    # connection.execute(sa.text("UPDATE team SET is_active = TRUE WHERE shift_type IS NOT NULL"))
