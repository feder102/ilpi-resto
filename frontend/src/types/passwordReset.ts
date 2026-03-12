/**
 * Password Reset Types
 * TypeScript interfaces for password recovery feature
 */

/**
 * Request to initiate password reset
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Request to verify token and reset password
 */
export interface PasswordResetVerifyRequest {
  token: string;
  new_password: string;
}

/**
 * Response from password reset request
 */
export interface PasswordResetResponse {
  message: string;
  expires_in_hours?: number;
  note?: string;
  action?: string;
  redirect_url?: string;
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Password validation requirement status
 */
export interface PasswordValidationRequirement {
  requirement: string;
  message: string;
  satisfied: boolean;
}

/**
 * API error response format
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    retry_after_seconds?: number;
  };
}

/**
 * Token validity check response
 */
export interface TokenValidityResponse {
  valid: boolean;
  user_email?: string;
  expires_at?: string;
  message?: string;
}
