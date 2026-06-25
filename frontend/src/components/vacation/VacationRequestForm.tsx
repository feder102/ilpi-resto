/**
 * VacationRequestForm - Submit New Vacation Request
 * Feature 005: Employee Workspace Portal (US3)
 *
 * Features:
 * - Date picker blocking weekends
 * - Displays total days requested before submission
 * - Validates against available balance
 * - Shows friendly error messages (e.g., "Saldo insuficiente")
 */

import { useState, useCallback } from 'react';
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import type { VacationBalance } from '../../types/models';

interface VacationRequestFormProps {
  balance: VacationBalance | null;
  submitting: boolean;
  onSubmit: (startDate: string, endDate: string) => Promise<void>;
  onError?: (error: string) => void;
  serverDateError?: string | null;
}

export default function VacationRequestForm({
  balance,
  submitting,
  onSubmit,
  onError,
  serverDateError,
}: VacationRequestFormProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  // Calculate number of days (excluding weekends)
  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;

    const startD = new Date(start);
    const endD = new Date(end);

    if (startD > endD) return 0;

    let count = 0;
    let current = new Date(startD);

    while (current <= endD) {
      // Count all days (naturales, including weekends)
      count++;
      current.setDate(current.getDate() + 1);
    }

    return count;
  };

  // Check if date is a weekend
  const isWeekend = (dateStr: string): boolean => {
    // Parse date in local timezone (not UTC)
    // Format: YYYY-MM-DD
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0=Sunday, 6=Saturday
  };

  // Validate dates
  const validateDates = useCallback((start: string, end: string): boolean => {
    setValidationError('');

    if (!start || !end) {
      return true; // Not yet filled
    }

    const startD = new Date(start);
    const endD = new Date(end);

    // Check if start is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startD < today) {
      setValidationError('La fecha de inicio no puede ser en el pasado');
      return false;
    }

    // Check if end is before start
    if (endD < startD) {
      setValidationError('La fecha de fin debe ser posterior a la de inicio');
      return false;
    }

    // Check if either date is weekend
    if (isWeekend(start)) {
      setValidationError('La fecha de inicio no puede caer en un fin de semana');
      return false;
    }

    if (isWeekend(end)) {
      setValidationError('La fecha de fin no puede caer en un fin de semana');
      return false;
    }

    return true;
  }, []);

  const requestedDays = calculateDays(startDate, endDate);
  const availableDays = balance?.remaining_days || 0;
  const hasEnoughBalance = requestedDays > 0 && requestedDays <= availableDays;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateDates(startDate, endDate)) {
      return;
    }

    if (requestedDays === 0) {
      setError('Selecciona fechas válidas para tu solicitud');
      return;
    }

    if (requestedDays > availableDays) {
      const message = `No tienes suficientes días. Disponibles: ${availableDays}, Solicitados: ${requestedDays}`;
      setError(message);
      onError?.(message);
      return;
    }

    try {
      await onSubmit(startDate, endDate);
      // Clear form on success
      setStartDate('');
      setEndDate('');
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Error al enviar la solicitud';
      setError(message);
      onError?.(message);
    }
  };

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title text-2xl">Solicitar Vacaciones</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Start Date */}
            <div className="flex flex-col gap-1">
              <label htmlFor="startDate" className="text-sm font-medium text-base-content">Fecha de Inicio</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-base-content/40 pointer-events-none" />
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    validateDates(e.target.value, endDate);
                  }}
                  disabled={!balance || submitting}
                  className="input input-bordered w-full pl-10"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              {startDate && isWeekend(startDate) && (
                <p className="text-xs text-error mt-1">Esta fecha cae en fin de semana</p>
              )}
              {serverDateError && (
                <p className="text-error text-xs mt-1">{serverDateError}</p>
              )}
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1">
              <label htmlFor="endDate" className="text-sm font-medium text-base-content">Fecha de Fin</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-base-content/40 pointer-events-none" />
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    validateDates(startDate, e.target.value);
                  }}
                  disabled={!balance || submitting}
                  className="input input-bordered w-full pl-10"
                  min={startDate || new Date().toISOString().split('T')[0]}
                />
              </div>
              {endDate && isWeekend(endDate) && (
                <p className="text-xs text-error mt-1">Esta fecha cae en fin de semana</p>
              )}
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div role="alert" className="alert alert-error">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Days Summary */}
          {requestedDays > 0 && (
            <div className="bg-info/10 border border-info/30 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-base-content/60 uppercase font-medium">Días Solicitados</p>
                  <p className="text-2xl font-bold text-info">{requestedDays}</p>
                </div>
                <div>
                  <p className="text-xs text-base-content/60 uppercase font-medium">Días Disponibles</p>
                  <p className={`text-2xl font-bold ${
                    hasEnoughBalance ? 'text-success' : 'text-error'
                  }`}>
                    {availableDays}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-base-content/60 uppercase font-medium">Quedarían</p>
                  <p className={`text-2xl font-bold ${
                    hasEnoughBalance ? 'text-success' : 'text-error'
                  }`}>
                    {hasEnoughBalance ? availableDays - requestedDays : 0}
                  </p>
                </div>
              </div>

              {!hasEnoughBalance && requestedDays > availableDays && (
                <div role="alert" className="alert alert-error mt-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">
                    No tienes suficientes días. Necesitas {requestedDays - availableDays} más.
                  </span>
                </div>
              )}

              {hasEnoughBalance && (
                <div role="alert" className="alert alert-success mt-3">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">Tienes suficientes días para esta solicitud</span>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div role="alert" className="alert alert-error">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error en tu solicitud</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!startDate || !endDate || !hasEnoughBalance || submitting || !balance}
              className="btn btn-primary flex-1"
            >
              {submitting && <span className="loading loading-spinner loading-sm"></span>}
              {submitting ? 'Enviando...' : 'Solicitar Vacaciones'}
            </button>
            <button
              type="reset"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setError('');
                setValidationError('');
              }}
              className="btn btn-secondary btn-outline"
            >
              Limpiar
            </button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-base-content/60 text-center">
            Los fines de semana están bloqueados. Se cuentan todos los días naturales (incluidos fines de semana).
            <br />
            Tu solicitud será revisada por tu moderador o administrador.
          </p>
        </form>
      </div>
    </div>
  );
}
