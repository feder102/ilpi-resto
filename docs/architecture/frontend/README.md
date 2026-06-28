# Documentación del Frontend — ILPI Kitchen Staff Management

> **Fuente**: `frontend/src/`
> **Última actualización**: 2026-06-28

SPA (Single Page Application) que consume la API REST del backend. Organizada por
**portales según rol** (Admin/Moderador, Empleado, Moderador-portal) con control de
acceso en el cliente y enforcement real en el backend.

---

## 1. Stack tecnológico

| Área | Tecnología | Versión |
|------|-----------|---------|
| Framework UI | **React** | 19 |
| Lenguaje | **TypeScript** | ~5.9 (strict mode) |
| Build / Dev | **Vite** | 7 |
| Routing | **react-router-dom** | 7 |
| Estilos | **Tailwind CSS v4** + **DaisyUI v5** (tema `sunset`) | 4 / 5 |
| Gráficos | **Recharts** | 3 |
| Calendario | **react-big-calendar** | 1.19 |
| Escaneo QR | **html5-qrcode** | 2.3 |
| Iconos | **Lucide React** | 0.575 |
| HTTP | **Axios** | 1.13 |
| Drag & Drop | **@dnd-kit** | 6 / 10 |
| Fechas | **date-fns** | 4 |
| Linting | **ESLint** | 9 |

**Configuración de estilos** (`src/index.css`):
```css
@import "tailwindcss";
@plugin "daisyui" {
  themes: sunset --default;
}
```

> ⚠️ Se usa **DaisyUI v5**. Clases eliminadas respecto a v3/v4: `form-control`,
> `label.label`, `label-text`/`label-text-alt`. Ver `CLAUDE.md` para equivalencias.

---

## 2. Estructura de carpetas (`frontend/src`)

```
src/
├── App.tsx                # Definición de rutas (routing central)
├── main.tsx               # Entry point (monta React + Router)
├── index.css              # Tailwind + DaisyUI (tema sunset)
├── components/            # Componentes reutilizables
│   ├── ui/                # Design system (Button, Card, Modal, Table, Toast, …)
│   ├── moderator/         # Componentes del portal moderador
│   ├── password-reset/    # Flujo de recuperación de contraseña
│   ├── time-tracking/     # Modales y tablas de fichaje/horas
│   ├── vacation/          # Formularios y listas de vacaciones
│   ├── Layout.tsx         # Layout Admin/Moderador (sidebar)
│   ├── EmployeeLayout.tsx # Layout del portal empleado
│   └── *Route.tsx         # Guards de ruta (ProtectedRoute, EmployeeRoute, …)
├── views/                 # Páginas (una por pantalla)
├── context/               # React Context (Auth, Departments, Moderator)
├── hooks/                 # Custom hooks (useAuth, useApi, useVacation, …)
├── services/              # Clientes de API (uno por dominio)
├── types/                 # Tipos/interfaces TypeScript
├── config/                # constants.ts (rutas, permisos), designTokens.ts
└── utils/                 # errorHandler.ts
```

---

## 3. Roles y control de acceso

Definición de roles (`src/types/models.ts`):

```ts
export const Role = {
  ADMIN: 'Admin',
  MODERADOR: 'Moderador',
  EMPLEADO: 'Empleado',
} as const;
```

Permisos por rol (`src/config/constants.ts` → `ROLE_PERMISSIONS`):

| Rol | Permisos |
|-----|----------|
| **Admin** | `dashboard`, `employees`, `teams`, `attendance`, `vacations`, `reports`, `shift-configuration`, `settings`, `departments` |
| **Moderador** | `dashboard`, `employees`, `teams`, `attendance`, `vacations`, `reports` |
| **Empleado** | `profile`, `my-shifts`, `my-vacations` |

### Guards de ruta (componentes)

- **`ProtectedRoute`**: requiere autenticación; opcionalmente `allowedRoles`.
- **`EmployeeRoute`**: autenticado + rol `Empleado` + `is_active=true`.
- **`ModeratorRoute`**: autenticado + rol `Moderador` + `is_active=true`.
- **`PasswordSetupRoute`**: acceso al flujo de alta de contraseña.

> 🔐 Los guards del cliente son UX; la **autorización real** se aplica en el backend
> (capa de servicios + dependencias `require_role` / `require_role_and_active`).

---

## 4. Rutas y vistas

Definidas en `src/App.tsx`. Tres áreas:

### 4.1 Portal Admin / Moderador (con `Layout` + sidebar)

| Ruta | Vista | Roles |
|------|-------|-------|
| `/login` | `LoginView` | Público |
| `/dashboard` | `DashboardView` | Admin, Moderador |
| `/employees` | `EmployeeListView` | Todos |
| `/shift-roster` | `ShiftRosterCalendar` | Todos |
| `/shift-configuration` | `ShiftConfiguration` | Admin |
| `/vacations` | `VacationView` | Todos |
| `/reports` | `ReportsView` | Admin, Moderador |
| `/settings` | `SettingsView` | Admin |
| `/admin/statistics` | `AdminStatistics` | Admin, Moderador |
| `/admin/departments` | `DepartmentListView` | Admin |

### 4.2 Portal Empleado (con `EmployeeLayout`)

> Requieren: autenticado + `Empleado` + `is_active=true`.

