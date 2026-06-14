# Despliegue en un VPS (Hetzner) con Docker + Caddy

Stack en una sola máquina, todo bajo **un mismo dominio** con HTTPS automático:

```
Internet ──> Caddy (80/443, TLS auto)
               ├── /api/*  ──> backend (FastAPI/uvicorn)  ──> db (Postgres)
               └── /*      ──> frontend (SPA estática)
```

Al quedar front y back en el mismo origen **no hay problemas de CORS ni de cookies cross-site**.

---

## 1. Crear el servidor

- En Hetzner Cloud, creá un servidor **CX22** (2 vCPU / 4 GB) o incluso el más chico; con Ubuntu 24.04 alcanza de sobra.
- Anotá la IP pública.

## 2. Apuntar el dominio

En tu proveedor de DNS, creá un registro **A** de `ilpi.tudominio.com` (o el que uses) hacia la **IP del VPS**. (Opcional: registro `AAAA` para IPv6.)

> Caddy emite el certificado TLS solo si el dominio ya resuelve al servidor y los puertos 80/443 están abiertos.

## 3. Preparar el servidor

```bash
ssh root@TU_IP

# Docker + compose plugin
curl -fsSL https://get.docker.com | sh

# Firewall (si usás ufw)
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
```

## 4. Clonar y configurar

```bash
git clone https://github.com/feder102/ilpi-resto.git
cd ilpi-resto

cp .env.prod.example .env
nano .env          # poné DOMAIN, POSTGRES_PASSWORD y SECRET_KEY (openssl rand -hex 32)
```

## 5. Levantar

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

El backend corre `alembic upgrade head` solo al arrancar. Caddy obtiene el certificado HTTPS automáticamente la primera vez (puede tardar ~30s).

## 6. Crear el usuario admin (solo la primera vez)

```bash
docker compose -f docker-compose.prod.yml exec backend python -m app.seed
```

Esto crea el tenant **ILPI** y un admin `admin@ilpi.es` con contraseña por defecto.
**⚠️ Cambiá esa contraseña inmediatamente** desde la app (o la base) — son credenciales de ejemplo.

Listo: entrá a `https://ilpi.tudominio.com`.

---

## Operación

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f

# Actualizar a la última versión del repo
git pull
docker compose -f docker-compose.prod.yml up -d --build

# Backup de la base de datos
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U ilpi ilpi > backup_$(date +%F).sql

# Restore
cat backup_YYYY-MM-DD.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U ilpi -d ilpi
```

> **Backups:** programá el `pg_dump` con un cron del host (o un servicio de Hetzner) y guardá los dumps fuera del servidor.

---

## Notas

- **Variables**: el front se buildea con `VITE_API_URL=/api/v1` (relativo); no hace falta tocarlo. El back toma `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS` y `COOKIE_SECURE/SAMESITE` del compose/`.env`.
- **Escalado**: para más carga, primero **escalá vertical** (VPS más grande). El escalado horizontal (varias réplicas) requeriría externalizar el blacklist de tokens y el rate limiter a Redis y manejar el scheduler en una sola instancia.
- **Postgres administrado**: si preferís no operar la BD, podés borrar el servicio `db` del compose y apuntar `DATABASE_URL` a un Postgres externo (Neon/Supabase/Hetzner).
