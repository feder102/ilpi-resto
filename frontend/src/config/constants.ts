// T008: Application constants
import { Role, Department } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  [Role.ADMIN]: [
    'dashboard', 'employees', 'teams', 'attendance', 'vacations', 'reports', 'shift-configuration', 'settings',
  ],
  [Role.MODERADOR]: [
    'dashboard', 'employees', 'teams', 'attendance', 'vacations', 'reports',
  ],
  [Role.EMPLEADO]: [
    'profile', 'my-shifts', 'my-vacations',
  ],
};

export const DEPARTMENTS: Department[] = [
  Department.COCINA,
  Department.ATENCION_AL_PUBLICO,
  Department.BARRA,
  Department.DIRECCION,
];

export const SHIFT_TYPES = ['Mañana', 'Tarde-Noche'] as const;

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  EMPLOYEES: '/employees',
  TEAMS: '/teams',
  SHIFT_ROSTER: '/shift-roster',
  SHIFT_CONFIGURATION: '/shift-configuration',
  ATTENDANCE: '/attendance',
  VACATIONS: '/vacations',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  // Feature 005: Employee Portal Routes
  EMPLOYEE_SHIFTS: '/employee/shifts',
  EMPLOYEE_VACATIONS: '/employee/vacations',
  EMPLOYEE_TIME_TRACKING: '/employee/time-tracking',
  // Feature 006: Moderator Portal Routes
  MODERATOR_DASHBOARD: '/moderator/dashboard',
  MODERATOR_ROSTER: '/moderator/roster',
  MODERATOR_VACATIONS: '/moderator/vacations',
  MODERATOR_SHIFTS: '/moderator/shifts',
  MODERATOR_REPORTS: '/moderator/reports',
} as const;
