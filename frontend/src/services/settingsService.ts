import apiClient from './apiClient';
import type { AuditLogEntry, PaginatedAuditLog, VacationSettings } from '../types/models';

export async function getVacationSettings(): Promise<VacationSettings> {
  const res = await apiClient.get<VacationSettings>('/settings/vacations');
  return res.data;
}

export async function updateVacationSettings(days: number): Promise<VacationSettings> {
  const res = await apiClient.put<VacationSettings>('/settings/vacations', {
    default_vacation_days: days,
  });
  return res.data;
}

export async function getAuditLog(params?: {
  entity_type?: string;
  entity_id?: string;
  page?: number;
  size?: number;
}): Promise<PaginatedAuditLog> {
  const res = await apiClient.get<PaginatedAuditLog>('/settings/audit-log', { params });
  return res.data;
}

export type { AuditLogEntry };
