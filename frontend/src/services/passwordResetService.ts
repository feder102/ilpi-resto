/**
 * Password Reset API Service
 * Client for communicating with backend password recovery endpoints
 */

import axios from 'axios';
import {
  ApiError,
  PasswordResetRequest,
  PasswordResetResponse,
  PasswordResetVerifyRequest,
  TokenValidityResponse,
} from '../types/passwordReset';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const PASSWORD_RESET_API_BASE = `${API_BASE}/auth/password-reset`;

export const passwordResetService = {
  /**
   * Request a password reset link for forgotten password
   *
   * @param email User's email address
   * @returns Promise resolving to reset request response
   * @throws ApiError on validation or server errors
   */
  requestReset: async (email: string): Promise<PasswordResetResponse> => {
    try {
      const response = await axios.post<PasswordResetResponse>(
        `${PASSWORD_RESET_API_BASE}/request`,
        { email } as PasswordResetRequest
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        throw error.response.data as ApiError;
      }
      throw error;
    }
  },

  /**
   * Verify reset token and set new password
   *
   * @param token Reset token from email link
   * @param newPassword New password for the account
   * @returns Promise resolving to password reset response
   * @throws ApiError on validation, expiration, or server errors
   */
  verifyAndReset: async (
    token: string,
    newPassword: string
  ): Promise<PasswordResetResponse> => {
    try {
      const response = await axios.post<PasswordResetResponse>(
        `${PASSWORD_RESET_API_BASE}/verify`,
        {
          token,
          new_password: newPassword,
        } as PasswordResetVerifyRequest
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        throw error.response.data as ApiError;
      }
      throw error;
    }
  },

  /**
   * Check if a reset token is valid (optional convenience endpoint)
   * Used to validate token before showing password reset form
   *
   * @param token Reset token to validate
   * @returns Promise resolving to token validity response
   */
  checkTokenValidity: async (token: string): Promise<TokenValidityResponse> => {
    try {
      const response = await axios.get<TokenValidityResponse>(
        `${PASSWORD_RESET_API_BASE}/verify`,
        { params: { token } }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          valid: false,
          message:
            'El enlace es inválido o ha expirado',
        };
      }
      return { valid: false };
    }
  },
};
