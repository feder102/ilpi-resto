/**
 * Employee-specific types for Feature 005: Employee Workspace Portal
 */

export interface EmployeeUser {
  id: string;
  email: string;
  name: string;
  role: "Empleado";
  employee_id: string;
  is_active: boolean;
  last_login: string | null;
}

export interface TimeRecord {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  clock_in_timestamp: string; // ISO 8601
  clock_out_timestamp: string | null; // ISO 8601 or null if not clocked out
}

export interface TimeRecordSummary extends TimeRecord {
  total_hours: number;
  total_minutes: number;
  formatted: string; // "9h 0m"
  clock_in_time: string; // "08:30 AM"
  clock_out_time: string | null; // "05:30 PM"
}

export interface ClockInResponse {
  time_record: TimeRecord;
  status: "clocked-in";
  message: string;
}

export interface ClockOutResponse {
  time_record: TimeRecord;
  status: "clocked-out";
  summary: {
    total_hours: number;
    total_minutes: number;
    formatted: string;
    clock_in: string;
    clock_out: string;
  };
  message: string;
}

export interface TimeRecordListResponse {
  items: TimeRecordSummary[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface Shift {
  id: string;
  date: string; // YYYY-MM-DD
  shift_type: string; // "Mañana", "Noche", etc
  shift_type_id: string;
  entry_time: string | null; // HH:MM format
  exit_time: string | null; // HH:MM format
  status: string;
  task_label: string | null;
  vacation_overlap: boolean;
  vacation_status: string | null; // "Pendiente", "Aprobado", etc
}

export interface ShiftsResponse {
  items: Shift[];
  total: number;
  date_from: string;
  date_to: string;
}

export interface VacationBalance {
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
  pending_approval: number;
}

export interface VacationRequest {
  id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  requested_days: number;
  status: "Pendiente" | "Aprobado" | "Rechazado" | "Cancelado";
  reason: string;
  created_at: string; // ISO 8601
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface VacationRequestsResponse {
  items: VacationRequest[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface DashboardData {
  employee: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  today: {
    date: string;
    has_shift: boolean;
    shift_type: string | null;
    entry_time: string | null;
    exit_time: string | null;
    clock_status: string | null;
    clock_in_time: string | null;
    elapsed_time_formatted: string | null;
  };
  vacation_balance: VacationBalance;
  upcoming_events: Array<{
    type: "shift" | "vacation";
    date?: string;
    date_from?: string;
    date_to?: string;
    shift_type?: string;
    entry_time?: string;
    exit_time?: string;
    status?: string;
  }>;
}

export interface TimeTrackingContextType {
  clockStatus: "not-clocked-in" | "clocked-in" | "clocked-out";
  currentRecord: TimeRecord | null;
  elapsedTime: number; // seconds
  isLoading: boolean;
  error: string | null;
  clockIn: () => Promise<void>;
  clockOut: () => Promise<void>;
  getRecords: (dateFrom?: string, dateTo?: string) => Promise<TimeRecordListResponse>;
  clearError: () => void;
}
