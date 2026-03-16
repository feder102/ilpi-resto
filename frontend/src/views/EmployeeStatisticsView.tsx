/**
 * EmployeeStatisticsView - Display Monthly Work Hours and Statistics
 * Feature: Employee Workspace Portal
 *
 * SECURITY ARCHITECTURE:
 * 1. Frontend: Wrapped in EmployeeRoute component (checks: authenticated + Empleado role + is_active=true)
 * 2. Backend: API endpoint requires require_role_and_active("Empleado") dependency
 * 3. RLS: Service layer filters to only current employee's statistics (emp_id from JWT)
 *
 * This component displays:
 * - Total hours worked this month (up to today)
 * - Breakdown by week
 * - Daily records with clock in/out times
 * - Month/year selector for historical viewing
 */

import { useEffect, useState } from 'react';
import { AlertCircle, BarChart3, Calendar, Clock, TrendingUp } from 'lucide-react';
import { Card, Table, Alert, Spinner, Badge } from '../components/ui';
import apiClient from '../services/apiClient';

interface DailyRecord {
  date: string; // YYYY-MM-DD
  entry_time: string | null; // HH:MM or null
  exit_time: string | null; // HH:MM or null
  duration_hours: number | string;
}

interface WeeklyBreakdown {
  week: number;
  hours: number | string;
}

interface StatisticsResponse {
  total_hours: number | string;
  weekly_breakdown: WeeklyBreakdown[];
  daily_records: DailyRecord[];
}

/**
 * Format time string (HH:MM format)
 */
function formatTime(timeStr: string | null): string {
  if (!timeStr) return '—';
  return timeStr;
}

/**
 * Format date to Spanish locale (DD/MM/YYYY)
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format hours number to display format (with 2 decimals if needed)
 */
function formatHours(hours: number | string): string {
  const num = typeof hours === 'string' ? parseFloat(hours) : hours;
  if (isNaN(num)) return '0h';
  return num % 1 === 0 ? `${Math.floor(num)}h` : `${num.toFixed(2)}h`;
}

/**
 * Get current month and year
 */
function getCurrentMonthYear(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

/**
 * Get display name for month
 */
function getMonthName(month: number): string {
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  return months[month - 1] || `Mes ${month}`;
}

/**
 * Get day of week in Spanish
 */
function getDayOfWeek(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  } catch {
    return '—';
  }
}

/**
 * Check if date is today
 */
function isToday(dateStr: string): boolean {
  const today = new Date();
  const date = new Date(dateStr + 'T00:00:00');
  return (
    today.getFullYear() === date.getFullYear() &&
    today.getMonth() === date.getMonth() &&
    today.getDate() === date.getDate()
  );
}

