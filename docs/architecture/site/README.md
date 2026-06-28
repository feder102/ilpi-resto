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

## Despliegue oculto en `/docum`

El sitio debe servirse bajo el subpath `/docum` del dominio
(`ilpi.tudominio.com/docum`). Pasos típicos:

1. **Base path de Vite** — configurar `base: '/docum/'` en `vite.config.ts` para que
   los assets se resuelvan bajo ese subpath.
2. **Build**: `npm run build` → genera `dist/`.
3. **Reverse proxy** (este repo ya usa Caddy/Nginx). Publicar `dist/` bajo `/docum`.
   Ejemplo con Caddy:

   ```caddy
   handle_path /docum/* {
       root * /srv/ilpi-docum/dist
       try_files {path} /index.html
       file_server
   }
   ```

   Ejemplo con Nginx:

   ```nginx
   location /docum/ {
       alias /srv/ilpi-docum/dist/;
       try_files $uri $uri/ /docum/index.html;
   }
   ```

4. **Ocultar** (opcional): restringir por IP, basic-auth o no enlazarlo desde la app
   principal para que quede "oculto".

## Mantenimiento

Cuando cambie el código fuente, actualizar primero los markdown en
`docs/architecture/{db,frontend,backend}/README.md` y luego reflejar los cambios
relevantes en `data.ts` (son la fuente de verdad del sitio).
