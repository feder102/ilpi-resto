/**
 * Password Setup Route Component - Feature 005 Security
 *
 * Controls access to the password setup flow:
 * 1. Must have valid token in URL (?token=xyz)
 * 2. If already authenticated with is_active=true, redirects to dashboard
 * 3. Allows: unauthenticated access with valid token OR is_active=false with token
 *
 * This ensures:
 * - Only users with valid one-time tokens can access
 * - Already-authenticated users with password are redirected
 * - Password setup can only happen once (token consumed)
 */

import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../config/constants';

interface PasswordSetupRouteProps {
  children: React.ReactNode;
}

export function PasswordSetupRoute({ children }: PasswordSetupRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token');

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Verificando enlace...</p>
        </div>
      </div>
    );
  }

  // SECURITY: Check if user is authenticated and already has password setup complete
  if (isAuthenticated && user && user.is_active) {
    console.warn('[PasswordSetupRoute] User already has password set, redirecting to dashboard');
    // User already completed password setup, send them to dashboard
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  // SECURITY: Must have token in URL
  if (!token) {
    console.warn('[PasswordSetupRoute] No token provided, redirecting to login');
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // SECURITY: If authenticated but not is_active, verify they have a valid token
  // (This handles the case where user started password setup but didn't finish)
  if (isAuthenticated && user && !user.is_active) {
    // Allow access - they can complete password setup
    console.log('[PasswordSetupRoute] User with is_active=false accessing password setup');
    return <>{children}</>;
  }

  // SECURITY: Unauthenticated access is allowed ONLY with valid token
  // Token validation happens on backend during POST
  console.log('[PasswordSetupRoute] Unauthenticated access with token');
  return <>{children}</>;
}