| Ruta | Vista |
|------|-------|
| `/employee/dashboard` | `EmployeeDashboardView` |
| `/employee/shifts` | `EmployeeShiftCalendar` |
| `/employee/vacations` | `EmployeeVacationView` |
| `/employee/statistics` | `EmployeeStatisticsView` |

### 4.3 Portal Moderador

> Requieren: autenticado + `Moderador` + `is_active=true`. El backend aplica
> *row-level security* por departamento del moderador.

| Ruta | Vista |
|------|-------|
| `/moderator/dashboard` | `ModeratorDashboard` |
| `/moderator/roster` | `ModeratorRoster` |
| `/moderator/vacations` | `ModeratorVacations` |
| `/moderator/shifts` | `ModeratorShifts` |
| `/moderator/reports` | `ModeratorReports` |

### 4.4 Flujos públicos

| Ruta | Vista | Descripción |
|------|-------|-------------|
| `/auth/password-setup` | `PasswordSetup` | Alta de contraseña vía token de email |
| `/password-reset` | `PasswordReset` | Recuperación de contraseña |

> Catch-all `*` → redirige a `/login`.

---

## 5. Menú de navegación

### Sidebar Admin/Moderador (`components/Layout.tsx`, filtrado por rol)

| Etiqueta | Ruta | Icono | Roles |
|----------|------|-------|-------|
| Dashboard | `/dashboard` | `LayoutDashboard` | Admin, Moderador |
| Personal | `/employees` | `Users` | Todos |
| Calendario de Turnos | `/shift-roster` | `Calendar` | Todos |
| Vacaciones | `/vacations` | `Palmtree` | Todos |
| Informes | `/reports` | `BarChart3` | Admin, Moderador |
| Estadísticas Tiempo | `/admin/statistics` | `BarChart3` | Admin, Moderador |
| Departamentos | `/admin/departments` | `Building2` | Admin |
| Tipos de Turno | `/shift-configuration` | `Zap` | Admin |
| Configuración | `/settings` | `Settings` | Admin |

> El menú filtra con `NAV_ITEMS.filter(item => item.roles.includes(userRole))`.
> Hay items comentados (TODO): "Rotación" (Teams) y "Control Horario" (Attendance).

### Sidebar Empleado (`components/EmployeeLayout.tsx`)

| Etiqueta | Ruta | Icono |
|----------|------|-------|
| Panel Principal | `/employee/dashboard` | `LayoutDashboard` |
| Mi Calendario | `/employee/shifts` | `Calendar` |
| Mis Vacaciones | `/employee/vacations` | `Palmtree` |
| Mis Estadísticas | `/employee/statistics` | `BarChart3` |

---

## 6. Gestión de estado (Context + hooks)

- **`AuthContext`** (`context/AuthContext.tsx`): usuario actual, token de acceso,
  `login` / `logout`. Expuesto vía `useAuth()`.
- **`DepartmentsContext`**: catálogo de departamentos compartido (`useDepartments`).
- **`ModeratorContext`**: datos del portal moderador (`useModeratorData`).

Hooks de dominio: `useApi`, `useVacation`, `useShiftCalendar`,
`useEmployeeShiftCalendar`.

---

## 7. Capa de servicios (HTTP)

Cliente Axios central en `services/apiClient.ts`:

- `baseURL` desde `VITE_API_BASE` / `VITE_API_URL` (fallback `http://localhost:8000/api/v1`).
- `withCredentials: true` (cookie HttpOnly del refresh token).
- **Interceptor de request**: añade `Authorization: Bearer <accessToken>`.
- **Interceptor de response**: ante `401`, intenta **refresh silencioso**
  (`POST /auth/refresh`) una sola vez; si falla, limpia el token y redirige a `/login`.

Servicios por dominio: `authService`, `employeeService`, `departmentService`,
`teamService`, `shiftService`, `shiftTypesApi`, `vacationService`,
`moderatorService`, `dashboardService`, `statisticsService`, `settingsService`,
`passwordResetService`.

---

## 8. Sistema de diseño (estilo)

- **Tema base**: DaisyUI `sunset` (oscuro). Sidebar Admin usa `bg-neutral`.
- **Design tokens** (`config/designTokens.ts`): paleta **Indigo** (acción primaria
  `#4F46E5`) + **Slate** (neutros) + colores semánticos (success `#16A34A`,
  warning `#CA8A04`, error `#DC2626`, info `#2563EB`); escala de espaciado base 4px;
  tipografía `system-ui`.
- **Catálogo de iconos de departamento** y **paleta de colores** para el ABM de
  departamentos en `config/constants.ts` (`DEPARTMENT_ICON_CATALOG`,
  `DEPARTMENT_COLOR_PALETTE`).
- **Biblioteca de componentes UI** (`components/ui/`): `Alert`, `Badge`,
  `Breadcrumb`, `Button`, `Card`, `Checkbox`, `Dropdown`, `Input`, `Modal`,
  `Pagination`, `Radio`, `Spinner`, `Table`, `Tabs`, `Toast`.

---

## 9. Comandos

```bash
cd frontend
npm install      # Instalar dependencias
npm run dev      # Servidor de desarrollo (Vite)
npm run lint     # ESLint
npm run build    # tsc -b && vite build (chequeo de tipos + build)
npm run preview  # Previsualizar build
```
