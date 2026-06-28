// T069: Team API service
import apiClient from './apiClient';
import type { Team } from '../types/models';
import type { PaginatedResponse } from '../types/api';
import type { ShiftTypeResponse } from '../types/shift-types';

export interface TeamListParams {
  department_id?: string;
  page?: number;
  size?: number;
}

export interface TeamCreateData {
  name: string;
  department_id: string;
  shift_type_id: string;
}

export type TeamUpdateData = Partial<TeamCreateData>;

export async function getShiftTypesForTeams(): Promise<ShiftTypeResponse[]> {
  const { data } = await apiClient.get('/shift-types', {
    params: { active_only: true, page: 1, size: 100 },
  });
  return data.items;
}

export async function getTeams(
  params: TeamListParams = {},
): Promise<PaginatedResponse<Team>> {
  const { data } = await apiClient.get('/teams', { params });
  return data;
}

export async function createTeam(body: TeamCreateData): Promise<Team> {
  const { data } = await apiClient.post('/teams', body);
  return data;
}

export async function getTeam(id: string): Promise<Team> {
  const { data } = await apiClient.get(`/teams/${id}`);
  return data;
}

export async function updateTeam(
  id: string,
  body: TeamUpdateData,
): Promise<Team> {
  const { data } = await apiClient.put(`/teams/${id}`, body);
  return data;
}

export async function deleteTeam(id: string): Promise<void> {
  await apiClient.delete(`/teams/${id}`);
}

export async function addMember(
  teamId: string,
  employeeId: string,
): Promise<Team> {
  const { data } = await apiClient.post(`/teams/${teamId}/members`, {
    employee_id: employeeId,
  });
  return data;
}

export async function removeMember(
  teamId: string,
  employeeId: string,
): Promise<Team> {
  const { data } = await apiClient.delete(
    `/teams/${teamId}/members/${employeeId}`,
  );
  return data;
}
