/**
 * T031 (Phase 4 - US2): ResetTokenVerification Component
 *
 * Verifies token validity on mount and shows password reset form if valid.
 * Placeholder for Dev B to implement in Phase 4.
 *
 * Dev B: Implement token verification and route to PasswordResetForm
 */

import React from 'react';

interface ResetTokenVerificationProps {
  token: string;
}

export default function ResetTokenVerification({ token }: ResetTokenVerificationProps) {
  // TODO: Implement in Phase 4 (User Story 2)
  // - Check token validity with GET /auth/password-reset/verify?token=...
  // - Show loading spinner while checking
  // - If valid: Render PasswordResetForm component
  // - If invalid/expired: Show error message with "Solicitar nuevo enlace" button

  return (
    <div className="reset-token-verification">
      <div className="spinner">
        <p>Verificando enlace...</p>
      </div>
      <p className="token-debug">(Dev B: Implement token verification in Phase 4)</p>
    </div>
  );
}
