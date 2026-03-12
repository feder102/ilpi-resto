/**
 * T044 (Phase 5 - US3): ResetSuccess Component
 *
 * Success confirmation message and redirect to login.
 * Placeholder for Dev B to implement in Phase 5.
 *
 * Dev B: Implement success message and redirect logic
 */

import React from 'react';

interface ResetSuccessProps {
  onLoginClick?: () => void;
}

export default function ResetSuccess({ onLoginClick }: ResetSuccessProps) {
  // TODO: Implement in Phase 5 (User Story 3)
  // - Display success message: "Contraseña restablecida exitosamente"
  // - Show "Ir a Iniciar Sesión" button
  // - Optional: Auto-redirect after 3 seconds
  // - On click: Navigate to /login

  return (
    <div className="reset-success">
      <div className="success-icon">✓</div>
      <h2>Contraseña restablecida exitosamente</h2>
      <p>Tu contraseña ha sido actualizada.</p>
      <button className="btn-primary" onClick={onLoginClick}>
        Ir a Iniciar Sesión
      </button>
      <p className="dev-note">(Dev B: Implement success component in Phase 5)</p>
    </div>
  );
}
