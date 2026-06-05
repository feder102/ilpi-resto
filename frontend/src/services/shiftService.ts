// T070: Shift API service
// Updated: Feature 004 Shift Roster Calendar endpoints added
import apiClient from './apiClient';
import type { ShiftRecord } from '../types/models';
import type { PaginatedResponse } from '../types/api';

export interface ShiftListParams {
  employee_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  size?: number;
}

export async function getShifts(
  params: ShiftListParams = {},
): Promise<PaginatedResponse<ShiftRecord>> {
  const { data } = await apiClient.get('/shifts', { params });
  return data;
}

// ============================================================================
// ROSTER CALENDAR ENDPOINTS (Feature 004)
// ============================================================================

export interface RosterShiftCreateData {
  employee_id: string;
  date: string; // YYYY-MM-DD format
  shift_type_id: string;
}

export interface RosterShiftUpdateData {
  shift_type_id: string;
}

export async function getRosterShifts(
  month: string,
  employeeId?: string,
): Promise<{ shifts: ShiftRecord[]; total: number }> {
  const params: Record<string, string> = { month };
  if (employeeId) {
    params.employee_id = employeeId;
  }
  const { data } = await apiClient.get('/rosters/shifts', { params });
  return data;
}

export async function createRosterShift(body: RosterShiftCreateData): Promise<{ shift: ShiftRecord; warning?: string }> {
  const { data } = await apiClient.post('/rosters/shifts', body);
  return data;
}

export async function updateRosterShift(
  shiftId: string,
  body: RosterShiftUpdateData,
): Promise<ShiftRecord> {
  const { data } = await apiClient.put(`/rosters/shifts/${shiftId}`, body);
  return data;
}

export async function deleteRosterShift(shiftId: string): Promise<void> {
  await apiClient.delete(`/rosters/shifts/${shiftId}`);
}

// ============================================================================
// EMPLOYEE WORKSPACE PORTAL ENDPOINTS (Feature 005)
// ============================================================================
// SECURITY: All endpoints enforced at backend with EmployeeRoute guard + RLS
// - Backend requires: authenticated + Empleado role + is_active=true
// - Backend filters to: only current employee's shifts (emp_id from JWT)
// - No employee_id parameter accepted (would be ignored by backend RLS)

/**
 * Get employee's shifts for a specific month
 *
 * SECURITY: Backend enforces RLS - only returns current employee's shifts
 *
 * @param year - Year (YYYY)
 * @param month - Month (1-12)
 * @returns Shifts assigned to current employee for the month
 * @throws Error if not authenticated as Empleado or is_active=false
 */
export async function getEmployeeMonthShifts(
  year: number,
  month: number,
): Promise<{ shifts: ShiftRecord[]; month: number; year: number }> {
  const { data } = await apiClient.get('/employee/shifts/month', {
    params: { year, month },
  });
  return data;
}

/**
 * Get employee's shift for today
 *
 * SECURITY: Backend enforces RLS - only returns current employee's shift
 *
 * @returns Today's shift or null if no shift assigned
 * @throws Error if not authenticated as Empleado or is_active=false
 */
export async function getEmployeeTodayShift(): Promise<ShiftRecord | null> {
  try {
    const { data } = await apiClient.get('/employee/shifts/today');
    return data || null;
  } catch (error: any) {
    // 404 means no shift today (not an error)
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get employee's upcoming shifts (next 7 days)
 *
 * SECURITY: Backend enforces RLS - only returns current employee's shifts
 *
 * @returns Array of shifts for next 7 days
 * @throws Error if not authenticated as Empleado or is_active=false
 */
export async function getEmployeeUpcomingShifts(): Promise<ShiftRecord[]> {
  const { data } = await apiClient.get('/employee/shifts/upcoming', {
    params: { days: 7 },
  });
  return data.shifts || [];
}

/**
 * Get employee's shifts for a date range
 *
 * SECURITY: Backend enforces RLS - only returns current employee's shifts
 *
 * @param dateFrom - Start date (YYYY-MM-DD)
 * @param dateTo - End date (YYYY-MM-DD)
 * @param page - Page number (default: 1)
 * @param size - Items per page (default: 50)
 * @returns Paginated list of shifts
 * @throws Error if not authenticated as Empleado or is_active=false
 */
export async function getEmployeeShiftRange(
  dateFrom: string,
  dateTo: string,
  page: number = 1,
  size: number = 50,
): Promise<PaginatedResponse<ShiftRecord>> {
  const { data } = await apiClient.get('/employee/shifts', {
    params: {
      date_from: dateFrom,
      date_to: dateTo,
      page,
      size,
    },
  });
  return data;
}

// Service object export for convenience
export const shiftService = {
  getShifts,
  getRosterShifts,
  createRosterShift,
  updateRosterShift,
  deleteRosterShift,
  // Feature 005: Employee Workspace Portal
  getEmployeeMonthShifts,
  getEmployeeTodayShift,
  getEmployeeUpcomingShifts,
  getEmployeeShiftRange,
};
