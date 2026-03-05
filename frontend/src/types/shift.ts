/**
 * Shift-related TypeScript types and interfaces
 */

export type ShiftType = 'morning' | 'afternoon' | 'night';

export interface ShiftRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  date: Date | string;
  shift_type: ShiftType;
  created_at: string;
  updated_at: string;
}

export interface ShiftCreatePayload {
  employee_id: string;
  date: Date | string;
  shift_type: ShiftType;
}

export interface ShiftUpdatePayload {
  shift_type: ShiftType;
}

export interface ShiftsListResponse {
  shifts: ShiftRecord[];
  total: number;
}

export interface ShiftResponse {
  shift: ShiftRecord;
  warning?: string;
}
