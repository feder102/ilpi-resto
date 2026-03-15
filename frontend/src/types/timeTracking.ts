/**
 * TypeScript interfaces for Feature 008: Automatic Time Tracking
 * Used by statistics service and admin components
 */

export const TimeEntrySourceEnum = {
  SHIFT: "shift",
  MANUAL: "manual",
} as const;

export type TimeEntrySourceEnum = typeof TimeEntrySourceEnum[keyof typeof TimeEntrySourceEnum];

export interface TimeEntry {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  employee_dni: string;
  shift_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  hours_worked: number;
  source: TimeEntrySourceEnum;
  shift_record_id?: string;
  shift_type_id?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeStatistics {
  employee_id: string;
  period: string; // YYYY-MM
  total_hours: number;
  days_worked: number;
  avg_hours_per_day: number;
  breakdown_by_shift_type: Record<string, number>; // { shift_type_id: hours }
}

export interface DepartmentStatistics {
  department: string;
  period: string; // YYYY-MM
  total_hours: number;
  unique_employees: number;
  avg_hours_per_employee: number;
}

export interface TimeEntryListResponse {
  items: TimeEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface StatisticsFilterRequest {
  year: number;
  month: number;
  include_manual?: boolean;
}

export interface TimeEntryFilterRequest {
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  employee_id?: string;
  department?: string;
  source?: TimeEntrySourceEnum;
  limit?: number;
  offset?: number;
}

export interface BatchProcessRequest {
  process_date: string; // YYYY-MM-DD
  overwrite_existing?: boolean;
}

export interface BatchProcessResponse {
  job_id: string;
  status: "completed" | "queued" | "error";
  message: string;
  estimated_entries: number;
}
