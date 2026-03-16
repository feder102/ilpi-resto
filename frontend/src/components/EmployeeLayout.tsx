import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, BarChart3, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Panel Principal', path: '/employee/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Mi Calendario', path: '/employee/shifts', icon: <Calendar size={20} /> },
  { label: 'Compañeros de Trabajo', path: '/employee/colleagues', icon: <Users size={20} /> },
  { label: 'Mis Estadísticas', path: '/employee/statistics', icon: <BarChart3 size={20} /> },
];

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="drawer lg:drawer-open">
      <input id="employee-sidebar" type="checkbox" className="drawer-toggle" checked={sidebarOpen} onChange={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main content */}
      <div className="drawer-content flex flex-col">
        {/* Navbar */}
        <div className="navbar bg-base-100 border-b border-base-300 lg:hidden">
          <div className="flex-none">
            <label htmlFor="employee-sidebar" className="btn btn-square btn-ghost">
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
        <label htmlFor="employee-sidebar" className="drawer-overlay" onClick={() => setSidebarOpen(false)} />
        <aside className="bg-neutral text-neutral-content w-64 min-h-full flex flex-col">
          <div className="px-5 py-5 border-b border-neutral-content/10 flex justify-between items-center">
            <h1 className="text-xl font-bold">ILPI Staff</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden btn btn-ghost btn-sm btn-circle"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-3 py-3">
            <ul className="menu menu-sm gap-1">
              {NAV_ITEMS.map((item) => (
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
                {user?.email}
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
