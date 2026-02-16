
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Clock, 
  ClipboardList, 
  Settings, 
  LogOut,
  Menu,
  X,
  MapPin,
  UtensilsCrossed
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
    { id: 'employees', label: 'Personal', icon: Users },
    { id: 'rotary', label: 'Equipos & Rotary', icon: UtensilsCrossed },
    { id: 'attendance', label: 'Control Horario', icon: Clock },
    { id: 'vacations', label: 'Vacaciones/Bajas', icon: Calendar },
    { id: 'reports', label: 'Reportes', icon: ClipboardList },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex text-slate-800">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
              I
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">ILPI Staff</h1>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin size={10} /> Villa Joyosa, ALC
              </p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${activeTab === item.id 
                      ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
                  `}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
          <button 
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1 lg:flex-none flex items-center px-4">
             <h2 className="text-lg font-semibold text-slate-800 hidden md:block">
               {navItems.find(i => i.id === activeTab)?.label}
             </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">Carlos Administrador</p>
              <p className="text-xs text-slate-500">Administrador General</p>
            </div>
            <img 
              src="https://picsum.photos/seed/admin/40/40" 
              alt="Profile" 
              className="w-10 h-10 rounded-full border-2 border-slate-200"
            />
          </div>
        </header>

        {/* View Port */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
