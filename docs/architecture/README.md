# Documentación de Arquitectura — ILPI Kitchen Staff Management

Documentación técnica completa del repositorio, dividida por dominio. Se generó
siguiendo los 4 pasos definidos en el issue #30.

## Estructura

```
docs/architecture/
├── README.md            ← este índice
├── db/
│   └── README.md        ← Paso 1: base de datos (modelos, migraciones, relaciones)
├── frontend/
│   └── README.md        ← Paso 2: frontend (vistas, roles, menú, estilo, tecnología)
├── backend/
│   └── README.md        ← Paso 3: backend (routers, servicios, modelos, diagramas
│                           de secuencia y restricciones)
└── site/                ← Paso 4: documentación consolidada en el estilo del
    ├── types.ts            template-documentacion (categorías + artículos)
    ├── data.ts
    └── README.md
```

## Los 4 pasos (issue #30)

1. **Base de datos** (`db/README.md`): analiza `backend/alembic` y `backend/app/models`,
   describiendo tablas, columnas, claves, constraints, índices, relaciones (ERD Mermaid)
   y la historia completa de migraciones.
2. **Frontend** (`frontend/README.md`): vistas, roles, menú de navegación, sistema de
   diseño/estilo, stack tecnológico, routing, contextos, hooks y capa de servicios.
3. **Backend** (`backend/README.md`): arquitectura por capas, RBAC, catálogo de endpoints,
   y por cada servicio sus restricciones + **diagrama de secuencia** (Mermaid).
4. **Consolidación estilo template** (`site/`): el contenido de los 3 documentos
   anteriores volcado al modelo de contenido del repositorio
   [template-documentacion](https://github.com/feder102/template-documentacion)
   (categorías `db`/`frontend`/`backend` + artículos con secciones), listo para
   integrarse en ese proyecto separado y publicarse de forma oculta en
   `DOMAIN=ilpi.tudominio.com/docum`. Ver `site/README.md`.

## Diagramas Mermaid

Los documentos usan diagramas Mermaid (ERD y secuencia). Se renderizan automáticamente
en GitHub y en cualquier visor compatible con Mermaid.
