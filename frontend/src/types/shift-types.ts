/**
 * T057: TypeScript types for Shift Types API
 */

export interface TimeWindow {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface ShiftType {
  id: string; // UUID
  name: string;
  time_windows: TimeWindow[];
  expected_hours: number;
  total_hours: number;
  uses_dynamic_close: boolean;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftTypeCreate {
  name: string;
  time_windows: TimeWindow[];
  expected_hours: number;
  uses_dynamic_close: boolean;
  description?: string;
}

export interface ShiftTypeUpdate {
  name?: string;
  time_windows?: TimeWindow[];
  expected_hours?: number;
  uses_dynamic_close?: boolean;
  description?: string;
}

export interface ShiftTypeResponse {
  id: string;
  name: string;
  time_windows: TimeWindow[];
  expected_hours: number;
  total_hours: number;
  uses_dynamic_close: boolean;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedShiftTypes {
  items: ShiftTypeResponse[];
  total: number;
  page: number;
  pages: number;
  size: number;
}
