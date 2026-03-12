// T005: Domain model types

export const Role = {
  ADMIN: 'Admin',
  MODERADOR: 'Moderador',
  EMPLEADO: 'Empleado',
} as const;
export type Role = typeof Role[keyof typeof Role];

export const Department = {
  COCINA: 'Cocina',
  ATENCION_AL_PUBLICO: 'Atención al Público',
  BARRA: 'Barra',
  DIRECCION: 'Dirección',
} as const;
export type Department = typeof Department[keyof typeof Department];

export const StaffStatus = {
  ACTIVO: 'Activo',
  VACACIONES: 'Vacaciones',
  AUSENTE: 'Ausente',
  INACTIVO: 'Inactivo',
} as const;
export type StaffStatus = typeof StaffStatus[keyof typeof StaffStatus];

export const MaritalStatus = {
  SOLTERO: 'Soltero/a',
  CASADO: 'Casado/a',
  DIVORCIADO: 'Divorciado/a',
  VIUDO: 'Viudo/a',
  PAREJA_DE_HECHO: 'Pareja de hecho',
} as const;
export type MaritalStatus = typeof MaritalStatus[keyof typeof MaritalStatus];

export const Gender = {
  MASCULINO: 'Masculino',
  FEMENINO: 'Femenino',
  OTRO: 'Otro',
} as const;
export type Gender = typeof Gender[keyof typeof Gender];

export const VacationStatus = {
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
} as const;
export type VacationStatus = typeof VacationStatus[keyof typeof VacationStatus];

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  dni: string;
  address: string | null;
  birth_date: string | null;
  marital_status: MaritalStatus | null;
  gender: Gender | null;
  role: Role;
  department: Department;
  status: StaffStatus;
  hire_date: string;
  profile_image: string | null;
  emergency_contact: string | null;
  is_active: boolean;
  team_id: string | null;
}

export interface ShiftRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_image: string | null;
  date: string;
  entry_time: string | null;
  exit_time: string | null;
  location_lat: number | null;
  location_lng: number | null;
  task_label: string | null;
  shift_type_id: string;
  shift_type_name: string;
}

export interface Team {
  id: string;
  name: string;
  department: Department;
  shift_type_id: string;
  shift_type: {
    id: string;
    name: string;
    type: string;
    time_windows: Array<{ start: string; end: string }>;
    expected_hours: number;
    total_hours: number;
    uses_dynamic_close: boolean;
    description?: string | null;
  } | null;
  time_windows?: Array<{ start: string; end: string }> | null;
  total_hours?: number | null;
  expected_hours?: number | null;
  uses_dynamic_close?: boolean | null;
  members: TeamMember[];
}

export interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  profile_image: string | null;
}

export interface VacationRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_image: string | null;
  employee_department: Department;
  start_date: string;
  end_date: string;
  requested_days: number;
  status: VacationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  version: number;
  created_at: string;
}

export interface VacationBalance {
  employee_id: string;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

// ============================================================================
// Feature 006: Moderator Portal Types
// ============================================================================

/**
 * Roster day display in moderator calendar view
 */
export interface RosterDay {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  shift_type_name: string;
  entry_time: string | null;
  exit_time: string | null;
  vacation_status: VacationStatus | null;
}

/**
 * Moderator's roster for a month
 */
export interface ModeratorRoster {
  year: number;
  month: number;
  department: Department;
  shifts: RosterDay[];
}

/**
 * Vacation request with moderator-specific fields
 */
export interface ModeratorVacationRequest extends VacationRequest {
  rejection_reason?: string | null;
}

/**
 * Vacation summary row (per employee)
 */
export interface VacationSummaryRow {
  employee_id: string;
  employee_name: string;
  approved_days: number;
  rejected_days: number;
  pending_days: number;
  remaining_days: number;
}

/**
 * Vacation summary report
 */
export interface VacationSummaryReport {
  year: number;
  department: Department;
  summary: VacationSummaryRow[];
  department_total: {
    approved_days: number;
    rejected_days: number;
    pending_days: number;
  };
}

/**
 * Attendance record for report
 */
export interface AttendanceRecord {
  employee_id: string;
  employee_name: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  hours_worked: number | null;
  shift_type: string;
}

/**
 * Attendance report
 */
export interface AttendanceReport {
  date_from: string;
  date_to: string;
  department: Department;
  records: AttendanceRecord[];
}
