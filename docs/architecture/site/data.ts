/**
 * Contenido de documentación de ILPI Kitchen Staff Management,
 * estructurado según el modelo del proyecto `template-documentacion`.
 *
 * Cómo usar: copiar este archivo (y `types.ts`) dentro de `src/` del proyecto
 * template-documentacion, reemplazando su `data.ts`. La app renderizará estas
 * categorías y artículos con el estilo (tema "Sunset") del template.
 *
 * Origen del contenido: docs/architecture/{db,frontend,backend,infra}/README.md
 */

import type { CategoryInfo, DocArticle } from './types';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'db',
    title: 'Base de Datos',
    description:
      'Esquema de datos, migraciones Alembic, relaciones entre tablas, constraints e índices (PostgreSQL + SQLModel).',
    iconName: 'Database',
    colorClass: 'from-amber-500 to-orange-600',
    badgeColor: 'badge-warning',
  },
  {
    id: 'frontend',
    title: 'Frontend (React & Tailwind)',
    description:
      'Vistas, roles, menú de navegación, sistema de diseño, routing y capa de servicios (React 19 + Vite + DaisyUI v5).',
    iconName: 'Monitor',
    colorClass: 'from-rose-500 to-pink-600',
    badgeColor: 'badge-secondary',
  },
  {
    id: 'backend',
    title: 'Backend (FastAPI)',
    description:
      'Arquitectura por capas, RBAC, endpoints REST, servicios con sus restricciones y diagramas de secuencia.',
    iconName: 'Server',
    colorClass: 'from-indigo-500 to-violet-600',
    badgeColor: 'badge-primary',
  },
  {
    id: 'infra',
    title: 'Infraestructura',
    description:
      'Producción en el VPS con Coolify: topología, despliegue, secretos, operación, backups y troubleshooting.',
    iconName: 'Cloud',
    colorClass: 'from-emerald-500 to-teal-600',
    badgeColor: 'badge-success',
  },
];

