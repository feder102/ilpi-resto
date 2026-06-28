/**
 * Contenido de documentación de ILPI Kitchen Staff Management,
 * estructurado según el modelo del proyecto `template-documentacion`.
 *
 * Cómo usar: copiar este archivo (y `types.ts`) dentro de `src/` del proyecto
 * template-documentacion, reemplazando su `data.ts`. La app renderizará estas
 * categorías y artículos con el estilo (tema "Sunset") del template.
 *
 * Origen del contenido: docs/architecture/{db,frontend,backend}/README.md
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
          'DNI y email son únicos por tenant. El borrado de empleados es soft-delete (is_active=false / status=Inactivo) para preservar históricos.',
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
      'Cadena de 15 migraciones desde la inicial hasta la introducción del ABM de departamentos.',
    iconName: 'GitCommit',
    tags: ['alembic', 'migrations'],
    difficulty: 'intermediate',
    lastUpdated: '2026-06-28',
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
          '20260626_departments (HEAD) — tabla department + migración a FK',
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
];
