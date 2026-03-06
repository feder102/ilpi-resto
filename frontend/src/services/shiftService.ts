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

export interface ClockInData {
  employee_id: string;
  location_lat?: number | null;
  location_lng?: number | null;
  task_label?: string | null;
}

export interface ClockOutData {
  location_lat?: number | null;
  location_lng?: number | null;
}

export async function getShifts(
  params: ShiftListParams = {},
): Promise<PaginatedResponse<ShiftRecord>> {
  const { data } = await apiClient.get('/shifts', { params });
  return data;
}

export async function clockIn(body: ClockInData): Promise<ShiftRecord> {
  const { data } = await apiClient.post('/shifts/clock-in', body);
  return data;
}

export async function clockOut(
  id: string,
  body: ClockOutData = {},
): Promise<ShiftRecord> {
  const { data } = await apiClient.post(`/shifts/${id}/clock-out`, body);
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

// Service object export for convenience
export const shiftService = {
  getShifts,
  clockIn,
  clockOut,
  getRosterShifts,
  createRosterShift,
  updateRosterShift,
  deleteRosterShift,
};
