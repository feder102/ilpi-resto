/**
 * T022: PasswordReset View Component
 *
 * Main view for password recovery flow.
 * Routes to different components based on URL state:
 * - No token: Show ForgotPasswordForm (US1)
 * - With token: Show ResetTokenVerification → PasswordResetForm (US2-3)
 */

import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ForgotPasswordForm from '../components/password-reset/ForgotPasswordForm';
import ResetTokenVerification from '../components/password-reset/ResetTokenVerification';
import '../styles/password-reset.css';

export default function PasswordReset() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token'), [searchParams]);

  return (
    <div className="password-reset-container">
      <div className="password-reset-card">
        {token ? (
          // Phase 2 & 3: Token verification and password reset form
          <ResetTokenVerification token={token} />
        ) : (
          // Phase 1: Forgot password form - request reset link
          <ForgotPasswordForm />
        )}
      </div>
    </div>
  );
}
