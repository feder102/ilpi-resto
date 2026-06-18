/**
 * Shift Roster Calendar View
 *
 * Main page for the shift roster calendar feature (Feature 004).
 * Displays a calendar with all shift assignments for the selected month.
 * Users can navigate months, view shifts, and (if authorized) assign/edit shifts.
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import CalendarGrid from '../components/CalendarGrid';
import ShiftAssignmentDialog from '../components/ShiftAssignmentDialog';
import BulkShiftLoadDialog from '../components/BulkShiftLoadDialog';
import { useShiftCalendar } from '../hooks/useShiftCalendar';
import { Spinner } from '../components/ui';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ShiftRecord } from '../types/models';

interface ShiftRosterCalendarProps {
  // Optional: pre-filter by employee (if employee viewing their own schedule)
  employeeId?: string;
}

export const ShiftRosterCalendar: React.FC<ShiftRosterCalendarProps> = ({ employeeId }) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);

  // Get month/year from current date
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // getMonth returns 0-11, we need 1-12
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  // RBAC: Empleado users only see their own shifts
  const filterEmployeeId =
    user?.role === 'Empleado' ? user?.employee_id || employeeId : employeeId;

  // Fetch shifts for the selected month
  const { shifts, loading, error, refresh } = useShiftCalendar(monthStr, filterEmployeeId);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  // Calendar date selection handler
  const handleDateSelect = (date: Date) => {
    // Only Admin/Moderador can create shifts
    if (user?.role === 'Empleado') {
      return; // Empleado users can't create shifts
    }
    setSelectedDate(date);
    setSelectedShift(null); // Clear any existing shift for editing
    setIsDialogOpen(true);
  };

  // Shift click handler (for editing)
  const handleShiftClick = (shift: ShiftRecord) => {
    // Only Admin/Moderador can edit shifts
    if (user?.role === 'Empleado') {
      return; // Empleado users can't edit shifts
    }
    setSelectedShift(shift);
    // Parse date string in local time (not UTC) to avoid day offset
    const dateStr = shift.date as string;
    const [year, month, day] = dateStr.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    setSelectedDate(localDate);
    setIsDialogOpen(true);
  };

  // Dialog close handler
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedDate(null);
    setSelectedShift(null);
  };

  // Dialog submit handler (will refresh shifts automatically)
  const handleDialogSubmit = async () => {
    handleDialogClose();
    // Refresh the shifts list after creation/update/delete
    await refresh();
  };

  // Bulk dialog submit handler
  const handleBulkDialogSubmit = async () => {
    setIsBulkDialogOpen(false);
    await refresh();
  };

  // Format month header
  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: es });
  const isCurrentMonth =
    new Date().getMonth() === currentDate.getMonth() &&
    new Date().getFullYear() === currentDate.getFullYear();

  // Show loading state
  if (loading && shifts.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-error">Error loading roster</h2>
          <p className="mt-2 text-base-content/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-base-content">Turnos - Calendario</h1>
          <p className="mt-2 text-base-content/60">
            {user?.role === 'Empleado'
              ? 'Vista de tus turnos asignados'
              : 'Planificación de turnos del equipo'}
          </p>
        </div>
        {user?.role !== 'Empleado' && (
          <button
            onClick={() => setIsBulkDialogOpen(true)}
            className="btn btn-primary"
          >
            Carga masiva
          </button>
        )}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between rounded-lg bg-base-100 p-4 shadow-sm">
        <button
          onClick={handlePrevMonth}
          className="btn btn-ghost"
          aria-label="Mes anterior"
        >
          ← Anterior
        </button>
        <h2 className="text-xl font-semibold text-base-content">
          {monthLabel}
          {isCurrentMonth && <span className="ml-2 text-sm text-info">(Actual)</span>}
        </h2>
        <button
          onClick={handleNextMonth}
          className="btn btn-ghost"
          aria-label="Próximo mes"
        >
          Siguiente →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg bg-base-100 p-4 shadow-sm">
        <CalendarGrid
          shifts={shifts}
          currentDate={currentDate}
          onDateSelect={handleDateSelect}
          onShiftClick={handleShiftClick}
          canAssign={user?.role !== 'Empleado'}
        />
      </div>

      {/* Info Card */}
      {user?.role !== 'Empleado' && (
        <div className="rounded-lg bg-info/10 p-4 text-sm text-info-content">
          <p>
            Haz clic en un día del calendario para asignar un turno. Haz clic en un turno
            existente para editarlo o eliminarlo.
          </p>
        </div>
      )}

      {/* Shift Assignment Dialog */}
      <ShiftAssignmentDialog
        isOpen={isDialogOpen}
        selectedDate={selectedDate}
        selectedShift={selectedShift}
        onClose={handleDialogClose}
        onSubmit={handleDialogSubmit}
      />

      {/* Bulk Shift Load Dialog */}
      {user?.role !== 'Empleado' && (
        <BulkShiftLoadDialog
          isOpen={isBulkDialogOpen}
          onClose={() => setIsBulkDialogOpen(false)}
          onSubmit={handleBulkDialogSubmit}
        />
      )}

      {/* Stats Footer */}
      <div className="rounded-lg bg-base-200 p-4">
        <p className="text-sm text-base-content/60">
          Total de turnos en {monthLabel}: <span className="font-bold">{shifts.length}</span>
        </p>
      </div>
    </div>
  );
};

export default ShiftRosterCalendar;
