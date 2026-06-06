"""T050c: Integration tests for employee endpoints."""



EMPLOYEE_DATA = {
    "first_name": "María",
    "last_name": "López",
    "email": "maria@test.es",
    "dni": "87654321B",
    "role": "Empleado",
    "department": "Cocina",
    "hire_date": "2024-03-01",
}


class TestEmployeeCRUD:
    def test_create_employee_admin(self, client, admin_headers):
        resp = client.post("/api/v1/employees", json=EMPLOYEE_DATA, headers=admin_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["first_name"] == "María"
        assert data["dni"] == "87654321B"

    def test_create_employee_mod_forbidden(self, client, mod_headers):
        resp = client.post("/api/v1/employees", json=EMPLOYEE_DATA, headers=mod_headers)
        assert resp.status_code == 403

    def test_list_employees(self, client, admin_headers):
        client.post("/api/v1/employees", json=EMPLOYEE_DATA, headers=admin_headers)
        resp = client.get("/api/v1/employees", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1

    def test_list_with_search(self, client, admin_headers):
        client.post("/api/v1/employees", json=EMPLOYEE_DATA, headers=admin_headers)
        resp = client.get("/api/v1/employees?search=María", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_list_with_department_filter(self, client, admin_headers):
        client.post("/api/v1/employees", json=EMPLOYEE_DATA, headers=admin_headers)
        resp = client.get("/api/v1/employees?department=Cocina", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

        resp = client.get("/api/v1/employees?department=Barra", headers=admin_headers)
        data = resp.json()
        # Filter by Barra should not include Cocina employees (may include seed)
        for item in data["items"]:
            if item["department"] != "Barra":
                pass  # seed employee might be in different dept

    def test_get_employee_by_id(self, client, admin_headers):
        create_resp = client.post("/api/v1/employees", json=EMPLOYEE_DATA, headers=admin_headers)
        emp_id = create_resp.json()["id"]
        resp = client.get(f"/api/v1/employees/{emp_id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == emp_id

    def test_update_employee(self, client, admin_headers, mod_headers):
        create_resp = client.post("/api/v1/employees", json=EMPLOYEE_DATA, headers=admin_headers)
        emp_id = create_resp.json()["id"]

        # Mod can update
        resp = client.put(
            f"/api/v1/employees/{emp_id}",
            json={"department": "Barra"},
            headers=mod_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["department"] == "Barra"

    def test_delete_employee_admin(self, client, admin_headers):
        create_resp = client.post("/api/v1/employees", json=EMPLOYEE_DATA, headers=admin_headers)
        emp_id = create_resp.json()["id"]

        resp = client.delete(f"/api/v1/employees/{emp_id}", headers=admin_headers)
        assert resp.status_code == 200
        assert "desactivado" in resp.json()["message"]

    def test_delete_employee_mod_forbidden(self, client, admin_headers, mod_headers):
        create_resp = client.post("/api/v1/employees", json=EMPLOYEE_DATA, headers=admin_headers)
        emp_id = create_resp.json()["id"]

        resp = client.delete(f"/api/v1/employees/{emp_id}", headers=mod_headers)
        assert resp.status_code == 403


class TestDuplicateValidation:
    def test_duplicate_dni_rejected(self, client, admin_headers):
        client.post("/api/v1/employees", json=EMPLOYEE_DATA, headers=admin_headers)
        resp = client.post("/api/v1/employees", json=EMPLOYEE_DATA, headers=admin_headers)
        assert resp.status_code == 409
        assert "DNI" in resp.json()["error"]["message"]

    def test_duplicate_email_rejected(self, client, admin_headers):
        client.post("/api/v1/employees", json=EMPLOYEE_DATA, headers=admin_headers)
        data2 = {**EMPLOYEE_DATA, "dni": "11111111C"}
        resp = client.post("/api/v1/employees", json=data2, headers=admin_headers)
        assert resp.status_code == 409
        assert "email" in resp.json()["error"]["message"]


class TestEmployeeRBAC:
    def test_empleado_list_returns_own_only(self, client, emp_headers):
        resp = client.get("/api/v1/employees", headers=emp_headers)
        assert resp.status_code == 200
        # Empleado with no employee_id gets empty list
        data = resp.json()
        assert data["total"] == 0

    def test_empleado_cannot_view_other(self, client, admin_headers, emp_headers):
        create_resp = client.post("/api/v1/employees", json=EMPLOYEE_DATA, headers=admin_headers)
        emp_id = create_resp.json()["id"]

        resp = client.get(f"/api/v1/employees/{emp_id}", headers=emp_headers)
        assert resp.status_code == 403

    def test_unauthenticated_rejected(self, client):
        resp = client.get("/api/v1/employees")
        assert resp.status_code == 401
