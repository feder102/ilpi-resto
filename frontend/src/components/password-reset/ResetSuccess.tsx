/**
 * T044 (Phase 5 - US3): ResetSuccess Component
 *
 * Success confirmation message and redirect to login.
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
    <div className="text-center space-y-4">
      <div className="text-5xl text-success">✓</div>
      <h2 className="text-2xl font-bold text-base-content">Contraseña restablecida exitosamente</h2>
      <p className="text-base-content/70">
        Tu contraseña ha sido actualizada y ahora puedes iniciar sesión con tu nueva contraseña.
      </p>

      <button className="btn btn-primary w-full" onClick={onLoginClick}>
        Ir a Iniciar Sesión
      </button>

      <p className="text-sm text-base-content/50">
        Te redireccionaremos automáticamente en {countdown} segundos...
      </p>
    </div>
  );
}