export const INITIAL_ARTICLES: DocArticle[] = [
  // ───────────────────────────── DB ─────────────────────────────
  {
    id: 'db-modelo-multitenant',
    title: 'Modelo de datos y multi-tenant',
    category: 'db',
    summary:
      'Visión general del esquema: 13 tablas con aislamiento por tenant, PK UUID y timestamps UTC.',
    iconName: 'Database',
    tags: ['postgresql', 'sqlmodel', 'multi-tenant'],
    difficulty: 'basic',
    lastUpdated: '2026-06-28',
    author: 'ILPI Docs',
    sections: [
      {
        type: 'paragraph',
        title: 'Aislamiento por tenant',
        content:
          'El sistema es multi-tenant: cada entidad de negocio incluye tenant_id (FK a tenant.id), lo que permite aislar datos por organización. El MVP opera con un único tenant "ILPI". Todas las claves primarias son UUID y la mayoría de tablas incluyen created_at/updated_at en UTC.',
      },
      {
        type: 'list',
        title: 'Tablas principales',
        content: [
          'tenant — organización contenedora',
          'user — credenciales de autenticación',
          'employee — ficha personal/profesional',
          'department / team — agrupaciones',
          'shift_type / shift_record — turnos (plantilla y asignación)',
          'time_entries — horas trabajadas (auto/extra)',
          'absence — ausencias',
          'vacation_request / vacation_balance — vacaciones',
          'password_reset_tokens — recuperación de contraseña',
          'audit_log — bitácora append-only',
        ],
      },
      {
        type: 'info-box',
        badge: 'Invariante',
        content:
          'DNI y email son únicos por tenant. El borrado de empleados es soft-delete (is_active=false / status=Inactivo) para preservar históricos. El pasaporte (employee.passport) es un dato opcional y sin restricción de unicidad: se captura solo cuando el empleado indica que posee uno.',
      },
    ],
  },
  {
    id: 'db-relaciones',
    title: 'Relaciones y constraints',
    category: 'db',
    summary:
      'Diagrama entidad-relación, claves foráneas, restricciones de unicidad, CHECK e índices.',
    iconName: 'Share2',
    tags: ['erd', 'foreign-keys', 'constraints'],
    difficulty: 'intermediate',
    lastUpdated: '2026-06-28',
    author: 'ILPI Docs',
    sections: [
      {
        type: 'code',
        title: 'Diagrama Entidad-Relación (Mermaid)',
        content: '',
        snippet: {
          language: 'mermaid',
          filename: 'erd.mmd',
          code: `erDiagram
    TENANT ||--o{ EMPLOYEE : tiene
    TENANT ||--o{ USER : tiene
    DEPARTMENT ||--o{ EMPLOYEE : agrupa
    DEPARTMENT ||--o{ TEAM : agrupa
    SHIFT_TYPE ||--o{ TEAM : "define turno de"
    SHIFT_TYPE ||--o{ SHIFT_RECORD : tipifica
    EMPLOYEE ||--o| USER : "autenticado por"
    EMPLOYEE ||--o{ SHIFT_RECORD : "asignado a"
    EMPLOYEE ||--o{ VACATION_REQUEST : solicita
    EMPLOYEE ||--o{ VACATION_BALANCE : acumula
    SHIFT_RECORD ||--o| TIME_ENTRIES : genera`,
        },
      },
      {
        type: 'list',
        title: 'Constraints destacados',
        content: [
          'uq_employee_tenant_dni / uq_employee_tenant_email — unicidad por tenant',
          'uq_user_tenant_email — email de usuario único por tenant',
          'uq_team_tenant_name_dept — equipo único por (tenant, nombre, departamento)',
          'uq_balance_tenant_employee_year — un saldo por empleado y año',
          'uq_time_entry_employee_date_shift — evita duplicar horas',
          'ck_department_color_hex — color debe ser #RRGGBB',
          'CHECK expected_hours entre 0.5 y 24.0 en shift_type',
        ],
      },
      {
        type: 'info-box',
        badge: 'Concurrencia',
        content:
          'vacation_request.version implementa optimistic locking para evitar actualizaciones perdidas en aprobaciones simultáneas.',
      },
    ],
  },
  {
    id: 'db-migraciones',
    title: 'Migraciones Alembic',
    category: 'db',
    summary:
      'Cadena de 16 migraciones desde la inicial hasta la incorporación del pasaporte en el legajo de empleados.',
    iconName: 'GitCommit',
    tags: ['alembic', 'migrations'],
    difficulty: 'intermediate',
    lastUpdated: '2026-07-09',
    author: 'ILPI Docs',
    sections: [
      {
        type: 'list',
        title: 'Hitos de la cadena de migraciones',
        content: [
          '82db0c2710d3 — migración inicial (tenant, team, employee, shift_record, user, vacations)',
          '2aca5d9f21d0 → ab0bd6eec523 — introducción de shift_type y FK en team',
          '20260305_roster_fields / 20260306_shift_type_fk — campos de roster y FK en shift_record',
          'f5e9c1a2b3d4 / 34bd6356fba6 — setup de contraseña y password_reset_tokens',
          '79ad9726ce5e / 20260605_extra_hours — time_entries y horas extra',
          '20260616_add_absence — tabla absence',
          '20260625_vacation_config — config de vacaciones + audit_log',
          '20260626_departments — tabla department + migración a FK',
          '20260709_passport (HEAD) — columna nullable employee.passport',
        ],
      },
      {
        type: 'code',
        title: 'Comandos',
        content: '',
        snippet: {
          language: 'bash',
          filename: 'alembic.sh',
          code: `cd backend
alembic upgrade head        # aplicar todas
alembic downgrade -1        # revertir la última
alembic history             # ver historia
alembic revision --autogenerate -m "descripcion"`,
        },
      },
    ],
  },

  // ─────────────────────────── FRONTEND ───────────────────────────
  {
    id: 'fe-stack-estructura',
    title: 'Stack y estructura del frontend',
    category: 'frontend',
    summary:
      'React 19 + TypeScript strict + Vite 7, Tailwind v4 y DaisyUI v5 (tema sunset). Organización por portales.',
    iconName: 'Boxes',
    tags: ['react', 'vite', 'tailwind', 'daisyui'],
    difficulty: 'basic',
    lastUpdated: '2026-06-28',
    author: 'ILPI Docs',
    sections: [
      {
        type: 'list',
        title: 'Tecnologías',
        content: [
          'React 19 + TypeScript ~5.9 (strict)',
          'Vite 7 (build/dev)',
          'react-router-dom 7 (routing)',
          'Tailwind CSS v4 + DaisyUI v5 (tema sunset)',
          'Recharts (gráficos), react-big-calendar (calendario)',
          'Axios (HTTP), Lucide React (iconos), @dnd-kit (drag & drop)',
        ],
      },
      {
        type: 'code',
        title: 'Configuración de estilos',
        content: '',
        snippet: {
          language: 'css',
          filename: 'src/index.css',
          code: `@import "tailwindcss";
@plugin "daisyui" {
  themes: sunset --default;
}`,
        },
      },
      {
        type: 'info-box',
        badge: 'DaisyUI v5',
        content:
          'Clases eliminadas respecto a v3/v4: form-control, label.label, label-text/label-text-alt. Usar utilidades Tailwind directas.',
      },
    ],
  },
  {
    id: 'fe-roles-rutas',
    title: 'Roles, rutas y guards',
    category: 'frontend',
    summary:
      'Tres portales (Admin/Moderador, Empleado, Moderador) con guards de ruta y permisos por rol.',
    iconName: 'ShieldCheck',
    tags: ['rbac', 'routing', 'roles'],
    difficulty: 'intermediate',
    lastUpdated: '2026-06-28',
    author: 'ILPI Docs',
    sections: [
      {
        type: 'paragraph',
        title: 'Roles',
        content:
          'Tres roles: Admin (acceso total), Moderador (todo excepto configuración), Empleado (solo sus propios datos). Definidos en src/types/models.ts.',
      },
      {
        type: 'list',
        title: 'Guards de ruta',
        content: [
          'ProtectedRoute — autenticación + allowedRoles opcional',
          'EmployeeRoute — autenticado + Empleado + is_active=true',
          'ModeratorRoute — autenticado + Moderador + is_active=true',
          'PasswordSetupRoute — flujo de alta de contraseña',
        ],
      },
      {
        type: 'info-box',
        badge: 'Seguridad',
        content:
          'Los guards del cliente son UX. La autorización real se aplica en el backend (require_role / require_role_and_active en la capa de servicios).',
      },
    ],
  },
  {
    id: 'fe-servicios-estado',
    title: 'Menú, estado y capa de servicios',
    category: 'frontend',
    summary:
      'Navegación filtrada por rol, Context API + hooks y cliente Axios con refresh silencioso de tokens.',
    iconName: 'Network',
    tags: ['axios', 'context', 'hooks'],
    difficulty: 'intermediate',
    lastUpdated: '2026-06-28',
    author: 'ILPI Docs',
    sections: [
      {
        type: 'paragraph',
        title: 'Estado global',
        content:
          'AuthContext (usuario, token, login/logout vía useAuth), DepartmentsContext (catálogo) y ModeratorContext (datos del portal moderador). Hooks de dominio: useApi, useVacation, useShiftCalendar.',
      },
      {
        type: 'code',
        title: 'Refresh silencioso de tokens (apiClient)',
        content: '',
        snippet: {
          language: 'typescript',
          filename: 'src/services/apiClient.ts',
          code: `// Interceptor de response: ante 401 intenta refresh una vez
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;
  const { data } = await axios.post(\`\${API_BASE_URL}/auth/refresh\`, {}, { withCredentials: true });
  setAccessToken(data.access_token);
  return apiClient(originalRequest);
}`,
        },
      },
      {
        type: 'list',
        title: 'Menú Admin/Moderador (filtrado por rol)',
        content: [
          'Dashboard, Informes, Estadísticas Tiempo — Admin/Moderador',
          'Personal, Calendario de Turnos, Vacaciones — todos los roles',
          'Departamentos, Tipos de Turno, Configuración — solo Admin',
        ],
      },
    ],
  },

  // ─────────────────────────── BACKEND ───────────────────────────
  {
    id: 'be-arquitectura-rbac',
    title: 'Arquitectura por capas y RBAC',
    category: 'backend',
    summary:
      'Clean Architecture (Routers → Services → Models), JWT, bcrypt y dependencias de autorización.',
    iconName: 'Layers',
    tags: ['fastapi', 'clean-architecture', 'jwt', 'rbac'],
    difficulty: 'basic',
    lastUpdated: '2026-06-28',
    author: 'ILPI Docs',
    sections: [
      {
        type: 'architecture-step',
        title: 'Flujo de una petición',
        content: [
          'Router (app/routers): solo HTTP, serialización y checks de rol',
          'Schema (app/schemas): DTOs Pydantic v2',
          'Service (app/services): toda la lógica de negocio y reglas',
          'Model (app/models): entidades SQLModel persistidas en PostgreSQL',
        ],
      },
      {
        type: 'list',
        title: 'Seguridad',
        content: [
          'JWT HS256 — access 30 min, refresh 7 días (cookie)',
          'Passwords con bcrypt (passlib CryptContext)',
          'require_role(*roles) y require_role_and_active(*roles)',
          'Cabeceras de seguridad + CORS explícito + rate limiting (slowapi)',
          'Middleware de auditoría para eventos sensibles y accesos denegados',
        ],
      },
      {
        type: 'info-box',
        badge: 'Errores',
        content:
          'DomainError se mapea a HTTP: NotFound→404, Unauthorized→401, Forbidden→403, Validation→400, Duplicate/Conflict/BalanceExceeded→409, InvalidShiftType→422.',
      },
    ],
  },
  {
    id: 'be-vacaciones',
    title: 'Servicio de vacaciones',
    category: 'backend',
    summary:
      'Reglas: preaviso de 2 meses, año natural, días naturales, control de saldo y optimistic locking.',
    iconName: 'CalendarCheck',
    tags: ['vacations', 'business-rules', 'sequence-diagram'],
    difficulty: 'advanced',
    lastUpdated: '2026-06-28',
    author: 'ILPI Docs',
    sections: [
      {
        type: 'list',
        title: 'Restricciones',
        content: [
          'start_date <= end_date',
          'Preaviso de 2 meses para solicitudes de empleado (AdvanceNoticeRequiredError)',
          'Confinadas al año natural antes del 31 dic (CALENDAR_YEAR_VIOLATION)',
          'requested_days = (end - start).days + 1 (días naturales)',
          'No exceder el saldo disponible (BalanceExceededError) al crear y al aprobar',
          'Optimistic locking por version (ConflictError)',
          'Solo se aprueban/rechazan/cancelan solicitudes Pendiente',
          'El empleado solo cancela sus propias solicitudes pendientes',
        ],
      },
      {
        type: 'code',
        title: 'Diagrama de secuencia (Mermaid)',
        content: '',
        snippet: {
          language: 'mermaid',
          filename: 'vacation-create.mmd',
          code: `sequenceDiagram
    participant E as Empleado
    participant S as vacation_service
    participant DB as DB
    E->>S: create_request(start, end)
    S->>S: validar start<=end, preaviso 2m, año natural
    S->>DB: _get_or_create_balance(year)
    alt excede saldo
        S-->>E: BalanceExceededError (409)
    else ok
        S->>DB: INSERT vacation_request (Pendiente)
        S-->>E: VacationRequestResponse
    end`,
        },
      },
    ],
  },
  {
    id: 'be-turnos-time-tracking',
    title: 'Turnos, roster y time tracking',
    category: 'backend',
    summary:
      'Asignación de turnos con scope por departamento y generación automática e idempotente de horas.',
    iconName: 'Clock',
    tags: ['shifts', 'roster', 'time-tracking', 'scheduler'],
    difficulty: 'advanced',
    lastUpdated: '2026-06-28',
    author: 'ILPI Docs',
    sections: [
      {
        type: 'list',
        title: 'Restricciones de turnos (shift_service / moderator_shift_service)',
        content: [
          'Empleado debe existir y estar activo',
          'Conflicto con vacaciones aprobadas bloquea la asignación (ShiftConflictError)',
          'Sin duplicados: un turno por empleado/fecha/tipo',
          'El moderador solo opera sobre su propio departamento',
          'No se puede borrar un turno ya trabajado',
        ],
      },
      {
        type: 'code',
        title: 'Generación automática de horas (batch diario)',
        content: '',
        snippet: {
          language: 'mermaid',
          filename: 'time-tracking-batch.mmd',
          code: `sequenceDiagram
    participant J as Scheduler (diario)
    participant S as TimeTrackingService
    participant DB as DB
    J->>S: run_daily_batch_job(date)
    S->>DB: SELECT shift_records de la fecha
    loop por turno
        S->>S: _calculate_hours(start, end)
        S->>DB: UPSERT time_entries (source=shift)
    end
    S-->>J: resumen {procesados, errores}`,
        },
      },
      {
        type: 'info-box',
        badge: 'Idempotencia',
        content:
          'La generación de horas es idempotente gracias a uq_time_entry_employee_date_shift. Las horas extra solo pueden cargarlas Admin/Moderador.',
      },
    ],
  },
  {
    id: 'be-metricas-personal',
    title: 'Métricas de personal (Informes)',
    category: 'backend',
    summary:
      'Agregaciones de solo lectura para la sección "Métricas de Personal" de Informes: ratio de horas extra, absentismo, ranking y pasivo de vacaciones. Solo Admin.',
    iconName: 'TrendingUp',
    tags: ['reports', 'metrics', 'rbac', 'read-only'],
    difficulty: 'intermediate',
    lastUpdated: '2026-07-10',
    author: 'ILPI Docs',
    sections: [
      {
        type: 'paragraph',
        title: 'Endpoints (routers/metrics.py, prefijo /api/v1)',
        content:
          'Cuatro endpoints GET Admin-only bajo /reports/*, respaldados por metrics_service.py sobre datos ya persistidos (sin modelos ni migraciones nuevas). Todo se filtra por tenant_id.',
      },
      {
        type: 'list',
        title: 'Indicadores y fórmulas',
        content: [
          'GET /reports/overtime-ratio — Σ horas(source=EXTRA) / Σ horas(source=SHIFT) × 100; ratio_pct null si no hay ordinarias',
          'GET /reports/absenteeism — count(Absence) / count(ShiftRecord) × 100 en el periodo; desglose justificada/injustificada; alert cuando supera 5%',
          'GET /reports/overtime-ranking — top N (default 10, limit 1–50) empleados por horas extra, descendente',
          'GET /reports/vacation-liability — por empleado activo: accrued = round(anual × meses_trabajados / 12); liability = accrued − used_days (puede ser negativo); más totales del plantel',
        ],
      },
      {
        type: 'info-box',
        badge: 'RBAC doble capa',
        content:
          'Autorización enforced en el router (require_role("Admin")) y de nuevo en el service (_require_admin), según el Principio V de la constitución. Reutiliza AbsenceService y vacation_service.get_or_create_balances_bulk (optimización N+1: resolve todos los balances en una query). Endpoints read-only; casos borde devuelven valores neutros.',
      },
    ],
  },

  // ─────────────────────────── INFRA ────────────────────────────
  {
    id: 'infra-topologia-coolify',
    title: 'Producción: VPS + Coolify',
    category: 'infra',
    summary:
      'Cómo corre https://ilpi.vila.ar: un stack Docker Compose en Coolify detrás de Traefik, con un gateway Caddy que reparte /api, /docum y la SPA bajo un solo dominio.',
    iconName: 'Cloud',
    tags: ['coolify', 'docker', 'traefik', 'caddy', 'vps'],
    difficulty: 'intermediate',
    lastUpdated: '2026-10-27',
    author: 'ILPI Docs',
    sections: [
      {
        type: 'list',
        title: 'Datos clave',
        content: [
          'URL: https://ilpi.vila.ar — DNS en Hetzner (registro A → 62.238.61.134)',
          'VPS: Ubuntu 24.04, 4 vCPU, 7.6 GB RAM; acceso ssh root@62.238.61.134',
          'Panel: https://panel.vila.ar (Coolify 4.4.6) → proyecto ILPI / production',
          'Recurso: ilpi-resto, uuid 9poetcpgivmo9yhrf4ldd765, rama main, build pack Docker Compose',
          'TLS: Let\'s Encrypt emitido y renovado por el Traefik de Coolify',
          'En el mismo VPS hay apps de otros proyectos: no tocarlas',
        ],
      },
      {
        type: 'code',
        title: 'Recorrido de un request',
        content: 'Traefik termina TLS y entrega al gateway, que enruta por path.',
        snippet: {
          language: 'mermaid',
          filename: 'topologia.mmd',
          code: `flowchart LR
    U[Navegador] -->|HTTPS| T[coolify-proxy / Traefik]
    T -->|HTTP :80| G[gateway / Caddy]
    G -->|/api, /health, /docs| B[backend FastAPI :8000]
    G -->|/docum + forward_auth| B
    G -->|/docum autorizado| S[(docum-dist)]
    G -->|resto| F[frontend serve -s :5173]
    B --> D[(db Postgres 18)]`,
        },
      },
      {
        type: 'architecture-step',
        badge: 'Servicios',
        title: 'docker-compose.coolify.yml',
        content:
          'db (postgres:18, volumen ilpi-pgdata18, sin puertos públicos) → backend (alembic upgrade head + uvicorn --proxy-headers) → frontend (SPA, VITE_API_URL=/api/v1) → gateway (Caddy con el Caddyfile horneado en la imagen; único servicio con dominio en Coolify).',
      },
      {
        type: 'info-box',
        badge: 'Mismo origen',
        content:
          'Front, API y docs comparten dominio: no hay CORS ni cookies cross-site (COOKIE_SAMESITE=lax, COOKIE_SECURE=true). Caddy confía en X-Forwarded-For de redes privadas y uvicorn usa --proxy-headers, así el rate limiting y la auditoría ven la IP real del visitante.',
      },
    ],
  },
  {
    id: 'infra-deploy-secretos',
    title: 'Despliegue y secretos',
    category: 'infra',
    summary:
      'Flujo de deploy en Coolify, variables de entorno, secretos generados por Coolify y cuidados con migraciones y rollback.',
    iconName: 'Rocket',
    tags: ['coolify', 'deploy', 'secrets', 'alembic'],
    difficulty: 'intermediate',
    lastUpdated: '2026-10-27',
    author: 'ILPI Docs',
    sections: [
      {
        type: 'code',
        title: 'Flujo de deploy',
        content: 'Merge a main → Coolify construye y recrea el stack (~1–1,5 min).',
        snippet: {
          language: 'mermaid',
          filename: 'deploy.mmd',
          code: `sequenceDiagram
    participant Dev
    participant GH as GitHub (main)
    participant C as Coolify
    participant H as Docker host
    Dev->>GH: merge a main
    GH-->>C: webhook (auto-deploy) o botón Deploy
    C->>H: docker compose build
    C->>H: recrea contenedores
    H->>H: db healthy → backend migra → uvicorn
    C->>C: deploy finished / failed`,
        },
      },
      {
        type: 'list',
        title: 'Variables (Coolify → Environment Variables)',
        content: [
          'DOMAIN=ilpi.vila.ar (manual) → CORS_ORIGINS',
          'SERVICE_PASSWORD_POSTGRES (generada por Coolify) → contraseña de Postgres y DATABASE_URL',
          'SERVICE_PASSWORD_64_SECRETKEY (generada por Coolify) → SECRET_KEY de los JWT',
          'MAILJET_* (opcionales) → envío de emails',
        ],
      },
      {
        type: 'info-box',
        badge: 'Cuidado',
        content:
          'Cambiar SERVICE_PASSWORD_64_SECRETKEY invalida todas las sesiones. No cambiar SERVICE_PASSWORD_POSTGRES desde el panel: Postgres solo la lee al crear el volumen (primero ALTER USER). Si cambia docker-compose.coolify.yml, apretar "Reload Compose" antes del deploy. Durante el deploy el dominio puede dar 503 unos segundos. Un rollback de Coolify no revierte migraciones ya aplicadas.',
      },
      {
        type: 'info-box',
        badge: 'Bind-mounts',
        content:
          'Coolify no deja el checkout del repo en el host: montar un archivo del repo termina en un directorio vacío y el contenedor no arranca. Por eso el Caddyfile va dentro de la imagen (gateway/Dockerfile).',
      },
    ],
  },
  {
    id: 'infra-operacion',
    title: 'Operación, backups y troubleshooting',
    category: 'infra',
    summary:
      'Comandos del día a día en el VPS, backup/restore de la base, publicación de /docum y solución de problemas frecuentes.',
    iconName: 'Wrench',
    tags: ['operations', 'backup', 'postgres', 'troubleshooting'],
    difficulty: 'advanced',
    lastUpdated: '2026-10-27',
    author: 'ILPI Docs',
    sections: [
      {
        type: 'code',
        title: 'Atajos en el VPS',
        content: 'Los nombres de contenedor cambian en cada deploy; resolverlos por filtro.',
        snippet: {
          language: 'bash',
          filename: 'vps.sh',
          code: `APP=9poetcpgivmo9yhrf4ldd765
DB=$(docker ps -q --filter name=db-$APP)
BE=$(docker ps -q --filter name=backend-$APP)

docker ps --filter name=$APP              # estado
docker logs -f --tail 100 $BE             # logs backend (JSON)
docker exec -it $DB psql -U ilpi -d ilpi  # consola SQL

# Backup manual (formato custom)
docker exec $DB pg_dump -U ilpi -d ilpi -Fc > /root/ilpi-backups/ilpi-$(date +%F).dump

# Restore
docker stop $BE
docker exec $DB psql -U ilpi -d ilpi -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i $DB pg_restore -U ilpi -d ilpi --no-owner --no-privileges < archivo.dump
docker start $BE`,
        },
      },
      {
        type: 'info-box',
        badge: 'Sin backups automáticos',
        content:
          'Los backups programados de Coolify no cubren la base de un recurso Docker Compose. Hasta automatizarlo (cron o Scheduled Task + copia fuera del VPS), el backup es manual.',
      },
      {
        type: 'architecture-step',
        badge: '/docum',
        title: 'Publicar este sitio',
        content:
          'Desde el repo: scripts/build-docum.sh clona template-documentacion, copia docs/architecture/site/{types,data}.ts, compila con base /docum/ y sincroniza dist/ a /data/coolify/applications/<uuid>/docum-dist/ en el VPS. No requiere redeploy: Caddy sirve los archivos montados.',
      },
      {
        type: 'list',
        title: 'Problemas frecuentes',
        content: [
          '503 "no available server": deploy en curso o gateway caído → esperar / docker ps',
          'El dominio no abre en una sola máquina: caché DNS negativa → flush DNS, reiniciar router o usar 1.1.1.1',
          'Backend reinicia en loop: falla de migración → docker logs $BE',
          'Todos reciben 429 en login: el backend ve una sola IP → revisar --proxy-headers y trusted_proxies',
          '/docum muestra contenido viejo: el sitio cachea artículos en localStorage → borrar datos del sitio en el navegador',
        ],
      },
    ],
  },
];