export default function EmployeeStatisticsView() {
  const [data, setData] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(getCurrentMonthYear().year);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear().month);

  /**
   * Fetch statistics for selected month/year
   */
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get<StatisticsResponse>(
          `/employee/time-tracking/statistics?year=${selectedYear}&month=${selectedMonth}`
        );
        setData(response.data);
      } catch (err) {
        console.error('[EmployeeStatisticsView] Error fetching statistics:', err);
        const message =
          err && typeof err === 'object' && 'response' in err
            ? (err as any).response?.data?.error?.message ||
              'No se pudieron cargar las estadísticas'
            : 'Error de conexión';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [selectedYear, selectedMonth]);

  const handleDismissError = () => {
    setError(null);
  };

  /**
   * Get valid month/year combinations (current and past 12 months)
   */
  const monthOptions = (): Array<{ year: number; month: number }> => {
    const options: Array<{ year: number; month: number }> = [];
    const now = getCurrentMonthYear();

    for (let i = 0; i < 12; i++) {
      let month = now.month - i;
      let year = now.year;

      while (month <= 0) {
        month += 12;
        year -= 1;
      }

      options.push({ year, month });
    }

    return options;
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [year, month] = e.target.value.split('-');
    setSelectedYear(parseInt(year, 10));
    setSelectedMonth(parseInt(month, 10));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-base-content mb-2">
            Mis Estadísticas de Trabajo
          </h1>
          <p className="text-lg text-base-content/60 mb-8">
            Consulta tus horas de trabajo y registros diarios
          </p>
          <Spinner size="lg" label="Cargando estadísticas..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-base-content flex items-center gap-2 mb-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            Mis Estadísticas de Trabajo
          </h1>
          <p className="text-lg text-base-content/60">
            Consulta tus horas de trabajo y registros diarios
          </p>
        </div>

        {/* Month/Year Selector */}
        <div className="mb-6 flex items-center gap-4">
          <label className="font-semibold text-base-content">Mes:</label>
          <select
            value={`${selectedYear}-${selectedMonth}`}
            onChange={handleMonthChange}
            className="select select-bordered select-sm w-48"
            aria-label="Seleccionar mes"
          >
            {monthOptions().map((opt) => (
              <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                {getMonthName(opt.month)} {opt.year}
              </option>
            ))}
          </select>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            variant="error"
            title="Error al cargar"
            message={error}
            onClose={handleDismissError}
            className="mb-6 animate-in fade-in"
          />
        )}

        {/* Summary Cards */}
        {!error && data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Hours Card */}
            <Card className="bg-primary/10 border-2 border-primary/30">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-base-content/60">
                    Total de Horas
                  </p>
                  <p className="text-3xl font-bold text-primary mt-1">
                    {formatHours(data.total_hours)}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-primary/60" />
              </div>
              <p className="text-xs text-base-content/50">
                {getMonthName(selectedMonth)} {selectedYear}
              </p>
            </Card>

            {/* Days Worked Card */}
            <Card className="bg-success/10 border-2 border-success/30">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-base-content/60">
                    Días Trabajados
                  </p>
                  <p className="text-3xl font-bold text-success mt-1">
                    {data.daily_records.filter((r) => r.entry_time !== null).length}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-success/60" />
              </div>
              <p className="text-xs text-base-content/50">
                en {getMonthName(selectedMonth)}
              </p>
            </Card>

            {/* Average Hours Card */}
            <Card className="bg-warning/10 border-2 border-warning/30">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-base-content/60">
                    Promedio/Día
                  </p>
                  <p className="text-3xl font-bold text-warning mt-1">
                    {data.daily_records.length > 0
                      ? formatHours(
                          (typeof data.total_hours === 'string'
                            ? parseFloat(data.total_hours)
                            : data.total_hours) /
                            data.daily_records.filter((r) => r.entry_time !== null).length
                        )
                      : '—'}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-warning/60" />
              </div>
              <p className="text-xs text-base-content/50">
                Horas promedio por día
              </p>
            </Card>
          </div>
        )}

        {/* Weekly Breakdown */}
        {!error && data && data.weekly_breakdown.length > 0 && (
          <Card className="mb-8">
            <h2 className="text-xl font-bold text-base-content mb-4">
              Desglose Semanal
            </h2>
            <div className="space-y-3">
              {data.weekly_breakdown.map((week) => (
                <div key={week.week} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                  <div>
                    <p className="font-medium text-base-content">
                      Semana {week.week}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-base-300 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            ((typeof week.hours === 'string'
                              ? parseFloat(week.hours)
                              : week.hours) / 40) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="font-semibold text-primary min-w-12 text-right">
                      {formatHours(week.hours)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Daily Records Table */}
        {!error && data && data.daily_records.length > 0 && (
          <Card className="mb-8">
            <h2 className="text-xl font-bold text-base-content mb-4">
              Registros Diarios
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Table.Head className="font-semibold">Fecha</Table.Head>
                    <Table.Head className="font-semibold">Entrada</Table.Head>
                    <Table.Head className="font-semibold">Salida</Table.Head>
                    <Table.Head className="font-semibold text-right">Horas</Table.Head>
                  </tr>
                </thead>
                <tbody>
                  {data.daily_records.map((record, idx) => {
                    const hasEntry = record.entry_time !== null;
                    const today = isToday(record.date);

                    return (
                      <Table.Row
                        key={`${record.date}-${idx}`}
                        className={`${today ? 'bg-primary/5' : ''} hover:bg-base-200 transition`}
                      >
                        <Table.Cell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-base-content/60">
                              {getDayOfWeek(record.date)}
                            </span>
                            <span className="font-medium text-base-content">
                              {formatDate(record.date)}
                            </span>
                            {today && (
                              <Badge variant="info" className="text-xs">
                                HOY
                              </Badge>
                            )}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <span className={hasEntry ? 'font-medium text-base-content' : 'text-base-content/40'}>
                            {formatTime(record.entry_time)}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className={hasEntry && record.exit_time ? 'font-medium text-base-content' : 'text-base-content/40'}>
                            {formatTime(record.exit_time)}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="text-right">
                          <span
                            className={`font-semibold ${
                              hasEntry
                                ? 'text-success'
                                : 'text-base-content/40'
                            }`}
                          >
                            {formatHours(record.duration_hours)}
                          </span>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!error && data && data.daily_records.length === 0 && (
          <Card className="bg-info/10 border-2 border-info/30 p-8 text-center mb-8">
            <BarChart3 className="w-12 h-12 text-info mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-base-content mb-2">
              Sin registros para este mes
            </h2>
            <p className="text-base-content/60">
              No hay registros de entrada/salida para {getMonthName(selectedMonth)} {selectedYear}.
              Consulta otros meses usando el selector de arriba.
            </p>
          </Card>
        )}

        {/* Info Section */}
        <Card className="bg-info/10 border-2 border-info/30 p-6">
          <h3 className="font-semibold text-info mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Información sobre Estadísticas
          </h3>
          <ul className="space-y-2 text-sm text-base-content/70">
            <li>
              • Las horas totales incluyen todos los registros de entrada y salida del mes
            </li>
            <li>
              • El desglose semanal te muestra el total de horas trabajadas por cada semana
            </li>
            <li>
              • Los registros diarios muestran cada entrada y salida de tu jornada
            </li>
            <li>
              • Puedes consultar estadísticas de los últimos 12 meses
            </li>
            <li>
              • El promedio por día se calcula dividiendo las horas totales entre los días trabajados
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
