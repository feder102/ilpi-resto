# 🚀 ILPI Ultra-Productive Dev Setup

Este es el setup **nivel SaaS** que elimina la fricción de desarrollo. Con cada cambio en el código, ves los resultados en **< 300ms**.

## 🎯 Qué Cambia vs Antes

| Antes | Ahora |
|-------|-------|
| 🐢 `docker-compose up` → rebuild todo (2-5 min) | ⚡ `make dev` → hot-reload inmediato |
| 🔗 `localhost:5173` + `localhost:8010` (CORS nightmare) | 🌐 Todo por `localhost/` (Nginx manages it) |
| 📦 Cambias package.json → tenías que rebuild | 📦 `make build` solo cuando instales libs nuevas |
| 🎛️ Variables de API en múltiples lugares | 🎛️ Una sola URL: `/api/v1` (relativa) |

---

## 📋 Requisitos

- Docker + Docker Compose instalados
- Bash/Zsh (Makefile usa comandos shell)
- 5 minutos para la primera instalación

---

## 🚀 Quickstart (Tu Nuevo Workflow)

### Primero: Prepara el entorno (UNA VEZ)

```bash
# 1. Copia los .env.example a .env
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Edita si necesitas (opcional, los defaults funcionan para dev)
nano .env
```

### Segundo: Arranca el stack

```bash
# Esto es TODO lo que necesitas
make dev
```

**Eso es.** Ahora:

- Backend escucha en `localhost:8000` (directo) y `localhost/api/v1` (vía Nginx)
- Frontend está en `localhost:5173` (directo) y `localhost/` (vía Nginx)
- Database en `postgres_dev_data` (volumen)
- Nginx en puerto `80`

### Tercero: Edita código y mira cambios

```bash
# Backend: edita /backend/app/main.py → uvicorn --reload ve el cambio en < 100ms
# Frontend: edita /frontend/src/App.tsx → Vite HMR re-compila en < 50ms
# Database: alembic migrations disponibles via make
```

---

## 🛠️ Comandos Útiles

```bash
# Ver todos los comandos disponibles
make help

# Detener todo
make down

# Ver logs en tiempo real
make logs

# Acceso a contenedores
make shell-backend    # bash en backend
make shell-frontend   # sh en frontend
make db-shell         # psql en database

# Tests & Quality
make test-backend
make lint-backend
make typecheck-backend
make lint-frontend
```

---

## 🔄 Cuando Instalas Librerías Nuevas

### Backend (Python)

```bash
# 1. Edita backend/requirements.txt o usa pip inside container
docker exec ilpi-backend-dev pip install <package>

# 2. Luego, si quieres persistir (recomendado):
make down
make build  # Reconstruye con el nuevo requirements.txt
make dev
```

### Frontend (Node)

```bash
# 1. Edita frontend/package.json o usa npm inside container
docker exec ilpi-frontend-dev npm install <package>

# 2. Si es la primera vez, deja recompilarse (HMR lo maneja)
# 3. Si necesitas clean install:
make down
make build
make dev
```

---

## 📊 Arquitectura del Setup

```
┌─────────────────────────────────────────┐
│  Tu Navegador (localhost)               │
└─────────────────────────────────────────┘
                    │
        ┌───────────▼───────────┐
        │  Nginx (Gateway)      │  ← Puerto 80
        │  ├─ /api/* → Backend  │
        │  └─ /* → Frontend     │
        └──────┬────────┬───────┘
               │        │
    ┌──────────▼─┐   ┌──▼──────────┐
    │  Backend   │   │   Frontend  │
    │  :8000     │   │   :5173     │
    │ (uvicorn   │   │  (Vite HMR) │
    │  --reload) │   │             │
    └──────┬─────┘   └─────────────┘
           │
    ┌──────▼──────┐
    │  PostgreSQL │
    │  :5432      │
    │  (volume)   │
    └─────────────┘
```

---

## 🎯 Flujo Diario (Con Makefile)

**Mañana**:
```bash
make dev
# Una terminal, nada más. Ves todos los logs en tiempo real.
```

**Programas toda la mañana**:
- Backend changes → Se recargan automáticamente
- Frontend changes → HMR en < 50ms
- New libs? `make build` (1-2 min) y listo

**Tarde**:
```bash
make down
# Esperas a que terminen los containers. FIN.
```

---

## 🔐 Variables de Entorno (Dev)

### Backend (.env)
```env
DATABASE_URL=postgresql://ilpi:ilpi_dev_password@db:5432/ilpi
SECRET_KEY=dev-secret-key-change-in-production-min32chars
CORS_ORIGINS=http://localhost
LOG_LEVEL=DEBUG
```

### Frontend (.env)
```env
VITE_API_URL=/api/v1
```

**Nota**: En Nginx, todas las requests a `/api/v1` se rutean al backend automáticamente. No hay configuración de CORS complicada.

---

## 🐛 Troubleshooting

### "Port 80 is already in use"
```bash
# Encuentra qué está usando el puerto
lsof -i :80  # macOS/Linux
netstat -ano | findstr :80  # Windows

# O cámbia el puerto en docker-compose.dev.yml:
# ports:
#   - "8080:80"  # Accede a localhost:8080 en lugar de 80
```

### "Backend/Frontend no se ve actualizado"
```bash
# Revisa los logs
make logs

# Si es backend, probablemente --reload no catcheó el cambio:
make shell-backend
# Reinicia el proceso manualmente si es necesario
```

### "node_modules corrupted"
```bash
# El magic volume a veces falla en Windows. Solución:
make down
# Borra manualmente: del frontend\node_modules
make build
make dev
```

### "Database locked"
```bash
# Alguien dejó una conexión abierta
make db-shell
# Dentro de psql: SELECT * FROM pg_stat_activity;
# O limpia todo:
make db-clean  # ⚠️ DELETES ALL DATA
```

---

## 📈 Próximos Pasos (No Hoy)

- [ ] Multi-stage Dockerfile para Prod (con static build del frontend)
- [ ] GitHub Actions para CI/CD
- [ ] Let's Encrypt para HTTPS local (mkcert)
- [ ] S3/MinIO para uploads

---

## 🎓 Key Insights (Por Qué Este Setup Es Pro)

1. **Volúmenes Bidireccionales**: Tu código local + container comparten files. Cambios locales = cambios en el container.
2. **Magic Node Modules Volume**: `/app/node_modules` es anónimo (no bindeado). Previene conflictos Windows (CRLF) vs Linux (LF).
3. **Healthchecks**: El backend espera a que PostgreSQL esté listo antes de arrancar.
4. **Reverse Proxy Nginx**: Ruteo automático sin reconfigurar URLs según el entorno.
5. **HMR + Reload Watchers**: Vite (< 50ms) + uvicorn --reload (< 100ms).

---

**Disfruta del desarrollo sin fricciones. Somos 10x más productivos. 🚀**
