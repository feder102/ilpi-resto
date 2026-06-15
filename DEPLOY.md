# Despliegue

Dos opciones soportadas:

- **A. Railway** (front + back + Postgres administrado) — más simple, sin operar servidor.
- **B. VPS (Hetzner) con Docker + Caddy** — todo en una máquina, un dominio, más barato.

---

## A. Railway

Railway corre **contenedores persistentes** (no serverless): el código corre tal cual, el scheduler funciona y no hay cold starts de funciones. Se crean **3 servicios** en un mismo proyecto: Postgres, backend y frontend.

El repo ya trae la config necesaria:
- `backend/railway.json` → build con Dockerfile, migra (`alembic upgrade head`) y arranca uvicorn en `$PORT`, healthcheck en `/health`.
- `frontend/railway.json` → build con Dockerfile (stage `production`) y sirve la SPA en `$PORT`.

### Orden de despliegue (importante)

El front necesita la URL del back **en build**, y el back necesita la URL del front **para CORS**. Por eso el orden es:

**1) Postgres**
- New → **Database → PostgreSQL**. Railway crea la variable `DATABASE_URL`.

**2) Backend**
- New → **GitHub Repo** → elegí este repo.
- Settings → **Root Directory = `backend`** (detecta `railway.json`).
- Variables:
  | Variable | Valor |
  |---|---|
  | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referencia al servicio Postgres) |
  | `SECRET_KEY` | una cadena random ≥32 (`openssl rand -hex 32`) |
  | `COOKIE_SECURE` | `true` |
  | `COOKIE_SAMESITE` | `none` |
  | `CORS_ORIGINS` | (lo completás en el paso 4) |
- Settings → Networking → **Generate Domain**. Anotá la URL, p. ej. `https://ilpi-back.up.railway.app`.

**3) Frontend**
- New → **GitHub Repo** → mismo repo.
- Settings → **Root Directory = `frontend`**.
- Variable (se hornea en build, debe estar **antes** de buildear):
  | Variable | Valor |
  |---|---|
  | `VITE_API_URL` | `https://ilpi-back.up.railway.app/api/v1` (la URL del back del paso 2) |
- Generate Domain. Anotá la URL, p. ej. `https://ilpi-front.up.railway.app`.

**4) Cerrar el círculo (CORS)**
- Volvé al **backend** → variable `CORS_ORIGINS = https://ilpi-front.up.railway.app` → Redeploy.

**5) Crear el admin (una sola vez)**
- En el servicio backend, abrí una terminal/`Run command` y ejecutá:
  ```bash
  python -m app.seed
  ```
- Crea el tenant ILPI y `admin@ilpi.es` con contraseña de ejemplo → **cambiala enseguida**.

Entrá al dominio del frontend y listo.

### ⚠️ Sobre la cookie cross-domain (leer)

Con los dominios `*.up.railway.app`, el front y el back son **sitios distintos** (cross-site). El **login funciona** (el access token viaja en el body), pero la cookie de `refresh_token` queda como *third-party* y algunos navegadores (Safari, y Chrome con el bloqueo de cookies de terceros) **pueden bloquearla** → al expirar el token (30 min) te pediría re-login.

**Solución recomendada:** usá un **dominio propio con subdominios** del mismo dominio raíz:
- frontend → `app.tudominio.com`
- backend → `api.tudominio.com`

Al ser el mismo dominio registrable, son **same-site**. Entonces poné en el backend `COOKIE_SAMESITE=lax` (y `COOKIE_SECURE=true`), actualizá `VITE_API_URL=https://api.tudominio.com/api/v1` y `CORS_ORIGINS=https://app.tudominio.com`. Así el refresh anda sin depender del bloqueo de cookies de terceros.

### Notas
- Si cambiás la URL del backend, **rebuildeá el frontend** (la URL se hornea en build).
- Las migraciones corren solas en cada deploy del backend (`alembic upgrade head`).

---

## B. VPS (Hetzner) con Docker + Caddy

Stack en una sola máquina, todo bajo **un mismo dominio** con HTTPS automático:

```
Internet ──> Caddy (80/443, TLS auto)
               ├── /api/*  ──> backend (FastAPI/uvicorn)  ──> db (Postgres)
               └── /*      ──> frontend (SPA estática)
```

Al quedar front y back en el mismo origen **no hay problemas de CORS ni de cookies cross-site**.

### 1. Crear el servidor
- Hetzner Cloud → servidor **CX22** (o el más chico), Ubuntu 24.04. Anotá la IP.

### 2. Apuntar el dominio
- Registro **A** de `ilpi.tudominio.com` → IP del VPS. (Caddy emite el cert solo si ya resuelve y 80/443 están abiertos.)

### 3. Preparar el servidor
```bash
ssh root@TU_IP
curl -fsSL https://get.docker.com | sh
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
```

### 4. Clonar y configurar
```bash
git clone https://github.com/feder102/ilpi-resto.git
cd ilpi-resto
cp .env.prod.example .env
nano .env          # DOMAIN, POSTGRES_PASSWORD, SECRET_KEY (openssl rand -hex 32)
```

### 5. Levantar
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 6. Crear el usuario admin (una sola vez)
```bash
docker compose -f docker-compose.prod.yml exec backend python -m app.seed
```
**⚠️ Cambiá la contraseña por defecto enseguida.**

### Operación
```bash
docker compose -f docker-compose.prod.yml logs -f          # logs
git pull && docker compose -f docker-compose.prod.yml up -d --build   # actualizar
docker compose -f docker-compose.prod.yml exec db pg_dump -U ilpi ilpi > backup_$(date +%F).sql  # backup
```

---

## Escalado (ambas opciones)
- **Vertical** (instancia más grande): trivial y suficiente para este volumen por mucho tiempo.
- **Horizontal** (varias réplicas): requeriría mover el blacklist de tokens y el rate limiter (hoy en memoria) a **Redis** y correr el scheduler en una sola instancia.
