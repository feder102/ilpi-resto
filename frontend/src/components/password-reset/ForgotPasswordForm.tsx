/**
 * T021: ForgotPasswordForm Component
 *
 * Form for initiating password reset by entering email address.
 * Handles:
 * - Email input with validation
 * - Submission to /auth/password-reset/request endpoint
 * - Loading state and error handling
 * - Rate limit display with countdown timer
 * - Success confirmation message
 */

import React, { useState, useEffect } from 'react';
import { passwordResetService } from '../../services/passwordResetService';
import './ForgotPasswordForm.css';

interface ForgotPasswordFormProps {
  onSuccess?: (email: string) => void;
}

export default function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  // Countdown timer for rate limit
  useEffect(() => {
    if (!retryAfter) return;

    const interval = setInterval(() => {
      setRetryAfter((prev) => {
        if (!prev || prev <= 1) {
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [retryAfter]);

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    // Validate email
    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      setLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setError('Por favor ingresa un correo electrónico válido');
      setLoading(false);
      return;
    }

    try {
      await passwordResetService.requestReset(email);
      setSuccess(true);
      setEmail('');

      // Call parent callback if provided
      if (onSuccess) {
        onSuccess(email);
      }
    } catch (err) {
      const error = err as { response?: { status: number }; code?: string; retry_after_seconds?: number; message?: string };
      // Check for rate limit error (429)
      if (error.response?.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
        const retrySeconds = error.retry_after_seconds || 600;
        setRetryAfter(retrySeconds);
        setError(
          `Demasiados intentos. Intenta de nuevo en ${Math.ceil(
            retrySeconds / 60
          )} minutos.`
        );
      } else {
        // Generic error handling
        setError(error.message || 'Error al solicitar la recuperación de contraseña');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-form">
      <h2>¿Olvidaste tu contraseña?</h2>
      <p className="form-description">
        Ingresa tu correo electrónico y te enviaremos un enlace para recuperar tu
        contraseña.
      </p>

      {success ? (
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h3>Correo enviado</h3>
          <p>
            Si {email} está registrado en nuestro sistema, recibirás un enlace de
            recuperación en breve.
          </p>
          <p className="success-subtext">
            Revisa tu bandeja de entrada (incluida la carpeta de spam).
          </p>
          <button
            className="btn-secondary"
            onClick={() => {
              setSuccess(false);
              setEmail('');
              setError(null);
            }}
          >
            Solicitar otro enlace
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || retryAfter !== null}
              className={error ? 'input-error' : ''}
              aria-label="Correo electrónico"
              required
            />
          </div>

          {retryAfter && (
            <div className="retry-timer">
              <span className="timer-icon">⏱</span>
              <span>Intenta de nuevo en {retryAfter} segundos</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || retryAfter !== null}
            className="btn-primary"
            aria-busy={loading}
          >
            {loading ? 'Enviando...' : 'Solicitar enlace'}
          </button>

          <p className="form-footer">
            ¿Recuerdas tu contraseña? <a href="/login">Inicia sesión</a>
          </p>
        </form>
      )}
    </div>
  );
}
