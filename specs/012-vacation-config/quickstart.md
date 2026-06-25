# Quickstart: Configuración de Días de Vacaciones

**Branch**: `012-vacation-config` | **Date**: 2026-06-25

---

## Setup rápido (local)

```bash
# 1. Clonar y entrar al repo
cd /home/user/ilpi-resto

# 2. Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head    # aplica la nueva migración (Tenant + Employee + AuditLog)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. Frontend (nueva terminal)
cd frontend
npm install
npm run dev
```

### Con Docker

```bash
docker-compose up -d
docker-compose logs -f backend   # seguir logs de migraciones
```

---

## Endpoints clave

| Endpoint | Roles | Uso |
|---|---|---|
| `GET /settings/vacations` | Admin, Mod | Ver default global |
| `PUT /settings/vacations` | Admin, Mod | Cambiar default global |
| `GET /settings/audit-log` | Admin | Historial de cambios |
| `PATCH /employees/{id}` | Admin, Mod | Override días empleado (`custom_vacation_days`) |
| `POST /employee/vacation-requests` | Empleado | Solicitar (valida 2m anticipación + año natural) |
| `POST /vacations` | Admin, Mod | Solicitar para empleado (solo valida año natural) |

---

## Smoke tests manuales rápidos

### 1. Cambiar default global
```bash
curl -X PUT http://localhost:8000/settings/vacations \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"default_vacation_days": 25}'
# Esperar: 200 {"default_vacation_days": 25}
```

### 2. Ver auditoría
```bash
curl http://localhost:8000/settings/audit-log \
  -H "Authorization: Bearer <admin_token>"
# Esperar: lista con la entrada del cambio anterior
```

### 3. Override por empleado
```bash
curl -X PATCH http://localhost:8000/employees/<uuid> \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"custom_vacation_days": 35}'
# Esperar: 200 con custom_vacation_days=35
```

### 4. Restricción de anticipación (empleado)
```bash
# Fecha < 2 meses → debe fallar
curl -X POST http://localhost:8000/employee/vacation-requests \
  -H "Authorization: Bearer <employee_token>" \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2026-07-15", "end_date": "2026-07-20"}'
# Esperar: 400 {"error": {"code": "ADVANCE_NOTICE_REQUIRED", ...}}

# Fecha ≥ 2 meses → debe crear
curl -X POST http://localhost:8000/employee/vacation-requests \
  -H "Authorization: Bearer <employee_token>" \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2026-08-25", "end_date": "2026-09-05"}'
# Esperar: 201
```

### 5. Validación de año natural
```bash
curl -X POST http://localhost:8000/vacations \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"employee_id": "<uuid>", "start_date": "2026-12-20", "end_date": "2027-01-05"}'
# Esperar: 400 (cruza 31 de diciembre)
```

---

## Tests automatizados

```bash
cd backend
pytest tests/ -v -k "vacation_config or audit_log or advance_notice"
mypy app --strict
ruff check .
```

```bash
cd frontend
npm run lint
npm run build
```

---

## Acceso UI

1. Login como Admin → `/settings` → sección "Configuración de Vacaciones".
2. Editar empleado → campo "Días de vacaciones personalizados".
3. Login como Empleado → intentar solicitar vacaciones con fecha próxima → ver mensaje de error.
