/**
 * T022: RosterCalendar - Feature 006 US1 Calendar Component
 *
 * Displays shift roster in a monthly calendar view using react-big-calendar.
 * Shows all team member shifts with vacation status indicators.
 *
 * Features:
 * - Monthly grid layout (react-big-calendar format)
 * - Shift color-coding by type
 * - Vacation status badges
 * - Responsive grid layout
 * - Loading and error state handling
 */

import { useEffect, useState } from 'react';
import { moderatorService } from '../../services/moderatorService';
import { extractErrorMessage } from '../../utils/errorHandler';

interface RosterDay {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  shift_type_id: string;
  shift_type_name: string;
  entry_time: string | null;
  exit_time: string | null;
  vacation_status: string | null;
}

interface RosterCalendarProps {
  year: number;
  month: number;
  onSetLoading: (loading: boolean) => void;
  onSetError: (error: string | null) => void;
}

/**
 * Get shift color based on shift type name
 */
function getShiftColor(shiftTypeName: string): string {
  if (shiftTypeName?.toLowerCase().includes('mañana')) {
    return 'bg-warning text-warning-content';
  }
  if (shiftTypeName?.toLowerCase().includes('noche')) {
    return 'bg-info text-info-content';
  }
  return 'bg-neutral text-neutral-content';
}

/**
 * Get vacation status icon and color
 */
function getVacationIcon(status: string | null): string {
  if (status === 'Aprobado') return '🏖️';
  if (status === 'Pendiente') return '⏳';
  if (status === 'Rechazado') return '❌';
  return '';
}

/**
 * T022: RosterCalendar component
 *
 * Renders monthly calendar with shifts and vacation indicators.
 */
export default function RosterCalendar({
  year,
  month,
  onSetLoading,
  onSetError,
}: RosterCalendarProps) {
  const [shifts, setShifts] = useState<RosterDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetch roster data for the selected month
   */
  useEffect(() => {
    const fetchRoster = async () => {
      setIsLoading(true);
      onSetLoading(true);
      onSetError(null);

      try {
        // Call backend: GET /moderator/roster?year=YYYY&month=MM
        const response = await moderatorService.getRoster(year, month);
        setShifts(response.shifts);
      } catch (err) {
        const errorMessage = extractErrorMessage(err);
        onSetError(errorMessage);
        setShifts([]);
      } finally {
        setIsLoading(false);
        onSetLoading(false);
      }
    };

    fetchRoster();
  }, [year, month, onSetLoading, onSetError]);

  /**
   * Generate calendar days for the month
   */
  const getDaysInMonth = () => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  /**
   * Get shifts for a specific day
   */
  const getShiftsForDay = (day: number): RosterDay[] => {
    if (!day) return [];
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return shifts.filter(s => s.date === dateStr);
  };

  const days = getDaysInMonth();
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="card bg-base-100 shadow-sm overflow-hidden">
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0 border border-base-300">
        {/* Day headers */}
        {dayNames.map(dayName => (
          <div
            key={dayName}
            className="bg-base-200 p-3 text-center font-semibold text-sm border-r border-b border-base-300"
          >
            {dayName}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day, idx) => (
          <div
            key={`day-${idx}`}
            className={`min-h-32 p-2 border-r border-b border-base-300 ${
              day ? 'bg-base-100' : 'bg-base-200'
            }`}
          >
            {day && (
              <div>
                {/* Day number */}
                <div className="text-right mb-1">
                  <span className="text-sm font-semibold text-base-content">{day}</span>
                </div>

                {/* Shifts for this day */}
                <div className="space-y-1">
                  {getShiftsForDay(day).map(shift => (
                    <div key={shift.id} className="text-xs">
                      {/* Vacation indicator */}
                      {shift.vacation_status && (
                        <div className="mb-1 text-center">
                          {getVacationIcon(shift.vacation_status)}
                        </div>
                      )}

                      {/* Shift badge */}
                      <div
                        className={`${getShiftColor(
                          shift.shift_type_name
                        )} px-2 py-1 rounded text-xs font-medium truncate cursor-pointer hover:shadow transition`}
                        title={`${shift.employee_name} - ${shift.shift_type_name}`}
                      >
                        {shift.shift_type_name}
                      </div>

                      {/* Employee name (truncated) */}
                      <div className="text-base-content/60 px-1 mt-1 text-xs truncate">
                        {shift.employee_name.split(' ')[0]}
                      </div>

                      {/* Clock times if available */}
                      {(shift.entry_time || shift.exit_time) && (
                        <div className="text-base-content/60 text-xs px-1">
                          {shift.entry_time && (
                            <span>
                              {new Date(`2000-01-01T${shift.entry_time}`).toLocaleTimeString(
                                'es-ES',
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {shifts.length === 0 && !isLoading && (
        <div className="p-12 text-center">
          <p className="text-base-content/60">No hay turnos asignados para este mes</p>
        </div>
      )}
    </div>
  );
}
