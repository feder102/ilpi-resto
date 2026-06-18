/**
 * Shift-related TypeScript types and interfaces
 */

export interface ShiftType {
  id: string;
  name: string;
  type: string;
  expected_hours: number;
  is_active: boolean;
}

export interface ShiftRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  date: Date | string;
  shift_type_id: string;
  shift_type_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftCreatePayload {
  employee_id: string;
  date: string;
  shift_type_id: string;
}

export interface ShiftUpdatePayload {
  shift_type_id: string;
}

export interface ShiftsListResponse {
  shifts: ShiftRecord[];
  total: number;
}

export interface ShiftResponse {
  shift: ShiftRecord;
  warning?: string;
}

// ============================================================================
// BULK SHIFT LOADING (Feature 011: Carga masiva de turnos)
// ============================================================================

export interface BulkShiftCreatePayload {
  employee_ids: string[];
  shift_type_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  include_weekends: boolean; // true = todos los días; false = solo Lun-Vie
}

export interface BulkShiftSkipped {
  employee_id: string;
  employee_name?: string;
  date: string;
  reason: string;
}

export interface BulkShiftResult {
  created: ShiftRecord[];
  skipped: BulkShiftSkipped[];
  created_count: number;
  skipped_count: number;
}
