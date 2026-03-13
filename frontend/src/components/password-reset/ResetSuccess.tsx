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
  const [redirected, setRedirected] = React.useState(false);

  React.useEffect(() => {
    if (redirected) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        const newCountdown = prev - 1;
        if (newCountdown <= 0 && onLoginClick) {
          clearInterval(timer);
          setRedirected(true);
          onLoginClick();
          return 0;
        }
        return newCountdown;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onLoginClick, redirected]);

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
