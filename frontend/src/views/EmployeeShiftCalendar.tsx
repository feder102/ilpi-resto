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
import { Calendar, AlertCircle, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // Build calendar grid with shifts mapped to dates
  const calendarDays = useMemo<CalendarDay[]>(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

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
      const dateStr = date.toISOString().split('T')[0];
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

  // Get shift type display info
  const getShiftTypeLabel = (shiftTypeId: string | null): string => {
    if (!shiftTypeId) return 'Sin tipo';
    // Map common shift type IDs to labels (from ShiftType enum)
    const typeMap: Record<string, string> = {
      'morning': 'Mañana',
      'afternoon': 'Tarde',
      'night': 'Noche',
      'morning-shift': 'Mañana',
      'afternoon-shift': 'Tarde',
      'night-shift': 'Noche',
    };
    return typeMap[shiftTypeId] || shiftTypeId;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-slate-900">Tu Calendario de Turnos</h1>
          </div>
          <p className="text-slate-600">
            {user ? `Hola ${user.email}, aquí puedes ver tus turnos asignados` : 'Cargando...'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error al cargar los turnos</p>
              <p className="text-red-800 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Calendar Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Calendar Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6">
            <div className="flex items-center justify-between">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-indigo-500 rounded-lg transition"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>

              <div className="flex flex-col items-center">
                <h2 className="text-2xl font-bold text-white capitalize">{monthYear}</h2>
                <button
                  onClick={goToToday}
                  className="text-sm text-indigo-100 hover:text-white mt-2 underline"
                >
                  Hoy
                </button>
              </div>

              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-indigo-500 rounded-lg transition"
                aria-label="Próximo mes"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Loading Spinner */}
          {loading && (
            <div className="p-12 flex flex-col items-center justify-center">
              <Loader className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-slate-600">Cargando tus turnos...</p>
            </div>
          )}

          {/* Calendar Grid */}
          {!loading && (
            <div className="p-6">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as DayOfWeek[]).map((day) => (
                  <div key={day} className="text-center font-semibold text-slate-600 text-sm py-2">
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
                        ? 'bg-white border-slate-200 hover:border-indigo-300'
                        : 'bg-slate-50 border-slate-100 opacity-50'
                    }`}
                  >
                    <div className="font-semibold text-slate-900 text-sm mb-1">
                      {day.dayOfMonth}
                    </div>

                    {/* Shifts for this day */}
                    <div className="space-y-1">
                      {day.shifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-medium truncate"
                          title={getShiftTypeLabel(shift.shift_type_id)}
                        >
                          {getShiftTypeLabel(shift.shift_type_id)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-slate-600">
            <span className="font-semibold">Nota:</span> Este calendario muestra solo tus turnos asignados.
            Si crees que hay un error, contacta al administrador o moderador.
          </p>
        </div>
      </div>
    </div>
  );
}
