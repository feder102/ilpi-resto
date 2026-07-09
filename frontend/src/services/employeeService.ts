// T048: Employee API service
import apiClient from './apiClient';
import type { Employee } from '../types/models';
import type { PaginatedResponse } from '../types/api';

export interface EmployeeCreateData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  dni: string;
  passport?: string | null;
  address?: string | null;
  birth_date?: string | null;
  marital_status?: string | null;
  gender?: string | null;
  role: string;
  department_id: string;
  hire_date: string;
  profile_image?: string | null;
  emergency_contact?: string | null;
}

export type EmployeeUpdateData = Partial<EmployeeCreateData> & {
  status?: string;
  custom_vacation_days?: number | null;
};

export interface EmployeeListParams {
  search?: string;
  department_id?: string;
  include_inactive?: boolean;
  page?: number;
  size?: number;
}

export async function getEmployees(
  params: EmployeeListParams = {},
): Promise<PaginatedResponse<Employee>> {
  const { data } = await apiClient.get('/employees', { params });
  return data;
}

export async function createEmployee(
  employee: EmployeeCreateData,
): Promise<Employee> {
  const { data } = await apiClient.post('/employees', employee);
  return data;
}

export async function getEmployee(id: string): Promise<Employee> {
  const { data } = await apiClient.get(`/employees/${id}`);
  return data;
}

export async function updateEmployee(
  id: string,
  employee: EmployeeUpdateData,
): Promise<Employee> {
  const { data } = await apiClient.put(`/employees/${id}`, employee);
  return data;
}

export async function deleteEmployee(id: string): Promise<void> {
  await apiClient.delete(`/employees/${id}`);
}

export async function reactivateEmployee(id: string): Promise<Employee> {
  const { data } = await apiClient.post(`/employees/${id}/activate`);
  return data;
}
