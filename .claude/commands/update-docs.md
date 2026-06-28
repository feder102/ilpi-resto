---
description: Actualiza docs/architecture/ para reflejar los últimos cambios en backend, frontend o base de datos
---

## Entrada del usuario

```text
$ARGUMENTS
```

Si `$ARGUMENTS` no está vacío puede ser: una rama base (`main`, `develop`), un SHA de commit, o una descripción libre de qué cambió. Tenlo en cuenta al hacer el diff.

## Tarea

Analiza los cambios recientes en el código y actualiza la documentación de arquitectura en `docs/architecture/` para que refleje fielmente el estado actual del proyecto.

### Paso 1 — Detectar qué cambió

Ejecuta los siguientes comandos para identificar los archivos modificados respecto a la rama base (usa `main` si `$ARGUMENTS` no especifica otra):

```bash
# Cambios no commiteados (trabajo en curso)
git diff --name-only HEAD

# Cambios commiteados en la rama actual vs. main
git diff --name-only main...HEAD
```

Combina ambas listas y elimina duplicados.

### Paso 2 — Clasificar los cambios

Agrupa los archivos por categoría de documentación:

| Si el archivo modificado está en…                        | Actualizar…                                |
|----------------------------------------------------------|--------------------------------------------|
| `backend/alembic/versions/`                              | `docs/architecture/db/README.md`           |
| `backend/app/models/`                                    | `docs/architecture/db/README.md`           |
| `backend/app/routers/`, `backend/app/services/`, `backend/app/schemas/` | `docs/architecture/backend/README.md` |
| `frontend/src/`                                          | `docs/architecture/frontend/README.md`     |

Si no hay cambios en ninguna de estas rutas, reporta que la documentación ya está sincronizada y detente.

### Paso 3 — Leer los archivos modificados

Lee cada archivo modificado relevante para entender exactamente qué se agregó, cambió o eliminó:
- Nuevos endpoints o servicios en el backend
- Nuevas tablas, columnas, enums o migraciones
- Nuevas vistas, hooks, componentes o rutas en el frontend

### Paso 4 — Actualizar los README de arquitectura

Para cada categoría con cambios, abre el README correspondiente y actualiza las secciones relevantes:

**`docs/architecture/db/README.md`**
- Agregar nueva tabla al ERD Mermaid y a la tabla de entidades
- Documentar nuevas columnas con tipo, constraints y descripción
- Agregar la nueva migración a la tabla del historial de Alembic
- Actualizar enums si se agregaron nuevos valores

**`docs/architecture/backend/README.md`**
- Agregar nuevos endpoints al catálogo del router correspondiente (método, ruta, rol, descripción)
- Documentar el nuevo servicio con sus reglas de negocio
- Agregar diagrama de secuencia Mermaid si el flujo es no trivial
- Actualizar la matriz RBAC si cambiaron los permisos

**`docs/architecture/frontend/README.md`**
- Agregar nuevas rutas a la tabla de rutas del portal correspondiente
- Documentar nuevos hooks o componentes reutilizables
- Actualizar la tabla de NAV_ITEMS si se agregó una entrada al sidebar

### Paso 5 — Actualizar `docs/architecture/site/data.ts`

Abre `docs/architecture/site/data.ts` y actualiza el artículo de la categoría correspondiente en `INITIAL_ARTICLES`:
- Agregar una nueva `DocSection` al artículo existente, o
- Crear un nuevo artículo si la feature es suficientemente grande para merecer el suyo propio

Las secciones pueden ser de tipo `paragraph`, `code`, `list`, `info-box` o `architecture-step`.
Mantén el estilo del tema **Sunset** y el tono técnico del resto del archivo.

### Paso 6 — Reportar

Indica qué archivos de documentación se modificaron y un resumen de los cambios realizados (una línea por sección actualizada).
