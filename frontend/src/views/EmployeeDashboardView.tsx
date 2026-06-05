/**
 * Employee Dashboard - Panel principal del empleado
 * Feature 009: Rediseño consistente con el portal admin + mobile-friendly
 *
 * Muestra métricas reales (StatCards), el widget de fichaje (TimeClock) y
 * accesos rápidos, reutilizando los componentes UI compartidos.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Palmtree, BarChart3, Clock, CalendarCheck, AlertCircle } from 'lucide-react';
import { Card, Button, Alert } from '../components/ui';
import StatCard from '../components/StatCard';
import TimeClock from '../components/time-tracking/TimeClock';
import { useAuth } from '../hooks/useAuth';
import { getEmployeeVacationBalance } from '../services/vacationService';
import apiClient from '../services/apiClient';
import { ROUTES } from '../config/constants';

interface QuickAccessCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  color: string;
}

interface MonthStatistics {
  total_hours: number | string;
  daily_records: Array<{ date: string }>;
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
}

export default function EmployeeDashboardView() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [remainingDays, setRemainingDays] = useState<number | null>(null);
  const [monthHours, setMonthHours] = useState<number | null>(null);
  const [daysWorked, setDaysWorked] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const load = async () => {
      try {
        const [balance, statsResp] = await Promise.all([
          getEmployeeVacationBalance(year),
          apiClient.get<MonthStatistics>(
            `/employee/time-tracking/statistics?year=${year}&month=${month}`,
          ),
        ]);
        setRemainingDays(balance.remaining_days);
        setMonthHours(toNumber(statsResp.data.total_hours));
        setDaysWorked(statsResp.data.daily_records?.length ?? 0);
      } catch {
        setLoadError('No se pudieron cargar algunas métricas. Intenta recargar la página.');
      }
    };
    load();
  }, []);

  const quickAccess: QuickAccessCard[] = [
    {
      id: 'shifts',
      title: 'Mi Calendario de Turnos',
      description: 'Consulta tu horario de trabajo de los próximos meses',
      icon: <Calendar className="w-7 h-7" />,
      route: ROUTES.EMPLOYEE_SHIFTS,
      color: 'text-primary',
    },
    {
      id: 'vacations',
      title: 'Mis Vacaciones',
      description: 'Solicita y revisa el estado de tus vacaciones',
      icon: <Palmtree className="w-7 h-7" />,
      route: ROUTES.EMPLOYEE_VACATIONS,
      color: 'text-warning',
    },
    {
      id: 'stats',
      title: 'Mis Estadísticas',
      description: 'Horas trabajadas y resumen mensual detallado',
      icon: <BarChart3 className="w-7 h-7" />,
      route: '/employee/statistics',
      color: 'text-accent',
    },
  ];

  const formatHours = (h: number | null): string =>
    h === null ? '—' : (h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-base-content">
          Bienvenido, {user?.email?.split('@')[0]}
        </h1>
        <p className="text-base-content/60 mt-1">Tu panel personal de empleado</p>
      </div>

      {loadError && (
        <Alert variant="warning" onClose={() => setLoadError(null)}>
          {loadError}
        </Alert>
      )}

      {/* Métricas reales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Vacaciones disponibles"
          value={remainingDays ?? '—'}
          icon={<Palmtree size={24} />}
          color="yellow"
        />
        <StatCard
          title="Horas este mes"
          value={formatHours(monthHours)}
          icon={<Clock size={24} />}
          color="green"
        />
        <StatCard
          title="Días trabajados"
          value={daysWorked ?? '—'}
          icon={<CalendarCheck size={24} />}
          color="indigo"
        />
        <StatCard
          title="Rol"
          value={user?.role ?? 'Empleado'}
          icon={<BarChart3 size={24} />}
          color="indigo"
        />
      </div>

      {/* Fichaje + accesos rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <TimeClock />
        </div>

        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-base sm:text-lg font-semibold text-base-content">Acceso Rápido</h2>
          {quickAccess.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(item.route)}
            >
              <div className="flex items-start gap-3">
                <div className={`${item.color} mt-0.5`}>{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base-content">{item.title}</h3>
                  <p className="text-sm text-base-content/60 mt-1">{item.description}</p>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(item.route);
                      }}
                    >
                      Ir
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Info de privacidad */}
      <Alert variant="info">
        <AlertCircle size={20} />
        <span>Tu información está protegida y solo es visible para ti y los administradores.</span>
      </Alert>
    </div>
  );
}
