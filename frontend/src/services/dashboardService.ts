// T076: Dashboard API service
import apiClient from './apiClient';
import type {
  DashboardStats,
  HoursByDayItem,
  DepartmentDistItem,
  OvertimeRatio,
  OvertimeRanking,
  Absenteeism,
  VacationLiability,
} from '../types/api';

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

// Feature 015: Personnel metrics (Admin-only)
export type PeriodFilters = Pick<ReportFilters, 'date_from' | 'date_to'>;

export async function getOvertimeRatio(filters: PeriodFilters = {}): Promise<OvertimeRatio> {
  const { data } = await apiClient.get('/reports/overtime-ratio', { params: filters });
  return data;
}

export async function getOvertimeRanking(
  filters: PeriodFilters & { limit?: number } = {},
): Promise<OvertimeRanking> {
  const { data } = await apiClient.get('/reports/overtime-ranking', { params: filters });
  return data;
}

export async function getAbsenteeism(filters: PeriodFilters = {}): Promise<Absenteeism> {
  const { data } = await apiClient.get('/reports/absenteeism', { params: filters });
  return data;
}

export async function getVacationLiability(year?: number): Promise<VacationLiability> {
  const { data } = await apiClient.get('/reports/vacation-liability', {
    params: year !== undefined ? { year } : {},
  });
  return data;
}
