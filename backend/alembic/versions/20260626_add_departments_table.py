"""Add departments table and migrate employee/team department string to FK.

Revision ID: 20260626_departments
Revises: 20260625_vacation_config
Create Date: 2026-06-26

Feature 014: ABM de Departamentos
- Creates table `department` with name, description, color, icon, is_system, is_active
- Seeds 5 default departments per existing tenant (Sin asignar + 4 operativos)
- Adds department_id FK column to employee and team (nullable first, then NOT NULL)
- Backfills department_id by matching lower(name) from existing string; fallback = Sin asignar
- Drops old string column `department` from both tables
- Updates team unique constraint to use department_id

DOWNGRADE WARNING: Loses color/icon/description fields and any manually created departments.
"""

import sqlalchemy as sa

from alembic import op

revision: str = "20260626_departments"
down_revision: str | None = "20260625_vacation_config"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # =========================================================================
    # 1. Create table `department`
    # =========================================================================
    op.create_table(
        "department",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("color", sa.String(length=7), nullable=False, server_default="#6b7280"),
        sa.Column("icon", sa.String(length=40), nullable=False, server_default="Building2"),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(r"color ~ '^#[0-9a-fA-F]{6}$'", name="ck_department_color_hex"),
    )
    op.create_index("ix_department_tenant_id", "department", ["tenant_id"])
    op.create_index("ix_department_tenant_active", "department", ["tenant_id", "is_active"])
    op.create_index("ix_department_tenant_system", "department", ["tenant_id", "is_system"])
    # Functional unique index for case-insensitive name uniqueness per tenant
    op.execute(
        "CREATE UNIQUE INDEX uq_department_tenant_name_lower "
        "ON department (tenant_id, lower(name))"
    )

    # =========================================================================
    # 2. Seed departments per existing tenant
    # =========================================================================
    op.execute("""
        INSERT INTO department (id, tenant_id, name, color, icon, is_system, is_active,
                                created_at, updated_at)
        SELECT gen_random_uuid(), t.id, v.name, v.color, v.icon, v.is_system, TRUE,
               NOW(), NOW()
        FROM tenant t
        CROSS JOIN (VALUES
            ('Sin asignar',         '#9ca3af', 'CircleHelp', TRUE),
            ('Cocina',              '#ef4444', 'ChefHat',    FALSE),
            ('Atención al Público', '#3b82f6', 'Users',      FALSE),
            ('Barra',               '#f59e0b', 'Coffee',     FALSE),
            ('Dirección',           '#8b5cf6', 'Briefcase',  FALSE)
        ) AS v(name, color, icon, is_system)
    """)

    # =========================================================================
    # 3. Add nullable department_id columns to employee and team
    # =========================================================================
    op.add_column("employee", sa.Column("department_id", sa.Uuid(), nullable=True))
    op.add_column("team", sa.Column("department_id", sa.Uuid(), nullable=True))

    # =========================================================================
    # 4. Backfill by matching lower(name); fallback to Sin asignar
    # =========================================================================
    # Match by name first
    op.execute("""
        UPDATE employee e
        SET department_id = d.id
        FROM department d
        WHERE d.tenant_id = e.tenant_id
          AND lower(d.name) = lower(e.department)
    """)

    op.execute("""
        UPDATE team t
        SET department_id = d.id
        FROM department d
        WHERE d.tenant_id = t.tenant_id
          AND lower(d.name) = lower(t.department)
    """)

    # Fallback: unmatched rows → Sin asignar
    op.execute("""
        UPDATE employee e
        SET department_id = d.id
        FROM department d
        WHERE e.department_id IS NULL
          AND d.tenant_id = e.tenant_id
          AND d.is_system = TRUE
    """)

    op.execute("""
        UPDATE team t
        SET department_id = d.id
        FROM department d
        WHERE t.department_id IS NULL
          AND d.tenant_id = t.tenant_id
          AND d.is_system = TRUE
    """)

    # =========================================================================
    # 5. Promote to NOT NULL, add FK constraints, drop old string column
    # =========================================================================
    op.alter_column("employee", "department_id", nullable=False)
    op.create_foreign_key(
        "fk_employee_department",
        "employee", "department",
        ["department_id"], ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("ix_employee_department_id", "employee", ["department_id"])
    op.drop_column("employee", "department")

    op.alter_column("team", "department_id", nullable=False)
    op.create_foreign_key(
        "fk_team_department",
        "team", "department",
        ["department_id"], ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("ix_team_department_id", "team", ["department_id"])
    # Drop old unique constraint BEFORE dropping the column it references;
    # PostgreSQL would cascade-drop it with the column, making the explicit drop fail.
    op.drop_constraint("uq_team_tenant_name_dept", "team", type_="unique")
    op.drop_column("team", "department")

    # Recreate unique constraint on (tenant_id, name, department_id)
    op.create_unique_constraint(
        "uq_team_tenant_name_dept", "team", ["tenant_id", "name", "department_id"]
    )


def downgrade() -> None:
    """
    DOWNGRADE WARNING: Loses color/icon/description and manually-created departments.
    Restores `department` string column from the FK join.
    """
    # Restore string column on team
    op.add_column("team", sa.Column("department", sa.String(), nullable=True))
    op.execute("""
        UPDATE team t
        SET department = d.name
        FROM department d
        WHERE d.id = t.department_id
    """)
    op.alter_column("team", "department", nullable=False)
    op.drop_constraint("uq_team_tenant_name_dept", "team", type_="unique")
    op.create_unique_constraint(
        "uq_team_tenant_name_dept", "team", ["tenant_id", "name", "department"]
    )
    op.drop_index("ix_team_department_id", table_name="team")
    op.drop_constraint("fk_team_department", "team", type_="foreignkey")
    op.drop_column("team", "department_id")

    # Restore string column on employee
    op.add_column("employee", sa.Column("department", sa.String(), nullable=True))
    op.execute("""
        UPDATE employee e
        SET department = d.name
        FROM department d
        WHERE d.id = e.department_id
    """)
    op.alter_column("employee", "department", nullable=False)
    op.drop_index("ix_employee_department_id", table_name="employee")
    op.drop_constraint("fk_employee_department", "employee", type_="foreignkey")
    op.drop_column("employee", "department_id")

    # Drop department table
    op.execute("DROP INDEX IF EXISTS uq_department_tenant_name_lower")
    op.drop_index("ix_department_tenant_system", table_name="department")
    op.drop_index("ix_department_tenant_active", table_name="department")
    op.drop_index("ix_department_tenant_id", table_name="department")
    op.drop_table("department")
