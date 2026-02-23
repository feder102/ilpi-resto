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
