/**
 * Employee Dashboard - Panel principal del empleado
 * Información personal y acceso rápido a funcionalidades
 */

import { useNavigate } from 'react-router-dom';
import { Calendar, BarChart3, AlertCircle } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../config/constants';

interface QuickAccessCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  color: string;
}

export default function EmployeeDashboardView() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const quickAccess: QuickAccessCard[] = [
    {
      id: 'shifts',
      title: 'Mi Calendario de Turnos',
      description: 'Ver tu horario de trabajo de los próximos meses',
      icon: <Calendar className="w-8 h-8" />,
      route: ROUTES.EMPLOYEE_SHIFTS,
      color: 'bg-primary/10 border-primary/30',
    },
    {
      id: 'stats',
      title: 'Mis Estadísticas',
      description: 'Horas trabajadas y resumen mensual',
      icon: <BarChart3 className="w-8 h-8" />,
      route: '/employee/statistics',
      color: 'bg-accent/10 border-accent/30',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Bienvenido, {user?.email?.split('@')[0]}</h1>
        <p className="text-base-content/60 mt-2">Panel personal de empleado</p>
      </div>

      {/* Información Personal */}
      <Card>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Mi Información</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm opacity-60">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm opacity-60">Rol</p>
              <p className="font-medium">Empleado</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Access */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Acceso Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickAccess.map((item) => (
            <div
              key={item.id}
              className={`card ${item.color} border cursor-pointer hover:shadow-lg transition-shadow`}
              onClick={() => navigate(item.route)}
            >
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="card-title text-lg">{item.title}</h3>
                    <p className="text-sm opacity-70 mt-2">{item.description}</p>
                  </div>
                  <div className="text-primary opacity-60">{item.icon}</div>
                </div>
                <div className="card-actions justify-end mt-4">
                  <Button size="sm" variant="primary" onClick={(e) => {
                    e.stopPropagation();
                    navigate(item.route);
                  }}>
                    Ir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="alert alert-info">
        <AlertCircle size={20} />
        <span>Tu información está protegida y solo visible para ti y los administradores del sistema.</span>
      </div>
    </div>
  );
}
