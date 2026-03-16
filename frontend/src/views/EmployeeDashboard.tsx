/**
 * Employee Dashboard for Feature 005: Employee Workspace Portal
 *
 * Main employee portal showing:
 * - Personal information
 * - Today's shift status
 * - Vacation balance summary
 * - Quick access to 3 main modules: Shifts, Vacations, Time Tracking
 */

import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, PalmtreeIcon, LogOut } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../config/constants';
import TimeClock from '../components/time-tracking/TimeClock';

interface DashboardModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  color: string;
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const modules: DashboardModule[] = [
    {
      id: 'shifts',
      title: 'Mi Calendario de Turnos',
      description: 'Ver tu horario de trabajo de los próximos meses',
      icon: <Calendar className="w-8 h-8" />,
      route: ROUTES.EMPLOYEE_SHIFTS,
      color: 'bg-info/10 border-info/30',
    },
    {
      id: 'vacations',
      title: 'Solicitar Vacaciones',
      description: 'Solicitar tiempo libre y ver el estado de tus peticiones',
      icon: <PalmtreeIcon className="w-8 h-8" />,
      route: ROUTES.EMPLOYEE_VACATIONS,
      color: 'bg-success/10 border-success/30',
    },
    {
      id: 'time-tracking',
      title: 'Control de Fichaje',
      description: 'Registra entrada y salida de tu jornada laboral',
      icon: <Clock className="w-8 h-8" />,
      route: ROUTES.EMPLOYEE_TIME_TRACKING,
      color: 'bg-warning/10 border-warning/30',
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-base-100 shadow-sm border-b border-base-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-base-content">
                Bienvenido, {user?.email?.split('@')[0] || 'Empleado'}
              </h1>
              <p className="text-sm text-base-content/60 mt-1">
                {user?.email}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-info/10 border-info/30 p-4">
            <div className="text-center">
              <p className="text-sm text-base-content/60 mb-1">Estado Actual</p>
              <p className="text-lg sm:text-xl font-semibold text-info">
                Sin Turno Hoy
              </p>
            </div>
          </Card>
          <Card className="bg-success/10 border-success/30 p-4">
            <div className="text-center">
              <p className="text-sm text-base-content/60 mb-1">Vacaciones Disponibles</p>
              <p className="text-lg sm:text-xl font-semibold text-success">
                22 días
              </p>
            </div>
          </Card>
          <Card className="bg-warning/10 border-warning/30 p-4">
            <div className="text-center">
              <p className="text-sm text-base-content/60 mb-1">Horas Esta Semana</p>
              <p className="text-lg sm:text-xl font-semibold text-warning">
                0 h
              </p>
            </div>
          </Card>
        </div>

        {/* Time Clock Widget - Feature 005: US4 Clock In/Out */}
        <div className="mb-8">
          <TimeClock />
        </div>

        {/* Modules Grid */}
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-base-content mb-4 sm:mb-6">
            Mis Opciones
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {modules.map((module) => (
              <Card
                key={module.id}
                className={`${module.color} border-2 p-6 sm:p-8 cursor-pointer transition-all hover:shadow-lg hover:scale-105`}
                onClick={() => navigate(module.route)}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="text-primary">
                    {module.icon}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-base-content mb-2">
                      {module.title}
                    </h3>
                    <p className="text-sm text-base-content/60">
                      {module.description}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(module.route);
                    }}
                    className="mt-4 w-full sm:w-auto"
                  >
                    Acceder
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Help Section */}
        <Card className="bg-info/10 border-2 border-info/30 p-6">
          <h3 className="text-lg font-semibold text-base-content mb-3">
            ¿Necesitas ayuda?
          </h3>
          <p className="text-base-content/60 mb-4">
            Usa los módulos arriba para:
          </p>
          <ul className="space-y-2 text-sm text-base-content/60">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span><strong>Mi Calendario de Turnos:</strong> Ver tus turnos programados</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span><strong>Solicitar Vacaciones:</strong> Solicitar días libres y ver el estado</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span><strong>Control de Fichaje:</strong> Registrar tu entrada y salida diariamente</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
