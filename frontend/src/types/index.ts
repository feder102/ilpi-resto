/**
 * Central TypeScript types export file
 * Re-exports all types from individual type files
 */

// Models - Enums and domain types
export {
  Role,
  StaffStatus,
  MaritalStatus,
  Gender,
  VacationStatus,
  type Department,
  type DepartmentNested,
  type Employee,
  type ShiftRecord,
  type Team,
  type TeamMember,
  type VacationRequest,
  type VacationBalance,
  type RosterDay,
  type ModeratorRoster,
  type ModeratorVacationRequest,
  type VacationSummaryRow,
  type VacationSummaryReport,
  type AttendanceRecord,
  type AttendanceReport,
} from './models';

// API Response types
export type {
  PaginatedResponse,
  ErrorDetail,
  ErrorResponse,
  LoginResponse,
  DashboardStats,
  HoursByDayItem,
  DepartmentDistItem,
} from './api';

// Employee-specific types
export type {
  EmployeeUser,
  Shift,
  ShiftsResponse,
  DashboardData,
} from './employee';

// Error types
export type { ApiErrorResponse, ErrorInfo } from './error';
export { ErrorCode } from './error';

// Shift types
export type {
  ShiftType,
  ShiftRecord as ShiftRecordType,
  ShiftCreatePayload,
  ShiftUpdatePayload,
  ShiftsListResponse,
  ShiftResponse,
} from './shift';

// Shift Type Configuration
export type {
  TimeWindow,
  ShiftType as ShiftTypeConfig,
  ShiftTypeCreate,
  ShiftTypeUpdate,
  ShiftTypeResponse,
  PaginatedShiftTypes,
} from './shift-types';

// Team types
export type {
  Team as TeamType,
  TeamMember as TeamMemberType,
  TeamCreate,
  TeamUpdate,
  TeamResponse,
  PaginatedTeams,
} from './team';

// Password Reset types
export type {
  ApiError,
  PasswordResetRequest,
  PasswordResetResponse,
  PasswordResetVerifyRequest,
  PasswordValidationRequirement,
  TokenValidityResponse,
} from './passwordReset';
