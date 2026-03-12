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
import { PasswordValidationRequirement } from '../../types/passwordReset';
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
        id: 'length',
        label: 'Mínimo 8 caracteres',
        met: password.length >= 8,
      },
      {
        id: 'uppercase',
        label: 'Al menos una mayúscula (A-Z)',
        met: /[A-Z]/.test(password),
      },
      {
        id: 'lowercase',
        label: 'Al menos una minúscula (a-z)',
        met: /[a-z]/.test(password),
      },
      {
        id: 'number',
        label: 'Al menos un número (0-9)',
        met: /[0-9]/.test(password),
      },
      {
        id: 'special',
        label: 'Al menos un carácter especial (!@#$%...)',
        met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      },
    ],
    [password]
  );

  const allRequirementsMet = requirements.every((req) => req.met);

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
      const error = err as { response?: { status: number }; error?: { message?: string }; message?: string };
      if (error.response?.status === 410) {
        setError('Tu enlace ha expirado. Solicita uno nuevo');
      } else if (error.response?.status === 422) {
        // Password validation error with details
        setError(
          error.error?.message ||
          'La contraseña no cumple con los requisitos de seguridad'
        );
      } else if (error.response?.status === 400) {
        setError('El enlace es inválido o ya fue utilizado');
      } else {
        setError(err.message || 'Error al restablecer la contraseña');
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
              <li key={req.id} className={req.met ? 'met' : 'unmet'}>
                <span className="requirement-icon">
                  {req.met ? '✓' : '○'}
                </span>
                <span className="requirement-label">{req.label}</span>
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
