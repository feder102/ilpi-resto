/**
 * T022 (Updated for Phase 5): PasswordReset View Component
 *
 * Main view for password recovery flow.
 * Routes to different components based on URL state:
 * - No token: Show ForgotPasswordForm (US1)
 * - With token: Show ResetTokenVerification → PasswordResetForm (US2-3)
 *
 * Flow:
 * 1. User requests reset (ForgotPasswordForm)
 * 2. User clicks email link with token
 * 3. Token verified (ResetTokenVerification)
 * 4. User enters new password (PasswordResetForm)
 * 5. Success confirmation (ResetSuccess)
 * 6. Redirect to login
 */

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ForgotPasswordForm from '../components/password-reset/ForgotPasswordForm';
import ResetTokenVerification from '../components/password-reset/ResetTokenVerification';

export default function PasswordReset() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token'), [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="card bg-base-100 shadow-2xl w-full max-w-md">
        <div className="card-body">
          {token ? (
            // US2-3: Token verification and password reset form
            // ResetTokenVerification validates token
            // → If valid: renders PasswordResetForm
            // → If invalid/expired: shows error + links
            <ResetTokenVerification token={token} />
          ) : (
            // US1: Request password reset by email
            <ForgotPasswordForm />
          )}
        </div>
      </div>
    </div>
  );
}
