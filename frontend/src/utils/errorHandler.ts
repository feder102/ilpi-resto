/**
 * Error handling utilities for API responses.
 *
 * Provides intelligent error message extraction from API responses,
 * mapping error codes to user-friendly Spanish messages.
 */

import axios, { AxiosError } from 'axios';

/**
 * API error response structure (from backend)
 */
interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * Error message mapping for specific error codes.
 * Maps backend error codes to user-friendly Spanish messages.
 */
const ERROR_MESSAGE_MAP: Record<string, string> = {
  // Shift roster conflicts
  SHIFT_CONFLICT_001: 'El empleado ya tiene un turno asignado en esa fecha',
  'El empleado tiene vacaciones aprobadas':
    'El empleado tiene vacaciones aprobadas en esta fecha. No se puede asignar un turno.',
  'vacaciones aprobadas':
    'El empleado tiene vacaciones aprobadas en esta fecha. No se puede asignar un turno.',

  // T014: Moderator portal errors (Feature 006)
  EMPLOYEE_NOT_IN_DEPARTMENT: 'El empleado no pertenece a tu departamento.',
  VACATION_CONFLICT: 'El empleado tiene vacaciones aprobadas en esa fecha. No se puede asignar un turno.',
  SHIFT_EXISTS: 'El empleado ya tiene un turno asignado en esa fecha. ¿Deseas reemplazarlo?',

  // Common conflicts
  DUPLICATE: 'Este recurso ya existe. Por favor, intenta con datos diferentes.',
  CONFLICT: 'Existe un conflicto de versión. La información puede haber sido modificada.',

  // Not found
  NOT_FOUND: 'El recurso no fue encontrado. Intenta recargar la página.',

  // Validation
  VALIDATION_ERROR: 'Los datos ingresados no son válidos.',

  // Permission
  UNAUTHORIZED: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
  FORBIDDEN: 'No tienes permiso para realizar esta acción.',

  // Balance
  BALANCE_EXCEEDED: 'Saldo insuficiente. No hay suficientes días de vacaciones disponibles.',
};

/**
 * Extract error message from Axios error, with intelligent mapping.
 *
 * Tries multiple strategies:
 * 1. Check if error response has structure {error: {code, message}}
 * 2. Check if message contains keywords and map to user-friendly message
 * 3. Fall back to error.message or generic message
 *
 * @param error - Axios error or unknown error
 * @param defaultMessage - Default message if extraction fails
 * @returns User-friendly error message in Spanish
 */
export function extractErrorMessage(
  error: unknown,
  defaultMessage: string = 'Ocurrió un error inesperado. Por favor, intenta de nuevo.',
): string {
  // Handle Axios errors
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    // Try to get message from API response structure
    const apiMessage = axiosError.response?.data?.error?.message;
    if (apiMessage) {
      // Check if message contains keywords to map to better messages
      for (const [keyword, mappedMessage] of Object.entries(ERROR_MESSAGE_MAP)) {
        if (apiMessage.toLowerCase().includes(keyword.toLowerCase())) {
          return mappedMessage;
        }
      }
      // Return raw API message if no mapping found
      return apiMessage;
    }

    // Try to get message from response status text
    if (axiosError.response?.statusText) {
      return axiosError.response.statusText;
    }

    // Fall back to error message
    return axiosError.message || defaultMessage;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Check if error message matches any keywords
    for (const [keyword, mappedMessage] of Object.entries(ERROR_MESSAGE_MAP)) {
      if (error.message.toLowerCase().includes(keyword.toLowerCase())) {
        return mappedMessage;
      }
    }
    return error.message;
  }

  // Fallback to default message
  return defaultMessage;
}

/**
 * Determine error severity/type from error response.
 *
 * Useful for styling error messages with appropriate colors.
 *
 * @param error - Axios error
 * @returns 'error' | 'warning' | 'info'
 */
export function getErrorSeverity(
  error: unknown,
): 'error' | 'warning' | 'info' {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;

    if (status === 409) return 'warning'; // Conflict (e.g., vacation overlap)
    if (status === 422) return 'warning'; // Validation error
    if (status === 401 || status === 403) return 'error'; // Auth/Permission
    if (status && status >= 500) return 'error'; // Server error
  }

  return 'error';
}

/**
 * Get detailed error information for logging/debugging.
 *
 * @param error - Axios error
 * @returns Object with code, message, status, and details
 */
export function getErrorDetails(error: unknown): {
  code: string | undefined;
  message: string;
  status: number | undefined;
  details: unknown;
} {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    return {
      code: axiosError.response?.data?.error?.code,
      message: extractErrorMessage(error),
      status: axiosError.response?.status,
      details: axiosError.response?.data,
    };
  }

  return {
    code: undefined,
    message: extractErrorMessage(error),
    status: undefined,
    details: error,
  };
}
