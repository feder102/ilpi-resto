"""T021/T036/T045: Seed script for initial data."""

from sqlmodel import Session, select

from app.common.security import hash_password
from app.database import engine
from app.models.tenant import Tenant


def seed() -> None:
    with Session(engine) as session:
        # Check if already seeded
        existing = session.exec(select(Tenant).where(Tenant.slug == "ilpi")).first()
        if existing:
            print("Seed data already exists. Skipping.")
            return

        # Create default tenant
        tenant = Tenant(name="ILPI", slug="ilpi", timezone="Europe/Madrid", locale="es")
        session.add(tenant)
        session.flush()

        # Import here to avoid circular imports during migration
        from app.models.employee import Employee
        from app.models.shift_type import ShiftType
        from app.models.user import User

        # Create seed employee (admin's profile)
        employee = Employee(
            tenant_id=tenant.id,
            first_name="Juan",
            last_name="García",
            email="admin@ilpi.es",
            phone="+34600000000",
            dni="12345678A",
            role="Admin",
            department="Dirección",
            status="Activo",
            hire_date="2024-01-15",
        )
        session.add(employee)
        session.flush()

        # Create admin user linked to employee
        admin_user = User(
            tenant_id=tenant.id,
            email="admin@ilpi.es",
            hashed_password=hash_password("Admin123!"),
            role="Admin",
            employee_id=employee.id,
        )
        session.add(admin_user)
        session.flush()

        # T010: Create default shift types
        shift_types = [
            ShiftType(
                tenant_id=tenant.id,
                name="Mañana",
                type="MAÑANA",
                time_windows=[{"start": "10:30", "end": "18:00"}],
                uses_dynamic_close=False,
                expected_hours=7.5,
                description="Turno de mañana",
            ),
            ShiftType(
                tenant_id=tenant.id,
                name="Noche",
                type="NOCHE",
                time_windows=[{"start": "17:00", "end": "23:59"}],
                uses_dynamic_close=True,
                expected_hours=7.7,
                description="Turno de noche hasta cierre",
            ),
            ShiftType(
                tenant_id=tenant.id,
                name="Cortado",
                type="CORTADO",
                time_windows=[
                    {"start": "12:30", "end": "16:30"},
                    {"start": "18:30", "end": "22:30"},
                ],
                uses_dynamic_close=False,
                expected_hours=8.0,
                description="Turno dividido con descanso",
            ),
            ShiftType(
                tenant_id=tenant.id,
                name="Corrido",
                type="CORRIDO",
                time_windows=[{"start": "14:00", "end": "23:59"}],
                uses_dynamic_close=True,
                expected_hours=10.0,
                description="Turno continuo hasta cierre",
            ),
        ]
        for st in shift_types:
            session.add(st)

        session.commit()
        print("Seed data created successfully.")
        print(f"  Tenant: {tenant.name} ({tenant.id})")
        print(f"  Employee: {employee.first_name} {employee.last_name} ({employee.id})")
        print(f"  Admin User: {admin_user.email} ({admin_user.id})")
        print(f"  Shift Types: {len(shift_types)} tipos de turno creados")
        for st in shift_types:
            print(f"    - {st.name}: {st.expected_hours} horas")


if __name__ == "__main__":
    # Ensure all models are imported for table creation
    from app.models import *  # noqa: F401, F403

    seed()
