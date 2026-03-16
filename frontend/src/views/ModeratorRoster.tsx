/**
 * T021: ModeratorRoster - Feature 006 US1 Main View
 *
 * Displays shift roster calendar for moderator's department.
 * Shows all team member shifts with vacation status indicators.
 *
 * Features:
 * - Monthly calendar view (react-big-calendar)
 * - Month/year navigation
 * - Shift color-coding by type (Mañana, Noche)
 * - Vacation status indicators
 * - Error and loading state handling
 */

import { useState } from 'react';
import RosterCalendar from '../components/moderator/RosterCalendar';

export default function ModeratorRoster() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-based
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Navigate to previous month
   */
  const handlePreviousMonth = () => {
    setError(null);
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  /**
   * Navigate to next month
   */
  const handleNextMonth = () => {
    setError(null);
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  /**
   * Navigate to current month
   */
  const handleToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setError(null);
  };

  // Format month/year for display
  const monthName = new Date(year, month - 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-base-content">Roster de Turnos</h1>
        <p className="text-base-content/60">
          Vista de turnos de tu equipo con indicadores de vacaciones
        </p>
      </div>

      {/* Navigation Controls */}
      <div className="mb-6 flex items-center justify-between card bg-base-100 shadow-sm p-4">
        <button
          onClick={handlePreviousMonth}
          className="btn btn-ghost btn-sm"
          disabled={isLoading}
        >
          ← Anterior
        </button>

        <div className="text-center">
          <h2 className="text-xl font-semibold capitalize text-base-content">{monthName}</h2>
          <p className="text-sm text-base-content/40">
            {new Date(year, month - 1, 1).toLocaleDateString('es-ES', {
              weekday: 'long',
            })}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleToday}
            className="btn btn-primary btn-sm"
            disabled={isLoading}
          >
            Hoy
          </button>
          <button
            onClick={handleNextMonth}
            className="btn btn-ghost btn-sm"
            disabled={isLoading}
          >
            Siguiente →
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error mb-6">
          <span className="font-medium">Error</span>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-96 bg-base-200 rounded-lg">
          <div className="text-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="mt-4 text-base-content/60">Cargando roster...</p>
          </div>
        </div>
      )}

      {/* Calendar Component */}
      {!isLoading && (
        <RosterCalendar
          year={year}
          month={month}
          onSetLoading={setIsLoading}
          onSetError={setError}
        />
      )}

      {/* Legend */}
      <div className="mt-8 card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="font-semibold text-sm mb-3 text-base-content">Leyenda</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-warning rounded"></div>
              <span className="text-base-content">Turno Mañana</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-info rounded"></div>
              <span className="text-base-content">Turno Noche</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🏖️</span>
              <span className="text-base-content">Vacaciones Aprobadas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⏳</span>
              <span className="text-base-content">Vacaciones Pendientes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
