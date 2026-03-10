/**
 * ModeratorService - Feature 006 API Client
 *
 * Provides methods for all moderator portal API calls
 * Organized by feature area:
 * - Shift Roster: View team shifts
 * - Vacation Management: Approve/reject requests
 * - Shift Assignment: Create/modify assignments
 * - Reports: Vacation and attendance summaries
 *
 * All methods return typed responses and handle errors
 */

import axios from 'axios';
import type { AxiosInstance } from 'axios';

// API client instance (uses base URL from environment)
const apiClient: AxiosInstance = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/moderator`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ============================================================================
// Shift Roster Methods
// ============================================================================

interface RosterDayDTO {
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

interface RosterDTO {
  year: number;
  month: number;
  department: string;
  shifts: RosterDayDTO[];
}

/**
 * T023: Get shift roster for a specific month
 *
 * Used by ModeratorRoster calendar view to fetch shifts.
 *
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @returns Roster DTO with year, month, department, and shifts array
 */
async function getRoster(year: number, month: number): Promise<RosterDTO> {
  const response = await apiClient.get<RosterDTO>('/roster', {
    params: { year, month },
  });
  return response.data;
}

/**
 * T023: Get shifts for a specific date
 *
 * Used by ModeratorRoster to fetch shifts for a particular day.
 *
 * @param date - Date in YYYY-MM-DD format
 * @returns Array of shifts for that date
 */
async function getShiftsForDate(date: string): Promise<RosterDayDTO[]> {
  const response = await apiClient.get<{ shifts: RosterDayDTO[] }>('/shifts', {
    params: { date },
  });
  return response.data.shifts;
}

// ============================================================================
// Vacation Request Methods (T043-T044)
// ============================================================================

interface VacationRequestDTO {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  start_date: string;
  end_date: string;
  requested_days: number;
  status: string;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

interface VacationDetailDTO {
  id: string;
  employee_id: string;
  employee: {
    name: string;
    department: string;
    hire_date: string;
  };
  start_date: string;
  end_date: string;
  requested_days: number;
  status: string;
  balance: {
    year: number;
    total_days: number;
    used_days: number;
    remaining_days: number;
  };
  created_at: string;
}

interface VacationListResponse {
  requests: VacationRequestDTO[];
  count: number;
  total: number;
}

/**
 * T043: Get pending vacation requests from moderator's department
 *
 * Used by VacationApproval view to fetch list of pending requests.
 *
 * @param status - Optional status filter (Pendiente, Aprobado, Rechazado)
 * @param employeeId - Optional employee filter
 * @param dateFrom - Optional start date filter (YYYY-MM-DD)
 * @param dateTo - Optional end date filter (YYYY-MM-DD)
 * @returns List of vacation requests with count
 */
async function getPendingVacationRequests(
  status?: string,
  employeeId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<VacationListResponse> {
  const response = await apiClient.get<VacationListResponse>('/vacations/pending', {
    params: { status, employee_id: employeeId, date_from: dateFrom, date_to: dateTo },
  });
  return response.data;
}

/**
 * T043: Get details of a specific vacation request
 *
 * Used by VacationRequestDetail modal to show full request info with balance.
 *
 * @param requestId - Vacation request ID
 * @returns Detailed vacation request with employee and balance info
 */
async function getVacationRequestDetails(requestId: string): Promise<VacationDetailDTO> {
  const response = await apiClient.get<VacationDetailDTO>(`/vacations/${requestId}`);
  return response.data;
}

/**
 * T044: Approve a vacation request
 *
 * Used by VacationRequestDetail to approve pending request.
 * Records moderador's user_id and timestamp.
 *
 * @param requestId - Vacation request ID to approve
 * @returns Updated request with approval details
 */
async function approveVacationRequest(requestId: string): Promise<VacationRequestDTO> {
  const response = await apiClient.post<VacationRequestDTO>(
    `/vacations/${requestId}/approve`,
    {}
  );
  return response.data;
}

/**
 * T044: Reject a vacation request with optional reason
 *
 * Used by VacationRequestDetail to reject pending request.
 * Records moderador's user_id, timestamp, and rejection reason.
 *
 * @param requestId - Vacation request ID to reject
 * @param reason - Optional rejection reason
 * @returns Updated request with rejection details
 */
async function rejectVacationRequest(
  requestId: string,
  reason?: string
): Promise<VacationRequestDTO> {
  const response = await apiClient.post<VacationRequestDTO>(
    `/vacations/${requestId}/reject`,
    { reason }
  );
  return response.data;
}

// ============================================================================
// Shift Assignment Methods
// ============================================================================

interface ShiftDTO {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  shift_type_name: string;
  entry_time: string | null;
  exit_time: string | null;
  message: string;
}

/**
 * Assign a shift to an employee
 * May throw error if:
 * - EMPLOYEE_NOT_IN_DEPARTMENT: Employee not in moderator's dept
 * - VACATION_CONFLICT: Employee has approved vacation on that date
 * - SHIFT_EXISTS: Employee already has shift on that date
 */
async function assignShift(
  employeeId: string,
  date: string,
  shiftTypeId: string
): Promise<ShiftDTO> {
  const response = await apiClient.post<ShiftDTO>('/shifts/assign', {
    employee_id: employeeId,
    date,
    shift_type_id: shiftTypeId,
  });
  return response.data;
}

/**
 * Update/replace an existing shift assignment
 */
async function updateShift(shiftId: string, shiftTypeId: string): Promise<ShiftDTO> {
  const response = await apiClient.put<ShiftDTO>(`/shifts/${shiftId}`, {
    shift_type_id: shiftTypeId,
  });
  return response.data;
}

/**
 * Delete a shift assignment
 * Cannot delete if shift has been worked (entry_time set)
 */
async function deleteShift(shiftId: string): Promise<void> {
  await apiClient.delete(`/shifts/${shiftId}`);
}

// ============================================================================
// Reports Methods
// ============================================================================

interface VacationSummaryRowDTO {
  employee_id: string;
  employee_name: string;
  approved_days: number;
  rejected_days: number;
  pending_days: number;
  remaining_days: number;
}

interface VacationSummaryDTO {
  year: number;
  department: string;
  summary: VacationSummaryRowDTO[];
  department_total: {
    approved_days: number;
    rejected_days: number;
    pending_days: number;
  };
}

interface AttendanceRecordDTO {
  employee_id: string;
  employee_name: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  hours_worked: number | null;
  shift_type: string;
}

interface AttendanceReportDTO {
  date_from: string;
  date_to: string;
  department: string;
  records: AttendanceRecordDTO[];
}

/**
 * Get vacation summary for moderator's department
 */
async function getVacationSummary(
  year: number,
  status?: string
): Promise<VacationSummaryDTO> {
  const response = await apiClient.get<VacationSummaryDTO>('/reports/vacations', {
    params: { year, status },
  });
  return response.data;
}

/**
 * Get attendance report for date range
 */
async function getAttendanceReport(
  dateFrom: string,
  dateTo: string
): Promise<AttendanceReportDTO> {
  const response = await apiClient.get<AttendanceReportDTO>('/reports/attendance', {
    params: { date_from: dateFrom, date_to: dateTo },
  });
  return response.data;
}

// ============================================================================
// Export public API
// ============================================================================

export const moderatorService = {
  // Roster
  getRoster,
  getShiftsForDate,
  // Vacations
  getPendingVacationRequests,
  getVacationRequestDetails,
  approveVacationRequest,
  rejectVacationRequest,
  // Shifts
  assignShift,
  updateShift,
  deleteShift,
  // Reports
  getVacationSummary,
  getAttendanceReport,
};
