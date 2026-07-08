// T006: API response types

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ErrorDetail {
  field?: string;
  message: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[] | Record<string, unknown>;
  };
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    role: string;
    tenant_id: string;
    employee_id: string | null;
    is_active: boolean; // Feature 005: False until password is set
  };
}

export interface DashboardStats {
  total_employees: number;
  on_shift: number;
  on_vacation: number;
  pending_requests: number;
}

export interface HoursByDayItem {
  day: string;
  hours: number;
}

export interface DepartmentDistItem {
  department: string;
  count: number;
}

// Feature 015: Personnel metrics (Admin-only reports). Decimal values may be
// serialized as strings by the backend, hence `number | string`.
export interface OvertimeRatio {
  date_from: string;
  date_to: string;
  ordinary_hours: number | string;
  extra_hours: number | string;
  ratio_pct: number | string | null;
}

export interface OvertimeRankingItem {
  employee_id: string;
  employee_name: string;
  extra_hours: number | string;
}

export interface OvertimeRanking {
  date_from: string;
  date_to: string;
  items: OvertimeRankingItem[];
}

export interface Absenteeism {
  date_from: string;
  date_to: string;
  total_absences: number;
  justified_absences: number;
  unjustified_absences: number;
  planned_shifts: number;
  rate_pct: number | string;
  alert: boolean;
}

export interface VacationLiabilityItem {
  employee_id: string;
  employee_name: string;
  annual_days: number;
  months_worked: number;
  accrued_days: number;
  used_days: number;
  liability_days: number;
}

export interface VacationLiability {
  year: number;
  items: VacationLiabilityItem[];
  total_accrued: number;
  total_used: number;
  total_liability: number;
}
