/**
 * Error types and interfaces for API communication.
 */

/**
 * Backend API error response structure
 */
export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * Mapped error information for consistent handling
 */
export interface ErrorInfo {
  code?: string;
  message: string;
  status?: number;
  details?: unknown;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Error codes from backend
 */
export enum ErrorCode {
  // Shift conflicts
  SHIFT_CONFLICT_001 = 'SHIFT_CONFLICT_001',
  SHIFT_CONFLICT_VACATION = 'SHIFT_CONFLICT_VACATION',

  // Common errors
  DUPLICATE = 'DUPLICATE',
  CONFLICT = 'CONFLICT',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Auth/Permission
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // Balance/Quota
  BALANCE_EXCEEDED = 'BALANCE_EXCEEDED',
}
