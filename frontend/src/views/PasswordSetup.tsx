/**
 * Password Setup View for Feature 005: Employee Workspace Portal
 *
 * Allows employees to set their password using an email token
 * Redirects to login after successful password setup
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Button, Input, Card, Alert } from '../components/ui';
import { setupPassword } from '../services/authService';
import { ROUTES } from '../config/constants';
import { useAuth } from '../hooks/useAuth';

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  match: boolean;
}

export default function PasswordSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [validation, setValidation] = useState<PasswordValidation>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    match: false,
  });

  // Validate password requirements as user types
  useEffect(() => {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const match = password === passwordConfirm && password.length > 0;

    setValidation({
      minLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      match,
    });
  }, [password, passwordConfirm]);

  const isPasswordValid = validation.minLength && validation.hasUppercase &&
    validation.hasLowercase && validation.hasNumber;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Token inválido o no proporcionado');
      return;
    }

    if (!isPasswordValid) {
      setError('La contraseña no cumple con los requisitos');
      return;
    }

    if (!validation.match) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await setupPassword(token, password, passwordConfirm);
      setSuccess(true);
      setPassword('');
      setPasswordConfirm('');

      // Redirect to login after success
      setTimeout(() => {
        navigate(ROUTES.LOGIN, {
          replace: true,
          state: { message: 'Contraseña establecida. Por favor, inicia sesión.' }
        });
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message ||
        err.message ||
        'Error al establecer la contraseña';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
        <Card className="w-full max-w-md bg-base-100 shadow-2xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-base-content mb-4">Enlace Inválido</h1>
            <p className="text-base-content/60 mb-6">
              El enlace de configuración de contraseña no es válido o ha expirado.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate(ROUTES.LOGIN)}
              className="w-full"
            >
              Volver al Inicio de Sesión
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <Card className="w-full max-w-md bg-base-100 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-base-content mb-2">Configurar Contraseña</h1>
          <p className="text-sm text-base-content/60">
            Configura tu contraseña para acceder a tu cuenta
          </p>
        </div>

        {success ? (
          <div className="text-center">
            <Alert variant="success" message="¡Contraseña establecida correctamente!" />
            <p className="text-base-content/60 mt-4">
              Redirigiendo al inicio de sesión...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Field */}
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium text-base-content">Nueva Contraseña</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            {/* Password Confirm Field */}
            <div className="flex flex-col gap-1">
              <label htmlFor="passwordConfirm" className="text-sm font-medium text-base-content">Confirmar Contraseña</label>
              <Input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            {/* Password Requirements */}
            <div className="bg-base-200 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium text-base-content">Requisitos:</p>
              <div className="space-y-1 text-sm">
                <div className={validation.minLength ? 'text-success' : 'text-base-content/40'}>
                  ✓ Al menos 8 caracteres
                </div>
                <div className={validation.hasUppercase ? 'text-success' : 'text-base-content/40'}>
                  ✓ Contiene letras mayúsculas (A-Z)
                </div>
                <div className={validation.hasLowercase ? 'text-success' : 'text-base-content/40'}>
                  ✓ Contiene letras minúsculas (a-z)
                </div>
                <div className={validation.hasNumber ? 'text-success' : 'text-base-content/40'}>
                  ✓ Contiene números (0-9)
                </div>
                <div className={validation.match ? 'text-success' : 'text-base-content/40'}>
                  ✓ Las contraseñas coinciden
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="error" message={error} />
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={!isPasswordValid || !validation.match || loading}
              className="w-full"
            >
              {loading ? 'Configurando...' : 'Configurar Contraseña'}
            </Button>

            {/* Help Text */}
            <p className="text-xs text-center text-base-content/50">
              Esta contraseña será utilizada para acceder a tu cuenta de empleado
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
