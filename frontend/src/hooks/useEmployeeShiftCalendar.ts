/**
 * useEmployeeShiftCalendar Hook
 *
 * SECURITY: Manages shift calendar state with error handling for:
 * - 401 Unauthorized (session expired, re-authenticate)
 * - 403 Forbidden (no Empleado role, insufficient permissions)
 * - Backend RLS enforcement (only current employee's shifts)
 *
 * This hook enforces the contract: only the authenticated employee's data is fetched.
 */

import { useState, useCallback, useEffect } from 'react';
import { shiftService } from '../services/shiftService';
import type { ShiftRecord } from '../types/models';

export interface UseEmployeeShiftCalendarState {
  shifts: ShiftRecord[];
  loading: boolean;
  error: string;
  currentDate: Date;
}

export interface UseEmployeeShiftCalendarActions {
  goToMonth: (year: number, month: number) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
  retry: () => void;
  clearError: () => void;
}

export function useEmployeeShiftCalendar(
  initialDate?: Date
): UseEmployeeShiftCalendarState & UseEmployeeShiftCalendarActions {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState<Date>(initialDate || new Date());

  // Fetch shifts for current month
  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const data = await shiftService.getEmployeeMonthShifts(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      );

      setShifts(data.shifts || []);
    } catch (err: any) {
      let errorMessage = 'Error al cargar los turnos.';

      if (err.response?.status === 401) {
        errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.';
      } else if (err.response?.status === 403) {
        errorMessage = 'No tienes permiso para ver los turnos. Contacta al administrador.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);

      console.error('[useEmployeeShiftCalendar] Error fetching shifts:', {
        status: err.response?.status,
        message: errorMessage,
        date: currentDate.toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  // Fetch shifts when month changes
  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Navigation helpers
  const goToMonth = useCallback((year: number, month: number) => {
    setCurrentDate(new Date(year, month - 1, 1));
  }, []);

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const retry = useCallback(() => {
    fetchShifts();
  }, [fetchShifts]);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  return {
    shifts,
    loading,
    error,
    currentDate,
    goToMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    retry,
    clearError,
  };
}
