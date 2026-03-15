/**
 * T015: Moderator data hooks - Feature 006
 *
 * Provides custom hooks for common moderator queries:
 * - useDepartmentEmployees(): Get employees in moderator's department
 * - useVacationBalance(): Get vacation balance for employee
 * - useShiftTypes(): Get available shift types for dropdown
 *
 * These hooks manage loading/error states and caching.
 */

import { useState, useEffect } from 'react';
import { moderatorService } from '../services/moderatorService';
import { extractErrorMessage } from '../utils/errorHandler';

/**
 * Hook to fetch department employees for moderator's team.
 *
 * Used for:
 * - Populating employee dropdown in shift assignment form
 * - Listing team members in roster view
 *
 * @returns { employees, isLoading, error, refetch }
 */
export function useDepartmentEmployees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: In Phase 3, implement backend endpoint GET /moderator/department/employees
      // For now, fetch from general employees endpoint
      // const response = await moderatorService.getDepartmentEmployees();
      // setEmployees(response);
      setEmployees([]);
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return { employees, isLoading, error, refetch: fetchEmployees };
}

/**
 * Hook to fetch vacation balance for an employee.
 *
 * Used for:
 * - Showing remaining days in vacation request dialog
 * - Checking if balance sufficient before submission
 *
 * @param employeeId - Employee ID (required)
 * @param year - Year for balance (default: current year)
 * @returns { balance, isLoading, error, refetch }
 */
export function useVacationBalance(employeeId?: string, year?: number) {
  const [balance, setBalance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    if (!employeeId) return;

    setIsLoading(true);
    setError(null);
    try {
      const currentYear = year || new Date().getFullYear();
      // TODO: In Phase 3, implement backend endpoint GET /moderator/vacations/{employee_id}/balance
      // const response = await moderatorService.getVacationBalance(employeeId, currentYear);
      // setBalance(response);
      setBalance(null);
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [employeeId, year]);

  return { balance, isLoading, error, refetch: fetchBalance };
}

/**
 * Hook to fetch available shift types.
 *
 * Used for:
 * - Populating shift type dropdown in assignment form
 * - Showing shift type name in roster calendar
 *
 * Returns cached shift types (fetched once on mount).
 *
 * @returns { shiftTypes, isLoading, error, refetch }
 */
export function useShiftTypes() {
  const [shiftTypes, setShiftTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShiftTypes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: In Phase 3, implement in moderatorService.getShiftTypes()
      // const response = await moderatorService.getShiftTypes();
      // setShiftTypes(response);
      setShiftTypes([]);
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftTypes();
  }, []);

  return { shiftTypes, isLoading, error, refetch: fetchShiftTypes };
}

/**
 * Hook to check if date falls within any approved vacation.
 *
 * Used for:
 * - Client-side pre-validation in shift assignment form
 * - Showing vacation indicator in calendar
 *
 * @param employeeId - Employee ID
 * @param checkDate - Date to check (ISO format YYYY-MM-DD)
 * @returns { isOnVacation, vacationStatus, isLoading }
 */
export function useVacationStatus(employeeId?: string, checkDate?: string) {
  const [isOnVacation, setIsOnVacation] = useState(false);
  const [vacationStatus, setVacationStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!employeeId || !checkDate) {
      setIsOnVacation(false);
      setVacationStatus(null);
      return;
    }

    setIsLoading(true);
    try {
      // TODO: In Phase 3, implement backend endpoint or use cached data
      // Check if date falls within approved vacation
      // For now, assume no vacation
      setIsOnVacation(false);
      setVacationStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, checkDate]);

  return { isOnVacation, vacationStatus, isLoading };
}
