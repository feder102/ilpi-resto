/**
 * Employee Shift Calendar - Feature 005: Employee Workspace Portal (US2)
 *
 * SECURITY ARCHITECTURE:
 * 1. Frontend: Wrapped in EmployeeRoute component (checks: authenticated + Empleado role + is_active=true)
 * 2. Backend: API endpoint requires require_role_and_active("Empleado") dependency
 * 3. RLS: Service layer filters to only current employee's shifts (emp_id from JWT)
 *
 * This component is ONLY accessible to active employees with properly authenticated sessions.
 * The backend rejects any requests from:
 * - Unauthenticated users (401 Unauthorized)
 * - Users without Empleado role (403 Forbidden)
 * - Users with is_active=false (401 with password setup message)
 * - Cross-employee access attempts (RLS filters at service layer)
 */

import { useState, useEffect, useMemo } from 'react';
import { Calendar, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftService } from '../services/shiftService';
import { useAuth } from '../hooks/useAuth';
import type { ShiftRecord } from '../types/models';

type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  shifts: ShiftRecord[];
}

export default function EmployeeShiftCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch shifts for current month
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await shiftService.getEmployeeMonthShifts(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1
        );
        setShifts(data.shifts || []);
      } catch (err: any) {
        // SECURITY: These errors indicate authentication/authorization issues
        const message = err.response?.data?.error?.message || err.message;

        if (err.response?.status === 401) {
          setError('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
        } else if (err.response?.status === 403) {
          setError('No tienes permiso para ver los turnos. Contacta al administrador.');
        } else {
          setError(message || 'Error al cargar los turnos.');
        }

        console.error('[EmployeeShiftCalendar] Error fetching shifts:', {
          status: err.response?.status,
          message,
          employee_id: user?.employee_id,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchShifts();
  }, [currentDate, user?.employee_id]);

  // Helper: Convert date to local YYYY-MM-DD string (not UTC)
  const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Build calendar grid with shifts mapped to dates
  const calendarDays = useMemo<CalendarDay[]>(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Convert Sunday=0 to Monday=0 (subtract 1, add 7 if negative)
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days: CalendarDay[] = [];

    // Add previous month's days (for grid alignment)
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        dayOfMonth: date.getDate(),
        isCurrentMonth: false,
        shifts: [],
      });
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = toLocalDateString(date);
      const dayShifts = shifts.filter(
        (shift) => shift.date === dateStr
      );

      days.push({
        date,
        dayOfMonth: day,
        isCurrentMonth: true,
        shifts: dayShifts,
      });
    }

    // Add next month's days (for grid alignment)
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        dayOfMonth: date.getDate(),
        isCurrentMonth: false,
        shifts: [],
      });
    }

    return days;
  }, [currentDate, shifts]);

  // Format month/year header
  const monthYear = currentDate.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
  });

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get shift type colors for visual distinction
  const getShiftTypeColor = (shiftTypeName: string | null): string => {
    if (!shiftTypeName) return 'bg-base-200 text-base-content/70';
    const colorMap: Record<string, string> = {
      'Mañana': 'bg-warning/20 text-warning border border-warning/40',
      'Tarde': 'bg-warning/30 text-warning border border-warning/50',
      'Noche': 'bg-info/20 text-info border border-info/40',
      'Cortado': 'bg-secondary/20 text-secondary border border-secondary/40',
      'Corrido': 'bg-accent/20 text-accent border border-accent/40',
    };
    return colorMap[shiftTypeName] || 'bg-primary/20 text-primary border border-primary/40';
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-base-content">Tu Calendario de Turnos</h1>
          </div>
          <p className="text-base-content/60">
            {user ? `Hola ${user.email}, aquí puedes ver tus turnos asignados` : 'Cargando...'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Error al cargar los turnos</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Calendar Card */}
        <div className="card bg-base-100 shadow-lg overflow-hidden">
          {/* Calendar Header */}
          <div className="bg-primary p-6">
            <div className="flex items-center justify-between">
              <button
                onClick={goToPreviousMonth}
                className="btn btn-ghost btn-sm text-primary-content"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="flex flex-col items-center">
                <h2 className="text-2xl font-bold text-primary-content capitalize">{monthYear}</h2>
                <button
                  onClick={goToToday}
                  className="text-sm text-primary-content/70 hover:text-primary-content mt-2 underline"
                >
                  Hoy
                </button>
              </div>

              <button
                onClick={goToNextMonth}
                className="btn btn-ghost btn-sm text-primary-content"
                aria-label="Próximo mes"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Loading Spinner */}
          {loading && (
            <div className="p-12 flex flex-col items-center justify-center">
              <span className="loading loading-spinner loading-lg text-primary mb-3"></span>
              <p className="text-base-content/60">Cargando tus turnos...</p>
            </div>
          )}

          {/* Calendar Grid */}
          {!loading && (
            <div className="card-body">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as DayOfWeek[]).map((day) => (
                  <div key={day} className="text-center font-semibold text-base-content/60 text-sm py-2">
                    {day.substring(0, 3)}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`min-h-24 p-2 rounded-lg border-2 transition ${
                      day.isCurrentMonth
                        ? 'bg-base-100 border-base-300 hover:border-primary/40'
                        : 'bg-base-200 border-base-200 opacity-50'
                    }`}
                  >
                    <div className="font-semibold text-base-content text-sm mb-1">
                      {day.dayOfMonth}
                    </div>

                    {/* Shifts for this day */}
                    <div className="space-y-1">
                      {day.shifts.map((shift) => (
                        <div
                          key={shift.id}
                          className={`text-xs px-2 py-1 rounded font-medium truncate ${getShiftTypeColor(shift.shift_type_name)}`}
                          title={`${shift.shift_type_name || 'Sin tipo'}`}
                        >
                          {shift.shift_type_name || 'Sin tipo'}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Legend - Shift Types */}
        <div className="mt-8">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="text-lg font-bold text-base-content mb-4">Tipos de Turno</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-warning/30 border border-warning rounded"></div>
                  <div className="text-sm">
                    <p className="font-semibold text-base-content">Mañana</p>
                    <p className="text-xs text-base-content/60">10:30 - 18:00</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-warning/50 border border-warning rounded"></div>
                  <div className="text-sm">
                    <p className="font-semibold text-base-content">Tarde</p>
                    <p className="text-xs text-base-content/60">14:00 - 22:00</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-info/30 border border-info rounded"></div>
                  <div className="text-sm">
                    <p className="font-semibold text-base-content">Noche</p>
                    <p className="text-xs text-base-content/60">17:00 - 23:59</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-secondary/30 border border-secondary rounded"></div>
                  <div className="text-sm">
                    <p className="font-semibold text-base-content">Cortado</p>
                    <p className="text-xs text-base-content/60">12:30-16:30 / 18:30-22:30</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-accent/30 border border-accent rounded"></div>
                  <div className="text-sm">
                    <p className="font-semibold text-base-content">Corrido</p>
                    <p className="text-xs text-base-content/60">14:00 - 23:59</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-info/10 border border-info/30 rounded-lg">
                <p className="text-sm text-base-content/60">
                  <span className="font-semibold">Nota:</span> Este calendario muestra solo tus turnos asignados.
                  Si crees que hay un error, contacta al administrador o moderador.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
