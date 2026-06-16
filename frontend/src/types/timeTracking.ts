/**
 * TypeScript interfaces for Feature 008: Automatic Time Tracking
 * Used by statistics service and admin components
 */

export const TimeEntrySourceEnum = {
  SHIFT: "shift",
  MANUAL: "manual",
  EXTRA: "extra",
} as const;

export type TimeEntrySourceEnum = typeof TimeEntrySourceEnum[keyof typeof TimeEntrySourceEnum];

export interface TimeEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_dni: string;
  shift_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM (null for extra-hours entries)
  end_time: string | null; // HH:MM (null for extra-hours entries)
  hours_worked: number | string; // Backend Decimal may serialize as string
  source: TimeEntrySourceEnum;
  note?: string | null;
  shift_type_id?: string;
  created_at: string;
}

export interface EmployeeStatistics {
  employee_id: string;
  period: string; // YYYY-MM
  total_hours: number | string; // Backend Decimal may serialize as string (shift + extra)
  extra_hours: number | string; // Overtime portion, reported separately
  days_worked: number;
  avg_hours_per_day: number | string;
  breakdown_by_shift_type: Record<string, number | string>;
  total_absences?: number;
  justified_absences?: number;
  unjustified_absences?: number;
}

export interface AbsenceCreate {
  employee_id: string;
  date: string; // YYYY-MM-DD
  justified: boolean;
  reason?: string;
}

export interface Absence {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_dni: string;
  date: string; // YYYY-MM-DD
  justified: boolean;
  reason: string | null;
  created_at: string;
}

export interface AbsenceListResponse {
  total: number;
  items: Absence[];
}

/** Request to register extra hours (overtime) for an employee. Admin/Moderador only. */
export interface ExtraHoursCreate {
  employee_id: string;
  work_date: string; // YYYY-MM-DD
  hours: number;
  note?: string;
}

export interface DepartmentStatistics {
  department: string;
  period: string; // YYYY-MM
  total_hours: number | string;
  unique_employees: number;
  avg_hours_per_employee: number | string;
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
