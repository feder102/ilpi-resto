# Quickstart: ABM de Departamentos

**Feature**: `014-department-abm`
**Audience**: developer que va a implementar o validar la feature end-to-end.

---

## 1. Aplicar migración

```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

Verificación:

```bash
psql -U ilpi -d ilpi -c "SELECT name, is_system FROM departments ORDER BY is_system DESC, name;"
```

Resultado esperado por tenant existente:

```
        name         | is_system
---------------------+-----------
 Sin asignar         | t
 Atención al Público | f
 Barra               | f
 Cocina              | f
 Dirección           | f
```

Y la tabla `employees` ya no debe tener la columna `department` string:

```bash
psql -U ilpi -d ilpi -c "\d employees" | grep -i department
# debe mostrar solo: department_id | uuid
```

---

## 2. Smoke backend (curl)

Pre-requisito: backend corriendo (`uvicorn app.main:app --reload`) y un token JWT de Admin.

```bash
TOKEN_ADMIN="..."   # JWT del admin del seed

# 2.1 listar
curl -s -H "Authorization: Bearer $TOKEN_ADMIN" \
     http://localhost:8000/api/v1/departments | jq .

# 2.2 crear
NEW_DEPT=$(curl -s -X POST -H "Authorization: Bearer $TOKEN_ADMIN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Lavadero","color":"#06b6d4","icon":"Sparkles"}' \
     http://localhost:8000/api/v1/departments)
echo $NEW_DEPT | jq .
DEPT_ID=$(echo $NEW_DEPT | jq -r .id)

# 2.3 editar
curl -s -X PUT -H "Authorization: Bearer $TOKEN_ADMIN" \
     -H "Content-Type: application/json" \
     -d '{"description":"Vajilla y utensilios"}' \
     http://localhost:8000/api/v1/departments/$DEPT_ID | jq .

# 2.4 preview de borrado (depto vacío todavía)
curl -s -H "Authorization: Bearer $TOKEN_ADMIN" \
     http://localhost:8000/api/v1/departments/$DEPT_ID/delete-preview | jq .
# → employees_to_reassign: 0, teams_to_reassign: 0

# 2.5 asignar dos empleados al nuevo depto
# (usar IDs reales del seed)
EMP_ID=$(curl -s -H "Authorization: Bearer $TOKEN_ADMIN" \
     http://localhost:8000/api/v1/employees | jq -r '.items[0].id')
curl -s -X PUT -H "Authorization: Bearer $TOKEN_ADMIN" \
     -H "Content-Type: application/json" \
     -d "{\"department_id\":\"$DEPT_ID\"}" \
     http://localhost:8000/api/v1/employees/$EMP_ID | jq '.department'

# 2.6 preview otra vez
curl -s -H "Authorization: Bearer $TOKEN_ADMIN" \
     http://localhost:8000/api/v1/departments/$DEPT_ID/delete-preview | jq .
# → employees_to_reassign: 1

# 2.7 borrar
curl -s -X DELETE -H "Authorization: Bearer $TOKEN_ADMIN" \
     http://localhost:8000/api/v1/departments/$DEPT_ID | jq .
# → { id, employees_reassigned: 1, teams_reassigned: 0, target_department: {...} }

# 2.8 verificar reasignación
curl -s -H "Authorization: Bearer $TOKEN_ADMIN" \
     http://localhost:8000/api/v1/employees/$EMP_ID | jq '.department.name'
# → "Sin asignar"
```

### Casos negativos

```bash
# 2.9 intentar borrar Sin asignar
SYSTEM_ID=$(curl -s -H "Authorization: Bearer $TOKEN_ADMIN" \
     http://localhost:8000/api/v1/departments | jq -r '.items[] | select(.is_system==true) | .id')
curl -i -X DELETE -H "Authorization: Bearer $TOKEN_ADMIN" \
     http://localhost:8000/api/v1/departments/$SYSTEM_ID
# → 403 Forbidden, code: "department.system_protected"

# 2.10 intentar crear con nombre duplicado
curl -i -X POST -H "Authorization: Bearer $TOKEN_ADMIN" \
     -H "Content-Type: application/json" \
     -d '{"name":"cocina"}' \
     http://localhost:8000/api/v1/departments
# → 409 Conflict, code: "department.name_conflict"

# 2.11 moderador o empleado intentando crear
TOKEN_MOD="..."
curl -i -X POST -H "Authorization: Bearer $TOKEN_MOD" \
     -H "Content-Type: application/json" \
     -d '{"name":"Hack"}' \
     http://localhost:8000/api/v1/departments
# → 403 Forbidden
```

---

## 3. Smoke frontend (manual)

Pre-requisito: backend + frontend corriendo (`docker-compose up -d`).

1. **Login como Admin** (`admin@ilpi.com` / contraseña del seed).
2. Confirmá que aparece la entrada **"Departamentos"** en el sidebar (solo Admin).
3. Abrí la sección. Verificá:
   - 5 cards: `Sin asignar` (con badge **Sistema**), `Cocina`, `Atención al Público`, `Barra`, `Dirección`.
   - Botón **+ Nuevo departamento** visible.
   - Botones editar/eliminar deshabilitados en `Sin asignar`.
4. **Crear** un departamento "Delivery" con color y icono. Tras guardar:
   - Aparece en el listado.
   - Abrí la sección **Empleados** → al editar o crear, el dropdown ofrece "Delivery".
5. **Asignar** dos empleados a "Delivery".
6. Volvé a **Departamentos** → la card de Delivery muestra "2 empleados".
7. Click **Eliminar** en Delivery → modal:
   > "Se reasignarán **2 empleados** y **0 equipos** al departamento **'Sin asignar'**. Esta acción no se puede deshacer."
8. Confirmar → toast de éxito con resumen; Delivery desaparece del listado por defecto.
9. Activá el toggle **Mostrar inactivos** → Delivery reaparece con badge "Inactivo".
10. Andá a **Empleados** → los dos que estaban en Delivery ahora muestran **Sin asignar**.
11. **Logout** y login como Moderador → no debe aparecer "Departamentos" en el menú. Si forzás `/admin/departments` en la URL, redirige a 403/no autorizado.
12. Mantenete como Moderador → al abrir el filtro por departamento en la lista de empleados, ves todos los departamentos activos (lectura).

---

## 4. Gates de calidad

```bash
# Backend
cd backend
mypy app --strict          # zero errors
ruff check .               # zero errors
pytest -k department       # tests nuevos verdes
pytest                     # suite completa

# Frontend
cd frontend
npm run lint
npm run build
```

---

## 5. Rollback (en caso de necesidad)

```bash
cd backend
alembic downgrade -1
```

> ⚠️ Esto pierde color/icono/descripcion y cualquier departamento creado vía ABM (recupera solo el campo string original a partir del FK). Documentado en el docstring de la migración.

---

## 6. Endpoints clave (recap)

| Endpoint | Rol | Notas |
|---|---|---|
| `GET /api/v1/departments` | Cualquiera autenticado | Llena dropdowns |
| `GET /api/v1/departments/{id}` | Cualquiera autenticado | — |
| `POST /api/v1/departments` | Admin | 409 si duplicado |
| `PUT /api/v1/departments/{id}` | Admin | 403 si `is_system=true` |
| `GET /api/v1/departments/{id}/delete-preview` | Admin | Conteo para modal |
| `DELETE /api/v1/departments/{id}` | Admin | Reasigna + soft-delete |
