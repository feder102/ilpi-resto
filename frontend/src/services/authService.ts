// T039: Auth API service
import apiClient from './apiClient';
import type { LoginResponse } from '../types';

export async function login(email: string, password: string): Promise<LoginResponse> {
  console.log('[AuthService] Attempting login with email:', email);
  try {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    console.log('[AuthService] Login successful, received tokens');
    return data;
  } catch (error) {
    console.error('[AuthService] Login failed:', error);
    throw error;
  }
}

export async function refresh(): Promise<LoginResponse> {
  console.log('[AuthService] Attempting token refresh');
  try {
    const { data } = await apiClient.post<LoginResponse>('/auth/refresh');
    console.log('[AuthService] Token refresh successful');
    return data;
  } catch (error) {
    console.error('[AuthService] Token refresh failed:', error);
    throw error;
  }
}

export async function logout(): Promise<void> {
  console.log('[AuthService] Logging out');
  try {
    await apiClient.post('/auth/logout');
    console.log('[AuthService] Logout successful');
  } catch (error) {
    console.error('[AuthService] Logout error:', error);
    throw error;
  }
}
