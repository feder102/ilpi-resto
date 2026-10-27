// Issue #58: fallback UI shown by the Sentry ErrorBoundary when a render error
// occurs. Prevents the "white screen of death" and lets the user recover.
import { AlertTriangle } from 'lucide-react';

export default function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card bg-base-100 shadow-xl max-w-md w-full">
        <div className="card-body items-center text-center gap-4">
          <AlertTriangle className="w-12 h-12 text-error" />
          <h2 className="card-title">Algo salió mal</h2>
          <p className="text-sm text-base-content/70">
            Se produjo un error inesperado. El equipo ha sido notificado. Podés
            recargar la página para volver a intentarlo.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Recargar página
          </button>
        </div>
      </div>
    </div>
  );
}
