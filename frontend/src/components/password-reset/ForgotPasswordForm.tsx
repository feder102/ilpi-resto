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

interface ForgotPasswordFormProps {
  onSuccess?: (email: string) => void;
}

export default function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
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
      setSubmittedEmail(email);
      setSuccess(true);

      // Call parent callback if provided
      if (onSuccess) {
        onSuccess(email);
      }
    } catch (err) {
      const error = err as { error?: { code?: string; message?: string; retry_after_seconds?: number } };
      // Check for rate limit error
      if (error.error?.code === 'RATE_LIMIT_EXCEEDED') {
        const retrySeconds = error.error?.retry_after_seconds || 600;
        setRetryAfter(retrySeconds);
        setError(
          `Demasiados intentos. Intenta de nuevo en ${Math.ceil(
            retrySeconds / 60
          )} minutos.`
        );
      } else {
        // Generic error handling
        setError(error.error?.message || 'Error al solicitar la recuperación de contraseña');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-base-content mb-2">¿Olvidaste tu contraseña?</h2>
      <p className="text-base-content/60 mb-6">
        Ingresa tu correo electrónico y te enviaremos un enlace para recuperar tu
        contraseña.
      </p>

      {success ? (
        <div className="text-center space-y-4">
          <div className="text-5xl text-success">✓</div>
          <h3 className="text-lg font-semibold text-base-content">Correo enviado</h3>
          <p className="text-base-content/70">
            Si {submittedEmail} está registrado en nuestro sistema, recibirás un enlace de
            recuperación en breve.
          </p>
          <p className="text-sm text-base-content/50">
            Revisa tu bandeja de entrada (incluida la carpeta de spam).
          </p>
          <button
            className="btn btn-secondary btn-outline w-full"
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="alert alert-error">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-control">
            <label htmlFor="email" className="label">
              <span className="label-text">Correo electrónico</span>
            </label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || retryAfter !== null}
              className={`input input-bordered w-full ${error ? 'input-error' : ''}`}
              aria-label="Correo electrónico"
              required
            />
          </div>

          {retryAfter && (
            <div className="alert alert-warning">
              <span>⏱</span>
              <span>Intenta de nuevo en {retryAfter} segundos</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || retryAfter !== null}
            className="btn btn-primary w-full"
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Enviando...
              </>
            ) : (
              'Solicitar enlace'
            )}
          </button>

          <p className="text-center text-sm text-base-content/60">
            ¿Recuerdas tu contraseña? <a href="/login" className="link link-primary">Inicia sesión</a>
          </p>
        </form>
      )}
    </div>
  );
}
