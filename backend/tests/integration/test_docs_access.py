"""Integration tests for the admin-only documentation access gate (issue #30)."""

from app.common.security import create_refresh_token


def _refresh_cookie(user, tenant_id, role: str) -> str:
    return create_refresh_token(
        {
            "sub": str(user.id),
            "tenant_id": str(tenant_id),
            "role": role,
            "employee_id": None,
        }
    )


def test_admin_can_access_docs(client, admin_user, test_tenant):
    token = _refresh_cookie(admin_user, test_tenant.id, "Admin")
    client.cookies.set("refresh_token", token)
    resp = client.get("/api/v1/docum/authorize", follow_redirects=False)
    assert resp.status_code == 204


def test_employee_is_forbidden(client, emp_user, test_tenant):
    token = _refresh_cookie(emp_user, test_tenant.id, "Empleado")
    client.cookies.set("refresh_token", token)
    resp = client.get("/api/v1/docum/authorize", follow_redirects=False)
    assert resp.status_code == 403


def test_moderator_is_forbidden(client, mod_user, test_tenant):
    token = _refresh_cookie(mod_user, test_tenant.id, "Moderador")
    client.cookies.set("refresh_token", token)
    resp = client.get("/api/v1/docum/authorize", follow_redirects=False)
    assert resp.status_code == 403


def test_anonymous_is_redirected_to_login(client):
    resp = client.get("/api/v1/docum/authorize", follow_redirects=False)
    assert resp.status_code == 303
    assert resp.headers["location"] == "/login?next=/docum"


def test_invalid_cookie_is_redirected_to_login(client):
    client.cookies.set("refresh_token", "not-a-valid-jwt")
    resp = client.get("/api/v1/docum/authorize", follow_redirects=False)
    assert resp.status_code == 303
    assert resp.headers["location"] == "/login?next=/docum"
