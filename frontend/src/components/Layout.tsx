// T028: Layout with sidebar navigation filtered by role
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Palmtree,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  Calendar,
  Building2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';
import { ROUTES } from '../config/constants';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: <LayoutDashboard size={20} />, roles: [Role.ADMIN, Role.MODERADOR] },
  { label: 'Personal', path: ROUTES.EMPLOYEES, icon: <Users size={20} />, roles: [Role.ADMIN, Role.MODERADOR, Role.EMPLEADO] },
  // { label: 'Rotación', path: ROUTES.TEAMS, icon: <UsersRound size={20} />, roles: [Role.ADMIN, Role.MODERADOR] }, // TODO: Enable Teams view
  { label: 'Calendario de Turnos', path: ROUTES.SHIFT_ROSTER, icon: <Calendar size={20} />, roles: [Role.ADMIN, Role.MODERADOR, Role.EMPLEADO] },
  // { label: 'Control Horario', path: ROUTES.ATTENDANCE, icon: <Clock size={20} />, roles: [Role.ADMIN, Role.MODERADOR, Role.EMPLEADO] }, // TODO: Enable Attendance view
  { label: 'Vacaciones', path: ROUTES.VACATIONS, icon: <Palmtree size={20} />, roles: [Role.ADMIN, Role.MODERADOR, Role.EMPLEADO] },
  { label: 'Informes', path: ROUTES.REPORTS, icon: <BarChart3 size={20} />, roles: [Role.ADMIN, Role.MODERADOR] },
  { label: 'Estadísticas Tiempo', path: '/admin/statistics', icon: <BarChart3 size={20} />, roles: [Role.ADMIN, Role.MODERADOR] },
  { label: 'Departamentos', path: ROUTES.DEPARTMENTS, icon: <Building2 size={20} />, roles: [Role.ADMIN] },
  { label: 'Tipos de Turno', path: ROUTES.SHIFT_CONFIGURATION, icon: <Zap size={20} />, roles: [Role.ADMIN] },
  { label: 'Configuración', path: ROUTES.SETTINGS, icon: <Settings size={20} />, roles: [Role.ADMIN] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = user?.role as Role;
  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  return (
    <div className="drawer lg:drawer-open">
      <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" checked={sidebarOpen} onChange={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main content */}
      <div className="drawer-content flex flex-col">
        {/* Navbar */}
        <div className="navbar bg-base-100 border-b border-base-300 lg:hidden">
          <div className="flex-none">
            <label htmlFor="sidebar-drawer" className="btn btn-square btn-ghost" aria-label="Abrir barra lateral">
              <Menu size={24} />
            </label>
          </div>
          <div className="flex-1">
            <span className="text-sm opacity-70">Bienvenido, {user?.email}</span>
          </div>
        </div>

        <main className="flex-1 p-6 bg-base-200">
          <Outlet />
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-40">
        <label htmlFor="sidebar-drawer" aria-label="Cerrar barra lateral" className="drawer-overlay" onClick={() => setSidebarOpen(false)} />
        <aside className="bg-neutral text-neutral-content w-64 min-h-full flex flex-col">
          <div className="px-5 py-5 border-b border-neutral-content/10 flex justify-between items-center">
            <h1 className="text-xl font-bold">ILPI Staff</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden btn btn-ghost btn-sm btn-circle"
              aria-label="Cerrar barra lateral"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-3 py-3">
            <ul className="menu menu-sm gap-1">
              {filteredNav.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      isActive ? 'active font-medium' : 'opacity-70 hover:opacity-100'
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-3">
            <div className="card bg-neutral-content/10 p-3">
              <div className="text-xs opacity-60 mb-2">
                {user?.email} ({user?.role})
              </div>
              <button className="btn btn-error btn-sm w-full gap-2" onClick={logout}>
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
