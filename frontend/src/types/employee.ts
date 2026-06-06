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

