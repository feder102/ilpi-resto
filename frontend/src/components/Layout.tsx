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
  { label: 'Rotación', path: ROUTES.TEAMS, icon: <UsersRound size={20} />, roles: [Role.ADMIN, Role.MODERADOR] },
  { label: 'Control Horario', path: ROUTES.ATTENDANCE, icon: <Clock size={20} />, roles: [Role.ADMIN, Role.MODERADOR, Role.EMPLEADO] },
  { label: 'Vacaciones', path: ROUTES.VACATIONS, icon: <Palmtree size={20} />, roles: [Role.ADMIN, Role.MODERADOR, Role.EMPLEADO] },
  { label: 'Informes', path: ROUTES.REPORTS, icon: <BarChart3 size={20} />, roles: [Role.ADMIN, Role.MODERADOR] },
  { label: 'Configuración', path: ROUTES.SETTINGS, icon: <Settings size={20} />, roles: [Role.ADMIN] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = user?.role as Role;
  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: 250,
          background: '#1e293b',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          position: sidebarOpen ? 'fixed' : undefined,
          zIndex: 50,
          height: sidebarOpen ? '100vh' : undefined,
        }}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>ILPI Staff</h1>
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: sidebarOpen ? 'block' : 'none' }}>
            <X size={20} />
          </button>
        </div>
        <nav style={{ flex: 1, padding: '12px' }}>
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                color: isActive ? 'white' : '#94a3b8',
                background: isActive ? '#334155' : 'transparent',
                textDecoration: 'none',
                marginBottom: 4,
                fontSize: '0.9rem',
              })}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '12px', borderTop: '1px solid #334155' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 8 }}>
            {user?.email} ({user?.role})
          </div>
          <button
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '10px 12px', borderRadius: 8, border: 'none',
              background: '#dc2626', color: 'white', cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '12px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', background: 'white' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: 16 }}
          >
            <Menu size={24} />
          </button>
          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
            Bienvenido, {user?.email}
          </span>
        </header>
        <main style={{ flex: 1, padding: 24, background: '#f8fafc' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
