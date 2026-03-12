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
  const [countdown, setCountdown] = React.useState(3);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1 && onLoginClick) {
          onLoginClick();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onLoginClick]);

  return (
    <div className="reset-success">
      <div className="success-icon">✓</div>
      <h2>Contraseña restablecida exitosamente</h2>
      <p className="success-message">
        Tu contraseña ha sido actualizada y ahora puedes iniciar sesión con tu nueva contraseña.
      </p>

      <button className="btn-primary" onClick={onLoginClick}>
        Ir a Iniciar Sesión
      </button>

      <p className="redirect-info">
        Te redireccionaremos automáticamente en {countdown} segundos...
      </p>
    </div>
  );
}
