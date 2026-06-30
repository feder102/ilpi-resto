// T023: Application constants — department string → FK (Feature 014)
import { Role } from '../types';

// Feature 005: API configuration
// In Docker: VITE_API_BASE=/api/v1 (proxy to backend)
// In dev: http://localhost:8000/api/v1 (direct to backend)
export const API_BASE_URL = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  [Role.ADMIN]: [
    'dashboard', 'employees', 'teams', 'attendance', 'vacations', 'reports',
    'shift-configuration', 'settings', 'departments',
  ],
  [Role.MODERADOR]: [
    'dashboard', 'employees', 'teams', 'attendance', 'vacations', 'reports',
  ],
  [Role.EMPLEADO]: [
    'profile', 'my-shifts', 'my-vacations',
  ],
};

export const DEPARTMENT_ICON_CATALOG: string[] = [
  'Building2',
  'ChefHat',
  'Utensils',
  'Coffee',
  'Briefcase',
  'Users',
  'CircleHelp',
  'Truck',
  'Sparkles',
  'Flame',
  'Star',
  'ShoppingCart',
  'Package',
  'Wrench',
  'Music',
  'Phone',
  'Monitor',
  'Car',
  'Scissors',
  'Globe',
  'Home',
  'Settings',
];

export const DEPARTMENT_COLOR_PALETTE: string[] = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6b7280', // gray (default)
  '#9ca3af', // cool gray
  '#84cc16', // lime
  '#f97316', // orange
  '#14b8a6', // teal
];

export const DEFAULT_PROFILE_IMAGE =
  'https://static.vecteezy.com/system/resources/previews/020/911/732/large_2x/profile-icon-avatar-icon-user-icon-person-icon-free-png.png';

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
  // Feature 014: Department ABM
  DEPARTMENTS: '/admin/departments',
} as const;
