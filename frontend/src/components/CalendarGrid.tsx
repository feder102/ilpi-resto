/**
 * Calendar Grid Component
 *
 * Renders a month view calendar displaying shift assignments.
 * - Shows all days of the selected month
 * - Displays employee names and shift types in each day cell
 * - Supports clicking dates to assign shifts and clicking shifts to edit
 */

import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import type { ShiftRecord } from '../types/models';

interface CalendarGridProps {
  shifts: ShiftRecord[];
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  onShiftClick: (shift: ShiftRecord) => void;
  canAssign: boolean;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  shifts,
  currentDate,
  onDateSelect,
  onShiftClick,
  canAssign,
}) => {
  // Get all days in the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group shifts by date for quick lookup
  const shiftsByDate = useMemo(() => {
    const grouped: Record<string, ShiftRecord[]> = {};
    shifts.forEach((shift) => {
      // shift.date is already a string in YYYY-MM-DD format from API
      const dateKey = typeof shift.date === 'string' ? shift.date : format(new Date(shift.date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(shift);
    });
    return grouped;
  }, [shifts]);

  // Get weekday headers (starting with Monday)
  const weekDayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Get starting day offset (0 = Sunday, 1 = Monday, etc.)
  // We want Monday = 0, so adjust accordingly
  const startDay = getDay(monthStart);
  const adjustedStartDay = startDay === 0 ? 6 : startDay - 1;

  // Get shift color by type name
  const getShiftColor = (shiftTypeName: string | undefined) => {
    const name = shiftTypeName?.toLowerCase() || '';
    if (name.includes('mañana')) return 'bg-blue-100 text-blue-900';
    if (name.includes('tarde')) return 'bg-yellow-100 text-yellow-900';
    if (name.includes('noche')) return 'bg-purple-100 text-purple-900';
    return 'bg-gray-100 text-gray-900';
  };

  const getShiftLabel = (shiftTypeName: string | undefined) => {
    return shiftTypeName || 'Turno';
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isInPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="w-full">
      {/* Weekday Headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {weekDayLabels.map((label) => (
          <div
            key={label}
            className="bg-gray-200 py-2 text-center font-semibold text-gray-900"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: adjustedStartDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Days of month */}
        {daysInMonth.map((date) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const dayShifts = shiftsByDate[dateKey] || [];
          const isPast = isInPast(date);
          const today = isToday(date);

          return (
            <div
              key={dateKey}
              onClick={() => !isPast && canAssign && onDateSelect(date)}
              className={`aspect-square rounded-lg border-2 p-2 transition-all ${
                today ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
              } ${
                !isPast && canAssign ? 'cursor-pointer hover:border-blue-400 hover:shadow-md' : ''
              } ${isPast ? 'bg-gray-50' : ''} overflow-hidden flex flex-col`}
            >
              {/* Date number */}
              <div
                className={`text-sm font-bold ${
                  today ? 'text-blue-600' : isPast ? 'text-gray-400' : 'text-gray-900'
                }`}
              >
                {format(date, 'd')}
              </div>

              {/* Shifts for this day */}
              <div className="mt-1 flex-1 overflow-y-auto space-y-1">
                {dayShifts.slice(0, 2).map((shift) => (
                  <div
                    key={shift.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onShiftClick(shift);
                    }}
                    className={`rounded px-1 py-0.5 text-xs font-medium cursor-pointer hover:shadow-sm ${getShiftColor(shift.shift_type_name)}`}
                  >
                    <div className="font-bold truncate">{shift.employee_name?.split(' ')[0]}</div>
                    <div className="text-xs">{getShiftLabel(shift.shift_type_name)}</div>
                  </div>
                ))}
                {dayShifts.length > 2 && (
                  <div className="px-1 py-0.5 text-xs font-medium text-gray-600">
                    +{dayShifts.length - 2} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 rounded-lg bg-gray-50 p-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-blue-100" />
          <span>Mañana</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-yellow-100" />
          <span>Tarde</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-purple-100" />
          <span>Noche</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
