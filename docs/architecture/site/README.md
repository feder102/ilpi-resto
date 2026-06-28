# Sitio de documentación (estilo template-documentacion)

Paso 4 del issue #30. Aquí está el contenido de los tres documentos de arquitectura
(`db`, `frontend`, `backend`) volcado al **modelo de contenido** del proyecto
[template-documentacion](https://github.com/feder102/template-documentacion), para
publicarse como un sitio separado y oculto en `DOMAIN=ilpi.tudominio.com/docum`.

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `types.ts` | Espejo de los tipos del template (`Category`, `DocArticle`, `DocSection`, `CategoryInfo`). |
| `data.ts` | Contenido consolidado: `CATEGORIES` (db/frontend/backend) + `INITIAL_ARTICLES` (9 artículos). |

El contenido respeta el estilo del template: categorías con icono/colores del tema
**Sunset**, y artículos con secciones de tipo `paragraph`, `code`, `list`, `info-box`
y `architecture-step`, incluyendo fragmentos de código y diagramas Mermaid.

## Cómo integrarlo en el proyecto separado

El sitio de documentación es un **proyecto aparte** (React 19 + Vite + Tailwind v4),
clonado del template. Para poblarlo con esta documentación:

```bash
# 1) Clonar el template como proyecto separado
git clone https://github.com/feder102/template-documentacion ilpi-docum
cd ilpi-docum

# 2) Reemplazar el contenido por el de ILPI
cp /ruta/a/ilpi-resto/docs/architecture/site/types.ts src/types.ts
cp /ruta/a/ilpi-resto/docs/architecture/site/data.ts  src/data.ts

# 3) Instalar y verificar
npm install
npm run dev
```

> `data.ts` importa los tipos desde `./types`, igual que el template. Si el template
> ya trae su propio `types.ts`, basta con copiar `data.ts` (las interfaces coinciden).

## Despliegue en `/docum` — acceso solo Admin (implementado)

El sitio se sirve bajo el subpath `/docum` del dominio
(`https://<tu-dominio>/docum`) y el acceso está **restringido al rol Admin** mediante
el JWT de la propia app. El gating ya está implementado en este repositorio:

- **Backend** (`backend/app/routers/docs_access.py`): endpoint
  `GET /api/v1/docum/authorize` que valida la cookie HttpOnly `refresh_token`
  (que lleva el rol) y exige `role=Admin` + `is_active`:
  - `204` → es Admin activo → se sirve la documentación.
  - `303` → no autenticado → redirige a `/login?next=/docum`.
  - `403` → autenticado pero no Admin → acceso denegado (sin bucle de login).
- **Caddy** (`Caddyfile`): bloque `handle_path /docum*` con `forward_auth` hacia ese
  endpoint; solo si responde 2xx sirve los estáticos.
- **Compose** (`docker-compose.prod.yml`): monta `./docum-dist` en `/srv/docum` (ro).

### Pasos para publicarlo

1. **Base path de Vite** — en el proyecto del template, configurar `base: '/docum/'`
   en `vite.config.ts` (los assets se resuelven bajo el subpath; Caddy hace
   `handle_path` y elimina el prefijo `/docum`).
2. **Build**: `npm run build` → genera `dist/`.
3. **Copiar** el `dist/` a `./docum-dist` en la raíz de este repo (en el servidor):
   ```bash
   cp -r ilpi-docum/dist/* /ruta/a/ilpi-resto/docum-dist/
   ```
4. **Levantar** el stack de producción:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

### Cómo ingresar

1. Iniciar sesión en la app con un usuario **Admin** (`https://<tu-dominio>/login`).
   Eso fija la cookie `refresh_token` (HttpOnly) en el dominio.
2. Navegar a **`https://<tu-dominio>/docum`**. Caddy consulta el endpoint de
   autorización; al ser Admin, sirve la documentación.

> Si no hay sesión (o el usuario no es Admin), `/docum` redirige a `/login` o
> responde 403. La cookie es del mismo dominio, por eso front, API y docs conviven
> sin problemas de CORS.

## Mantenimiento

Cuando cambie el código fuente, actualizar primero los markdown en
`docs/architecture/{db,frontend,backend}/README.md` y luego reflejar los cambios
relevantes en `data.ts` (son la fuente de verdad del sitio).
