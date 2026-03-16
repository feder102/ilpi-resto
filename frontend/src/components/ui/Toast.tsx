import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ToastProps {
  message: string;
  variant?: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
  onDismiss?: () => void;
  title?: string;
}

const variantClasses = {
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
  info: 'alert-info',
};

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ message, variant = 'info', duration = 5000, onDismiss, title }, ref) => {
    useEffect(() => {
      if (duration > 0 && onDismiss) {
        const timer = setTimeout(onDismiss, duration);
        return () => clearTimeout(timer);
      }
    }, [duration, onDismiss]);

    return (
      <div ref={ref} className={`alert ${variantClasses[variant]} shadow-lg`} role="status" aria-live="polite">
        <div className="flex-1">
          {title && <h4 className="font-bold">{title}</h4>}
          <p className="text-sm">{message}</p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="btn btn-ghost btn-sm btn-circle" aria-label="Cerrar">
            <X size={18} />
          </button>
        )}
      </div>
    );
  }
);

Toast.displayName = 'Toast';

export default Toast;
