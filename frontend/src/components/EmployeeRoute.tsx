/**
 * Employee Route Component - Feature 005 Security
 *
 * Enforces CRITICAL security checks for employee-only routes:
 * 1. Must be authenticated (valid JWT token)
 * 2. Must have Empleado role
 * 3. Must have is_active = true (password setup complete)
 *
 * Security Flow:
 * - Not authenticated → Redirect to /login
 * - Has role Admin/Moderador → Redirect to /dashboard (admin dashboard)
 * - Has role Empleado but is_active=false → Redirect to /auth/password-setup
 * - Has role Empleado and is_active=true → Allow access to employee modules
 */

import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../config/constants';

interface EmployeeRouteProps {
  children: React.ReactNode;
}

export function EmployeeRoute({ children }: EmployeeRouteProps) {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  const [searchParams] = useSearchParams();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    console.warn('[EmployeeRoute] Not authenticated, redirecting to login');
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Wrong role - must be Empleado
  if (!hasRole('Empleado')) {
    console.warn('[EmployeeRoute] User role is not Empleado, redirecting to dashboard');
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  // CRITICAL SECURITY CHECK: Must have is_active = true (password setup complete)
  if (!user.is_active) {
    console.warn('[EmployeeRoute] User is_active=false, redirecting to password setup');
    // Pass current location as return URL so they come back after setup
    const returnTo = window.location.pathname + window.location.search;
    return (
      <Navigate
        to={`/auth/password-setup?token=${searchParams.get('token') || ''}&return=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  // All checks passed - allow access
  return <>{children}</>;
}
