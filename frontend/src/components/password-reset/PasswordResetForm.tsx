/**
 * T043 (Phase 5 - US3): PasswordResetForm Component
 *
 * Form for setting new password with real-time validation.
 * Shows 5 password requirements and updates them as user types.
 * Disables submit until all requirements are met.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { passwordResetService } from '../../services/passwordResetService';
import type { PasswordValidationRequirement } from '../../types';
import ResetSuccess from './ResetSuccess';

interface PasswordResetFormProps {
  token: string;
}

export default function PasswordResetForm({ token }: PasswordResetFormProps) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password requirements
  const requirements: PasswordValidationRequirement[] = useMemo(
    () => [
      {
        requirement: 'length',
        message: 'Mínimo 8 caracteres',
        satisfied: password.length >= 8,
      },
      {
        requirement: 'uppercase',
        message: 'Al menos una mayúscula (A-Z)',
        satisfied: /[A-Z]/.test(password),
      },
      {
        requirement: 'lowercase',
        message: 'Al menos una minúscula (a-z)',
        satisfied: /[a-z]/.test(password),
      },
      {
        requirement: 'number',
        message: 'Al menos un número (0-9)',
        satisfied: /[0-9]/.test(password),
      },
      {
        requirement: 'special',
        message: 'Al menos un carácter especial (!@#$%...)',
        satisfied: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      },
    ],
    [password]
  );

  const allRequirementsMet = requirements.every((req) => req.satisfied);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRequirementsMet) {
      setError('Por favor cumple con todos los requisitos de contraseña');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await passwordResetService.verifyAndReset(token, password);
      setSuccess(true);

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      const error = err as { error?: { code?: string; message?: string } };
      if (error.error?.code === 'TOKEN_EXPIRED') {
        setError('Tu enlace ha expirado. Solicita uno nuevo');
      } else if (error.error?.code === 'PASSWORD_VALIDATION_FAILED') {
        // Password validation error with details
        setError(
          error.error?.message ||
          'La contraseña no cumple con los requisitos de seguridad'
        );
      } else if (error.error?.code === 'INVALID_RESET_TOKEN') {
        setError('El enlace es inválido o ya fue utilizado');
      } else {
        setError(error.error?.message || 'Error al restablecer la contraseña');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return <ResetSuccess onLoginClick={() => navigate('/login')} />;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-base-content mb-2">Crear nueva contraseña</h2>
      <p className="text-base-content/60 mb-6">
        Ingresa una contraseña nueva y segura que cumpla con todos los requisitos.
      </p>

      {error && (
        <div className="alert alert-error mb-4">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control">
          <label htmlFor="password" className="label">
            <span className="label-text">Nueva contraseña</span>
          </label>
          <input
            id="password"
            type="password"
            placeholder="Ingresa tu nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="input input-bordered w-full"
            aria-label="Nueva contraseña"
            autoComplete="new-password"
          />
        </div>

        {/* Password Requirements Checker */}
        <div className="bg-base-200 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium text-base-content">Requisitos de contraseña:</p>
          <ul className="space-y-1 text-sm">
            {requirements.map((req) => (
              <li key={req.requirement} className={`flex items-center gap-2 ${req.satisfied ? 'text-success' : 'text-base-content/40'}`}>
                <span>{req.satisfied ? '✓' : '○'}</span>
                <span>{req.message}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Submit Button - Disabled until all requirements met */}
        <button
          type="submit"
          disabled={!allRequirementsMet || loading}
          className="btn btn-primary w-full"
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Restableciendo contraseña...
            </>
          ) : (
            'Restablecer contraseña'
          )}
        </button>

        <p className="text-center text-sm text-base-content/60">
          ¿Cambió de opinión? <a href="/login" className="link link-primary">Volver a iniciar sesión</a>
        </p>
      </form>
    </div>
  );
}
