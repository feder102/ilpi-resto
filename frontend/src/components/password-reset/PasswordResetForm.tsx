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
import './PasswordResetForm.css';

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
    <div className="password-reset-form">
      <h2>Crear nueva contraseña</h2>
      <p className="form-description">
        Ingresa una contraseña nueva y segura que cumpla con todos los requisitos.
      </p>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">Nueva contraseña</label>
          <input
            id="password"
            type="password"
            placeholder="Ingresa tu nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="password-input"
            aria-label="Nueva contraseña"
            autoComplete="new-password"
          />
        </div>

        {/* Password Requirements Checker */}
        <div className="requirements-checker">
          <p className="requirements-title">Requisitos de contraseña:</p>
          <ul className="requirements-list">
            {requirements.map((req) => (
              <li key={req.requirement} className={req.satisfied ? 'met' : 'unmet'}>
                <span className="requirement-icon">
                  {req.satisfied ? '✓' : '○'}
                </span>
                <span className="requirement-label">{req.message}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Submit Button - Disabled until all requirements met */}
        <button
          type="submit"
          disabled={!allRequirementsMet || loading}
          className="btn-primary"
          aria-busy={loading}
        >
          {loading ? 'Restableciendo contraseña...' : 'Restablecer contraseña'}
        </button>

        <p className="form-footer">
          ¿Cambió de opinión? <a href="/login">Volver a iniciar sesión</a>
        </p>
      </form>
    </div>
  );
}
