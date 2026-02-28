/**
 * T056: Shift Types API Client
 */

import axios from 'axios';
import type {
  PaginatedShiftTypes,
  ShiftTypeCreate,
  ShiftTypeResponse,
  ShiftTypeUpdate,
} from '../types/shift-types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const shiftTypesApi = {
  /**
   * List shift types with pagination
   */
  async list(page: number = 1, size: number = 20): Promise<PaginatedShiftTypes> {
    const response = await client.get<PaginatedShiftTypes>('/shift-types', {
      params: { page, size },
    });
    return response.data;
  },

  /**
   * Get single shift type by ID
   */
  async getById(id: string): Promise<ShiftTypeResponse> {
    const response = await client.get<ShiftTypeResponse>(`/shift-types/${id}`);
    return response.data;
  },

  /**
   * Create new shift type
   */
  async create(data: ShiftTypeCreate): Promise<ShiftTypeResponse> {
    const response = await client.post<ShiftTypeResponse>('/shift-types', data);
    return response.data;
  },

  /**
   * Update shift type
   */
  async update(id: string, data: ShiftTypeUpdate): Promise<ShiftTypeResponse> {
    const response = await client.put<ShiftTypeResponse>(`/shift-types/${id}`, data);
    return response.data;
  },

  /**
   * Delete (soft delete) shift type
   */
  async delete(id: string): Promise<void> {
    await client.delete(`/shift-types/${id}`);
  },
};
