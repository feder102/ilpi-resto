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
