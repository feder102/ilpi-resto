// T057: Vacation API service
import apiClient from './apiClient';
import type { VacationRequest, VacationBalance } from '../types/models';
import type { PaginatedResponse } from '../types/api';

export interface VacationListParams {
  status?: string;
  employee_id?: string;
  page?: number;
  size?: number;
}

export interface VacationCreateData {
  employee_id: string;
  start_date: string;
  end_date: string;
}

export async function getVacations(
  params: VacationListParams = {},
): Promise<PaginatedResponse<VacationRequest>> {
  const { data } = await apiClient.get('/vacations', { params });
  return data;
}

export async function createVacation(
  body: VacationCreateData,
): Promise<VacationRequest> {
  const { data } = await apiClient.post('/vacations', body);
  return data;
}

export async function approveVacation(
  id: string,
  version: number,
): Promise<VacationRequest> {
  const { data } = await apiClient.put(`/vacations/${id}/approve`, { version });
  return data;
}

export async function rejectVacation(
  id: string,
  version: number,
): Promise<VacationRequest> {
  const { data } = await apiClient.put(`/vacations/${id}/reject`, { version });
  return data;
}

export async function cancelVacation(
  id: string,
  version: number,
): Promise<VacationRequest> {
  const { data } = await apiClient.put(`/vacations/${id}/cancel`, { version });
  return data;
}

export async function getBalance(
  employeeId: string,
  year?: number,
): Promise<VacationBalance> {
  const params = year ? { year } : {};
  const { data } = await apiClient.get(`/vacations/balance/${employeeId}`, { params });
  return data;
}

// ============================================================================
// EMPLOYEE WORKSPACE PORTAL ENDPOINTS (Feature 005: US3 - Vacation Requests)
// ============================================================================
// All endpoints enforce RLS: only authenticated user's data returned

/**
 * Get current year vacation balance for authenticated employee
 * @param year - Fiscal year (default: current year)
 * @returns VacationBalance with total_days, used_days, remaining_days
 */
export async function getEmployeeVacationBalance(
  year?: number,
): Promise<VacationBalance> {
  const params = year ? { year } : {};
  const { data } = await apiClient.get('/employee/vacation-balance', { params });
  return data;
}

/**
 * List all vacation requests for authenticated employee
 * @param status - Filter by status (Pendiente|Aprobado|Rechazado|Cancelado)
 * @param page - Page number (1-indexed)
 * @param size - Items per page
 * @returns Paginated list of vacation requests
 */
export async function getEmployeeVacationRequests(
  status?: string,
  page: number = 1,
  size: number = 20,
): Promise<PaginatedResponse<VacationRequest>> {
  const params: Record<string, any> = { page, size };
  if (status) params.status = status;
  const { data } = await apiClient.get('/employee/vacation-requests', { params });
  return data;
}

/**
 * Submit new vacation request for authenticated employee
 * CRITICAL VALIDATION: Service layer ensures remaining_days >= requested_days
 * @param startDate - Beginning of vacation (YYYY-MM-DD)
 * @param endDate - End of vacation (YYYY-MM-DD), inclusive
 * @returns Created vacation request
 * @throws 422 if insufficient balance (BalanceExceededError)
 */
export async function createEmployeeVacationRequest(
  startDate: string,
  endDate: string,
): Promise<VacationRequest> {
  const { data } = await apiClient.post('/employee/vacation-requests', {
    start_date: startDate,
    end_date: endDate,
  });
  return data;
}

/**
 * Cancel pending vacation request
 * VALIDATION: Can only cancel if status == "Pendiente"
 * @param requestId - UUID of the vacation request
 * @param version - Current version (for conflict detection)
 * @returns Updated vacation request with status=Cancelado
 * @throws 400 if not Pendiente status
 * @throws 403 if not your request (RLS)
 */
export async function cancelEmployeeVacationRequest(
  requestId: string,
  version: number,
): Promise<VacationRequest> {
  const { data } = await apiClient.put(
    `/employee/vacation-requests/${requestId}/cancel`,
    { version }
  );
  return data;
}
