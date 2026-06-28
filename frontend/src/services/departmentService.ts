// T024: Department API service — ABM de Departamentos (Feature 014)
import apiClient from './apiClient';
import type { Department } from '../types/models';

export interface DepartmentListParams {
  includeInactive?: boolean;
  search?: string;
}

export interface DepartmentCreatePayload {
  name: string;
  description?: string | null;
  color?: string;
  icon?: string;
}

export interface DepartmentUpdatePayload {
  name?: string;
  description?: string | null;
  color?: string;
  icon?: string;
  is_active?: boolean;
}

export interface DepartmentListResponse {
  items: Department[];
  total: number;
}

export interface DepartmentDeletePreview {
  department: { id: string; name: string; is_system: boolean };
  target_department: { id: string; name: string };
  employees_to_reassign: number;
  teams_to_reassign: number;
}

export interface DepartmentDeleteResult {
  id: string;
  employees_reassigned: number;
  teams_reassigned: number;
  target_department: { id: string; name: string; color: string; icon: string; is_system: boolean };
}

function mapDepartment(raw: Record<string, unknown>): Department {
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: (raw.description as string | null | undefined) ?? null,
    color: raw.color as string,
    icon: raw.icon as string,
    isSystem: raw.is_system as boolean,
    isActive: raw.is_active as boolean,
    employeeCount: raw.employee_count as number | null | undefined,
    teamCount: raw.team_count as number | null | undefined,
  };
}

async function getDepartments(params: DepartmentListParams = {}): Promise<DepartmentListResponse> {
  const query = new URLSearchParams();
  if (params.includeInactive) query.set('include_inactive', 'true');
  if (params.search) query.set('search', params.search);

  const url = `/departments${query.toString() ? `?${query}` : ''}`;
  const res = await apiClient.get<{ items: Record<string, unknown>[]; total: number }>(url);
  return {
    items: res.data.items.map(mapDepartment),
    total: res.data.total,
  };
}

async function getDepartment(id: string): Promise<Department> {
  const res = await apiClient.get<Record<string, unknown>>(`/departments/${id}`);
  return mapDepartment(res.data);
}

async function createDepartment(payload: DepartmentCreatePayload): Promise<Department> {
  const res = await apiClient.post<Record<string, unknown>>('/departments', payload);
  return mapDepartment(res.data);
}

async function updateDepartment(id: string, payload: DepartmentUpdatePayload): Promise<Department> {
  const res = await apiClient.put<Record<string, unknown>>(`/departments/${id}`, payload);
  return mapDepartment(res.data);
}

async function getDeletePreview(id: string): Promise<DepartmentDeletePreview> {
  const res = await apiClient.get<DepartmentDeletePreview>(
    `/departments/${id}/delete-preview`
  );
  return res.data;
}

async function deleteDepartment(id: string): Promise<DepartmentDeleteResult> {
  const res = await apiClient.delete<DepartmentDeleteResult>(`/departments/${id}`);
  return res.data;
}

const departmentService = {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  getDeletePreview,
  deleteDepartment,
};

export default departmentService;
