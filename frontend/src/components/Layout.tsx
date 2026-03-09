// T028: Layout with sidebar navigation filtered by role
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Clock,
  Palmtree,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  Calendar,
} from 'lucide-react';
import { Button, Card } from './ui';
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
  { label: 'Rotación', path: ROUTES.TEAMS, icon: <UsersRound size={20} />, roles: [Role.ADMIN, Role.MODERADOR] },
  { label: 'Calendario de Turnos', path: ROUTES.SHIFT_ROSTER, icon: <Calendar size={20} />, roles: [Role.ADMIN, Role.MODERADOR, Role.EMPLEADO] },
  { label: 'Control Horario', path: ROUTES.ATTENDANCE, icon: <Clock size={20} />, roles: [Role.ADMIN, Role.MODERADOR, Role.EMPLEADO] },
  { label: 'Vacaciones', path: ROUTES.VACATIONS, icon: <Palmtree size={20} />, roles: [Role.ADMIN, Role.MODERADOR, Role.EMPLEADO] },
  { label: 'Informes', path: ROUTES.REPORTS, icon: <BarChart3 size={20} />, roles: [Role.ADMIN, Role.MODERADOR] },
  { label: 'Tipos de Turno', path: ROUTES.SHIFT_CONFIGURATION, icon: <Zap size={20} />, roles: [Role.ADMIN] },
  { label: 'Configuración', path: ROUTES.SETTINGS, icon: <Settings size={20} />, roles: [Role.ADMIN] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = user?.role as Role;
  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 bg-slate-900 text-white flex flex-col ${
          sidebarOpen ? 'fixed md:relative' : 'hidden md:flex'
        } z-50 md:z-auto h-screen md:h-auto`}
      >
        <div className="px-5 py-5 border-b border-slate-700 flex justify-between items-center">
          <h1 className="text-xl font-bold">ILPI Staff</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-white hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded p-1"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3">
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors no-underline ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Card className="m-3 p-3 border-slate-700 bg-slate-800">
          <div className="text-xs text-slate-400 mb-2">
            {user?.email} ({user?.role})
          </div>
          <Button
            variant="danger"
            size="sm"
            className="w-full flex items-center justify-center gap-2"
            onClick={logout}
          >
            <LogOut size={16} /> Cerrar Sesión
          </Button>
        </Card>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="px-6 py-3 border-b border-slate-200 flex items-center bg-white">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-slate-700 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded p-1 mr-4"
            aria-label="Open sidebar"
          >
            <Menu size={24} />
          </button>
          <span className="text-sm text-slate-600">
            Bienvenido, {user?.email}
          </span>
        </header>

        <main className="flex-1 p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
