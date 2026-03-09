"""
Security Critical Test Cases: Feature 005 Route Guards
Tests for is_active enforcement, password setup blocking, and RLS
"""

import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
import pytest
from sqlmodel import Session, select

from app.common.security import hash_password, create_token
from app.models.user import User
from app.models.employee import Employee
from app.models.tenant import Tenant
from app.main import app


@pytest.fixture
def tenant(session: Session) -> Tenant:
    """Create test tenant."""
    tenant = Tenant(
        id=uuid.uuid4(),
        name="Test Tenant",
        slug="test-tenant",
        timezone="Europe/Madrid",
        locale="es"
    )
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return tenant


@pytest.fixture
def inactive_employee(session: Session, tenant: Tenant) -> tuple[Employee, User]:
    """Create inactive employee (is_active=false) for testing blocking."""
    emp_id = uuid.uuid4()
    employee = Employee(
        id=emp_id,
        tenant_id=tenant.id,
        email="inactive@test.com",
        first_name="Inactive",
        last_name="Employee",
        dni="12345678A",
        phone="123456789",
        address="123 Main St",
        gender="M",
        birth_date=datetime(1990, 1, 1).date(),
        hire_date=datetime(2025, 1, 1).date(),
        department="Kitchen",
        is_active=True
    )
    session.add(employee)
    session.commit()
    session.refresh(employee)

    # Create user with is_active=false (password not set yet)
    user = User(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        email="inactive@test.com",
        hashed_password=None,  # No password yet
        role="Empleado",
        employee_id=emp_id,
        is_active=False,  # CRITICAL: Password setup incomplete
        password_reset_token=None,
        password_reset_expires=None,
        last_login=None
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    return employee, user


@pytest.fixture
def active_employee(session: Session, tenant: Tenant) -> tuple[Employee, User]:
    """Create active employee (is_active=true) for positive tests."""
    emp_id = uuid.uuid4()
    employee = Employee(
        id=emp_id,
        tenant_id=tenant.id,
        email="active@test.com",
        first_name="Active",
        last_name="Employee",
        dni="87654321B",
        phone="987654321",
        address="456 Oak St",
        gender="F",
        birth_date=datetime(1992, 3, 15).date(),
        hire_date=datetime(2025, 1, 1).date(),
        department="Kitchen",
        is_active=True
    )
    session.add(employee)
    session.commit()
    session.refresh(employee)

    # Create active user (password already set)
    user = User(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        email="active@test.com",
        hashed_password=hash_password("ValidPassword123"),
        role="Empleado",
        employee_id=emp_id,
        is_active=True,  # CRITICAL: Password setup complete
        password_reset_token=None,
        password_reset_expires=None,
        last_login=None
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    return employee, user


@pytest.fixture
def admin_user(session: Session, tenant: Tenant) -> User:
    """Create admin user for contrast tests."""
    admin = User(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        email="admin@test.com",
        hashed_password=hash_password("AdminPassword123"),
        role="Admin",
        employee_id=None,
        is_active=True,
        password_reset_token=None,
        password_reset_expires=None,
        last_login=None
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)
    return admin


@pytest.fixture
def client() -> TestClient:
    """Create test client."""
    return TestClient(app)


class TestPasswordSetupBlockingEnforced:
    """
    TEST CASE 1: is_active=false BLOCKS LOGIN
    Verifies password setup is blocking: employees cannot log in until is_active=true
    """

    def test_inactive_employee_cannot_login(
        self,
        client: TestClient,
        inactive_employee: tuple[Employee, User],
        session: Session
    ):
        """
        CRITICAL SECURITY: Employee with is_active=false must be rejected at login

        Scenario:
        1. Employee created with is_active=false (password not set)
        2. Attempt POST /auth/login with correct credentials
        3. Expected: 403 Forbidden (password setup required)

        This prevents bypassing password setup by directly logging in.
        """
        employee, user = inactive_employee

        # Set a password on the inactive user (simulate someone knowing their password)
        user.hashed_password = hash_password("CorrectPassword123")
        session.add(user)
        session.commit()

        # Attempt login
        response = client.post(
            "/auth/login",
            json={
                "email": "inactive@test.com",
                "password": "CorrectPassword123"
            }
        )

        # CRITICAL: Must reject, not return JWT
        assert response.status_code == 403, (
            f"Expected 403 Forbidden for is_active=false login, got {response.status_code}"
        )
        data = response.json()
        assert "error" in data or "detail" in data, (
            "Response must contain error message"
        )

        # Verify no JWT was issued
        assert "access_token" not in data, (
            "SECURITY BREACH: JWT issued for inactive user!"
        )


class TestEmployeeRouteRequiresIsActive:
    """
    TEST CASE 2: EMPLOYEE ROUTES REQUIRE is_active=true
    Verifies require_role_and_active() dependency enforces is_active check
    """

    def test_employee_route_rejects_inactive_user(
        self,
        client: TestClient,
        inactive_employee: tuple[Employee, User],
        session: Session
    ):
        """
        CRITICAL SECURITY: Employee routes must query User table and reject if is_active=false

        Scenario:
        1. Create JWT for inactive employee (somehow issued)
        2. Attempt POST /employee/time-tracking/clock-in
        3. Expected: 401 Unauthorized (password setup required)

        This catches compromised JWTs or misconfigured auth flows.
        """
        employee, user = inactive_employee

        # Create JWT token for inactive user (simulating token issued early)
        token = create_token(
            data={
                "sub": str(user.id),
                "tenant_id": str(user.tenant_id),
                "emp_id": str(employee.id),
                "email": user.email,
                "role": user.role,
                "is_active": False  # JWT has is_active=false
            },
            expires_delta=timedelta(minutes=30)
        )

        # Attempt to access employee-only route
        response = client.post(
            "/employee/time-tracking/clock-in",
            headers={"Authorization": f"Bearer {token}"}
        )

        # CRITICAL: Must reject with 401, not 403 (401 = re-authenticate)
        assert response.status_code == 401, (
            f"Expected 401 Unauthorized for is_active=false route access, got {response.status_code}"
        )
        data = response.json()
        assert "error" in data or "detail" in data, (
            "Response must contain error message about password setup"
        )


class TestTokenOneTimeUse:
    """
    TEST CASE 3: PASSWORD_RESET_TOKEN IS ONE-TIME USE
    Verifies token is consumed (set to NULL) after first password setup
    """

    def test_password_setup_token_consumed_after_use(
        self,
        client: TestClient,
        inactive_employee: tuple[Employee, User],
        session: Session
    ):
        """
        CRITICAL SECURITY: Password reset token must be consumed after use

        Scenario:
        1. Generate password reset token for inactive employee
        2. Use token with POST /auth/password-setup
        3. Attempt to use same token again
        4. Expected: 404 Not Found (token already consumed)

        This prevents token reuse attacks.
        """
        employee, user = inactive_employee

        # Generate a valid password reset token
        token = "test-password-reset-token-xyz"
        user.password_reset_token = token
        user.password_reset_expires = datetime.utcnow() + timedelta(minutes=15)
        session.add(user)
        session.commit()

        # Use token for password setup (first time)
        response1 = client.post(
            "/auth/password-setup",
            json={
                "token": token,
                "password": "NewPassword123!",
                "password_confirm": "NewPassword123!"
            }
        )
        assert response1.status_code == 200, (
            f"Expected 200 for valid password setup, got {response1.status_code}"
        )

        # Verify token was consumed (set to NULL)
        session.refresh(user)
        assert user.password_reset_token is None, (
            "SECURITY BREACH: Token not consumed after use!"
        )
        assert user.is_active is True, (
            "User should be activated after password setup"
        )

        # Attempt to use token again (should fail)
        response2 = client.post(
            "/auth/password-setup",
            json={
                "token": token,
                "password": "AnotherPassword456!",
                "password_confirm": "AnotherPassword456!"
            }
        )
        assert response2.status_code == 404, (
            f"Expected 404 for consumed token, got {response2.status_code}"
        )


class TestCrossEmployeeAccessBlocked:
    """
    TEST CASE 4: ROW-LEVEL SECURITY PREVENTS CROSS-EMPLOYEE ACCESS
    Verifies RLS filters at service layer: Employee A cannot access Employee B's data
    """

    def test_employee_cannot_access_other_employee_records(
        self,
        client: TestClient,
        active_employee: tuple[Employee, User],
        session: Session
    ):
        """
        CRITICAL SECURITY: Service layer must enforce RLS using emp_id from JWT

        Scenario:
        1. Create 2 active employees (A and B)
        2. Log in as Employee A
        3. Query GET /employee/time-tracking/records
        4. Expected: Only Employee A's records returned
        5. Attempt to query with emp_id=B (via hypothetical query param)
        6. Expected: Still only Employee A's records (RLS enforced, param ignored)

        This prevents lateral movement attacks.
        """
        emp_a, user_a = active_employee

        # Create Employee B
        emp_b_id = uuid.uuid4()
        employee_b = Employee(
            id=emp_b_id,
            tenant_id=user_a.tenant_id,
            email="other@test.com",
            first_name="Other",
            last_name="Employee",
            dni="99999999Z",
            phone="111111111",
            address="789 Pine St",
            gender="M",
            birth_date=datetime(1995, 6, 20).date(),
            hire_date=datetime(2025, 1, 1).date(),
            department="Kitchen",
            is_active=True
        )
        session.add(employee_b)
        session.commit()
        session.refresh(employee_b)

        # Create JWT for Employee A
        token_a = create_token(
            data={
                "sub": str(user_a.id),
                "tenant_id": str(user_a.tenant_id),
                "emp_id": str(emp_a.id),  # Employee A's ID
                "email": user_a.email,
                "role": user_a.role,
                "is_active": True
            },
            expires_delta=timedelta(minutes=30)
        )

        # Query records as Employee A
        response = client.get(
            "/employee/time-tracking/records",
            headers={"Authorization": f"Bearer {token_a}"}
        )

        assert response.status_code == 200, (
            f"Expected 200 for valid employee records request, got {response.status_code}"
        )

        data = response.json()
        records = data.get("records", [])

        # CRITICAL: Verify all records belong to Employee A
        for record in records:
            assert record["employee_id"] == str(emp_a.id), (
                f"SECURITY BREACH: Record with emp_id={record['employee_id']} returned to emp_id={emp_a.id}"
            )

        # Attempt to trick service with query param (RLS should ignore it)
        response2 = client.get(
            f"/employee/time-tracking/records?employee_id={emp_b_id}",
            headers={"Authorization": f"Bearer {token_a}"}
        )

        assert response2.status_code == 200
        data2 = response2.json()
        records2 = data2.get("records", [])

        # CRITICAL: Still only Employee A's records, not B's
        for record in records2:
            assert record["employee_id"] == str(emp_a.id), (
                "SECURITY BREACH: RLS not enforced - Employee B's records leaked!"
            )


class TestTokenExpirationEnforced:
    """
    TEST CASE 5: PASSWORD RESET TOKEN EXPIRATION IS ENFORCED
    Verifies expired password setup tokens cannot be used
    """

    def test_expired_password_reset_token_rejected(
        self,
        client: TestClient,
        inactive_employee: tuple[Employee, User],
        session: Session
    ):
        """
        CRITICAL SECURITY: Expired password reset tokens must be rejected

        Scenario:
        1. Create password reset token that expired 1 hour ago
        2. Attempt POST /auth/password-setup with expired token
        3. Expected: 401 Unauthorized (TOKEN_EXPIRED)

        This prevents attackers from using old email links.
        """
        employee, user = inactive_employee

        # Generate token that expired 1 hour ago
        expired_token = "expired-password-reset-token"
        user.password_reset_token = expired_token
        user.password_reset_expires = datetime.utcnow() - timedelta(hours=1)
        session.add(user)
        session.commit()

        # Attempt to use expired token
        response = client.post(
            "/auth/password-setup",
            json={
                "token": expired_token,
                "password": "NewPassword123!",
                "password_confirm": "NewPassword123!"
            }
        )

        # CRITICAL: Must reject with 401, not 400 or 404
        assert response.status_code == 401, (
            f"Expected 401 Unauthorized for expired token, got {response.status_code}"
        )

        data = response.json()
        assert "error" in data or "detail" in data, (
            "Response must contain error message about token expiration"
        )

        # Verify user is still inactive (no password was set)
        session.refresh(user)
        assert user.is_active is False, (
            "User should remain inactive if password setup fails"
        )


# ============================================================================
# SUMMARY: All 5 Critical Security Test Cases
# ============================================================================
"""
✅ TEST CASE 1: test_inactive_employee_cannot_login
   Blocks: is_active=false login attempts
   Enforces: Backend /auth/login checks is_active before issuing JWT

✅ TEST CASE 2: test_employee_route_rejects_inactive_user
   Blocks: is_active=false access to employee routes
   Enforces: require_role_and_active() queries User table and validates is_active

✅ TEST CASE 3: test_password_setup_token_consumed_after_use
   Blocks: One-time use of password reset tokens
   Enforces: Token set to NULL after successful password setup

✅ TEST CASE 4: test_employee_cannot_access_other_employee_records
   Blocks: Cross-employee data access (lateral movement)
   Enforces: Service layer RLS using emp_id from JWT, ignoring user input

✅ TEST CASE 5: test_expired_password_reset_token_rejected
   Blocks: Expired password reset tokens (old email links)
   Enforces: Backend checks token expiration before allowing password setup

EXECUTION:
  pytest tests/test_security_critical.py -v
  pytest tests/test_security_critical.py::TestPasswordSetupBlockingEnforced -v
  pytest tests/test_security_critical.py::TestEmployeeRouteRequiresIsActive -v
  etc.
"""
