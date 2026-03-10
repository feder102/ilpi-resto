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
import { Calendar, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import type { VacationBalance } from '../../types/models';

interface VacationRequestFormProps {
  balance: VacationBalance | null;
  submitting: boolean;
  onSubmit: (startDate: string, endDate: string) => Promise<void>;
  onError?: (error: string) => void;
}

export default function VacationRequestForm({
  balance,
  submitting,
  onSubmit,
  onError,
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
      setError(`No tienes suficientes días. Disponibles: ${availableDays}, Solicitados: ${requestedDays}`);
      onError?.(error);
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
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Solicitar Vacaciones</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Start Date */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Inicio
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  validateDates(e.target.value, endDate);
                }}
                disabled={!balance || submitting}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            {startDate && isWeekend(startDate) && (
              <p className="text-xs text-red-600 mt-1">✗ Esta fecha cae en fin de semana</p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Fin
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  validateDates(startDate, e.target.value);
                }}
                disabled={!balance || submitting}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                min={startDate || new Date().toISOString().split('T')[0]}
              />
            </div>
            {endDate && isWeekend(endDate) && (
              <p className="text-xs text-red-600 mt-1">✗ Esta fecha cae en fin de semana</p>
            )}
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{validationError}</p>
          </div>
        )}

        {/* Days Summary */}
        {requestedDays > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-600 uppercase font-medium">Días Solicitados</p>
                <p className="text-2xl font-bold text-blue-600">{requestedDays}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase font-medium">Días Disponibles</p>
                <p className={`text-2xl font-bold ${
                  hasEnoughBalance ? 'text-green-600' : 'text-red-600'
                }`}>
                  {availableDays}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase font-medium">Quedarían</p>
                <p className={`text-2xl font-bold ${
                  hasEnoughBalance ? 'text-green-600' : 'text-red-600'
                }`}>
                  {hasEnoughBalance ? availableDays - requestedDays : 0}
                </p>
              </div>
            </div>

            {!hasEnoughBalance && requestedDays > availableDays && (
              <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  No tienes suficientes días. Necesitas {requestedDays - availableDays} más.
                </p>
              </div>
            )}

            {hasEnoughBalance && (
              <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded flex gap-2 items-start">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">
                  ✓ Tienes suficientes días para esta solicitud
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Error en tu solicitud</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!startDate || !endDate || !hasEnoughBalance || submitting || !balance}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && <Loader className="w-4 h-4 animate-spin" />}
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
            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Limpiar
          </button>
        </div>

        {/* Info Text */}
        <p className="text-xs text-gray-500 text-center">
          Los fines de semana están bloqueados. Se cuentan todos los días naturales (incluidos fines de semana).
          <br />
          Tu solicitud será revisada por tu moderador o administrador.
        </p>
      </form>
    </div>
  );
}
