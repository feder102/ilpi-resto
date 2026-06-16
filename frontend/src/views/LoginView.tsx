// T032: Login view - refactored to use UI component library
import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card, Alert } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../config/constants';

export default function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Feature 005: Monitor user login and redirect based on is_active status
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // User just logged in - check if password setup is needed
    if (user.is_active === false) {
      console.log('[LoginView] User is_active=false, password setup required via email link');
      setError('Debes completar la configuración de contraseña. Revisa tu correo electrónico para el enlace de activación.');
      // Note: PasswordSetupRoute requires a valid token in URL, which comes from email link
    } else if (user.role === 'Empleado') {
      // Empleado with is_active=true goes to employee dashboard
      console.log('[LoginView] Empleado logged in, redirecting to employee dashboard');
      navigate('/employee/dashboard', { replace: true });
    } else {
      // Admin/Moderador goes to admin dashboard
      console.log('[LoginView] Admin/Moderador logged in, redirecting to dashboard');
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // If already authenticated, let useEffect handle the redirect
  if (isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Redirigiendo...</div>;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // useEffect will handle the redirect based on user.is_active
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Credenciales inválidas';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <Card className="w-full max-w-md bg-base-100 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-base-content mb-2">ILPI Staff</h1>
          <p className="text-sm text-base-content/60">Gestión de Personal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-base-content">Correo electrónico</label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ilpi.es"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-base-content">Contraseña</label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <Alert variant="error" message={error} />
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            className="w-full"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>

          <div className="text-center text-sm text-base-content/60 mt-4">
            <a
              href="/password-reset"
              className="link link-primary font-medium"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </form>
      </Card>
    </div>
  );
}
