// T076: Dashboard API service
import apiClient from './apiClient';
import type { DashboardStats, HoursByDayItem, DepartmentDistItem } from '../types/api';

export async function getStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get('/dashboard/stats');
  return data;
}

export interface ReportFilters {
  date_from?: string;
  date_to?: string;
  department?: string;
}

export async function getHoursByDay(filters: ReportFilters = {}): Promise<HoursByDayItem[]> {
  const { data } = await apiClient.get('/reports/hours-by-day', { params: filters });
  return data;
}

export async function getDepartmentDistribution(
  filters: Pick<ReportFilters, 'department'> = {},
): Promise<DepartmentDistItem[]> {
  const { data } = await apiClient.get('/reports/department-distribution', { params: filters });
  return data;
}
