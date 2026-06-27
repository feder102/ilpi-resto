/**
 * T056: Shift Types API Client
 */

import apiClient from './apiClient';
import type {
  PaginatedShiftTypes,
  ShiftTypeCreate,
  ShiftTypeResponse,
  ShiftTypeUpdate,
} from '../types/shift-types';

export const shiftTypesApi = {
  /**
   * List shift types with pagination
   */
  async list(page: number = 1, size: number = 20, activeOnly: boolean = true): Promise<PaginatedShiftTypes> {
    const response = await apiClient.get<PaginatedShiftTypes>('/shift-types', {
      params: { page, size, active_only: activeOnly },
    });
    return response.data;
  },

  /**
   * Get single shift type by ID
   */
  async getById(id: string): Promise<ShiftTypeResponse> {
    const response = await apiClient.get<ShiftTypeResponse>(`/shift-types/${id}`);
    return response.data;
  },

  /**
   * Create new shift type
   */
  async create(data: ShiftTypeCreate): Promise<ShiftTypeResponse> {
    const response = await apiClient.post<ShiftTypeResponse>('/shift-types', data);
    return response.data;
  },

  /**
   * Update shift type
   */
  async update(id: string, data: ShiftTypeUpdate): Promise<ShiftTypeResponse> {
    const response = await apiClient.put<ShiftTypeResponse>(`/shift-types/${id}`, data);
    return response.data;
  },

  /**
   * Delete (soft delete) shift type
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/shift-types/${id}`);
  },
};
