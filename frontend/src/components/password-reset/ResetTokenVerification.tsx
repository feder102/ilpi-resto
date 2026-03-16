/**
 * T031 (Phase 4 - US2): ResetTokenVerification Component
 *
 * Verifies token validity on mount and shows password reset form if valid.
 * Displays error with "Solicitar nuevo enlace" option if token invalid/expired.
 */

import { useState, useEffect } from 'react';
import { passwordResetService } from '../../services/passwordResetService';
import PasswordResetForm from './PasswordResetForm';

interface ResetTokenVerificationProps {
  token: string;
}

type VerificationState = 'checking' | 'valid' | 'invalid' | 'expired';

export default function ResetTokenVerification({ token }: ResetTokenVerificationProps) {
  const [state, setState] = useState<VerificationState>('checking');
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Check token validity with GET /auth/password-reset/verify?token=...
        const response = await passwordResetService.checkTokenValidity(token);

        // Token is valid
        setState('valid');
        setExpiresAt(response.expires_at || null);
      } catch (err) {
        const error = err as { error?: { code?: string; message?: string } };
        // Check error type to determine state
        if (error.error?.code === 'TOKEN_EXPIRED') {
          // Token expired
          setState('expired');
          setError(
            error.error?.message || 'El enlace ha expirado. Por favor solicita uno nuevo para continuar.'
          );
        } else {
          // Token invalid (invalid format, not found, etc)
          setState('invalid');
          setError(
            error.error?.message ||
            'El enlace es inválido o no pudo verificarse. Por favor solicita uno nuevo.'
          );
        }
      }
    };

    verifyToken();
  }, [token]);

  if (state === 'checking') {
    // Show loading spinner while verifying
    return (
      <div className="text-center py-8">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 text-base-content/60">Verificando enlace...</p>
      </div>
    );
  }

  if (state === 'valid') {
    // Token is valid - show password reset form
    return <PasswordResetForm token={token} />;
  }

  // Token invalid or expired - show error with retry option
  return (
    <div className="text-center space-y-4">
      <div className="text-5xl text-error">✗</div>
      <h2 className="text-2xl font-bold text-base-content">Enlace no válido</h2>
      <p className="text-base-content/60">{error}</p>

      <div className="flex flex-col gap-3">
        <a href="/password-reset" className="btn btn-primary w-full">
          Solicitar nuevo enlace
        </a>
        <a href="/login" className="btn btn-secondary btn-outline w-full">
          Volver a iniciar sesión
        </a>
      </div>

      {expiresAt && (
        <p className="text-xs text-base-content/40">
          Enlace expiró: {new Date(expiresAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
