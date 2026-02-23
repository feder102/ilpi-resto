// T005: Domain model types

export enum Role {
  ADMIN = 'Admin',
  MODERADOR = 'Moderador',
  EMPLEADO = 'Empleado',
}

export enum Department {
  COCINA = 'Cocina',
  ATENCION_AL_PUBLICO = 'Atención al Público',
  BARRA = 'Barra',
  DIRECCION = 'Dirección',
}

export enum StaffStatus {
  ACTIVO = 'Activo',
  VACACIONES = 'Vacaciones',
  AUSENTE = 'Ausente',
  INACTIVO = 'Inactivo',
}

export enum MaritalStatus {
  SOLTERO = 'Soltero/a',
  CASADO = 'Casado/a',
  DIVORCIADO = 'Divorciado/a',
  VIUDO = 'Viudo/a',
  PAREJA_DE_HECHO = 'Pareja de hecho',
}

export enum Gender {
  MASCULINO = 'Masculino',
  FEMENINO = 'Femenino',
  OTRO = 'Otro',
}

export enum VacationStatus {
  PENDIENTE = 'Pendiente',
  APROBADO = 'Aprobado',
  RECHAZADO = 'Rechazado',
  CANCELADO = 'Cancelado',
}

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
  entry_time: string;
  exit_time: string | null;
  location_lat: number | null;
  location_lng: number | null;
  task_label: string | null;
}

export interface Team {
  id: string;
  name: string;
  department: Department;
  shift_type: string;
  shift_start: string;
  shift_end: string;
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
