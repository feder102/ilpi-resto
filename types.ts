
export enum Role {
  ADMIN = 'Admin',
  MODERATOR = 'Moderador',
  EMPLOYEE = 'Empleado'
}

export enum Department {
  KITCHEN = 'Cocina',
  SERVICE = 'Atención al Público',
  BAR = 'Barra',
  MANAGEMENT = 'Dirección'
}

export enum StaffStatus {
  ACTIVE = 'Activo',
  VACATION = 'Vacaciones',
  ABSENT = 'Ausente',
  INACTIVE = 'Inactivo'
}

export type MaritalStatus = 'Soltero/a' | 'Casado/a' | 'Divorciado/a' | 'Viudo/a' | 'Pareja de hecho';
export type Gender = 'Masculino' | 'Femenino' | 'Otro';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dni: string;
  address: string;
  birthDate: string;
  maritalStatus: MaritalStatus;
  gender: Gender;
  role: Role;
  department: Department;
  status: StaffStatus;
  hireDate: string;
  profileImage: string;
  emergencyContact?: string;
}

export interface ShiftRecord {
  id: string;
  employeeId: string;
  date: string;
  entryTime: string;
  exitTime?: string;
  location?: { lat: number; lng: number };
}

export interface Team {
  id: string;
  name: string;
  department: Department;
  members: string[]; // Employee IDs
  shiftType: 'Mañana' | 'Tarde' | 'Noche';
}

export interface VacationRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
}

export interface AbsenceRecord {
  id: string;
  employeeId: string;
  date: string;
  reason: string;
  justified: boolean;
}
