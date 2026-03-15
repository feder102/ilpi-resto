/**
 * useShiftCalendar Hook
 *
 * Custom React hook for managing shift roster calendar state.
 * Fetches shifts for a given month and handles loading/error states.
 */

import { useState, useEffect, useCallback } from 'react';
import { shiftService } from '../services/shiftService';
import type { ShiftRecord } from '../types/shift';

interface UseShiftCalendarReturn {
  shifts: ShiftRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and manage shifts for a calendar month.
 *
 * @param monthStr - Month string in format 'YYYY-MM' (e.g., '2026-03')
 * @param employeeId - Optional employee ID to filter shifts
 * @returns Object with shifts array, loading state, error state, and refresh function
 */
export function useShiftCalendar(
  monthStr: string,
  employeeId?: string
): UseShiftCalendarReturn {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await shiftService.getRosterShifts(monthStr, employeeId);
      setShifts(data.shifts || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading shifts';
      setError(errorMessage);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [monthStr, employeeId]);

  // Fetch shifts when month or employee filter changes
  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Return object with shifts and helper functions
  return {
    shifts,
    loading,
    error,
    refresh: fetchShifts,
  };
}

export default useShiftCalendar;
