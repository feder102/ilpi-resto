// T070: Shift API service
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
