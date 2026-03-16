import React from 'react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message?: string;
  onClose?: () => void;
  children?: React.ReactNode;
}

const variantClasses = {
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
  info: 'alert-info',
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant, title, message, onClose, children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={`alert ${variantClasses[variant]} ${className || ''}`} role="alert" {...props}>
        <div className="flex-1">
          {title && <h3 className="font-bold">{title}</h3>}
          {message && <p className="text-sm">{message}</p>}
          {children}
        </div>
        {onClose && (
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle" aria-label="Cerrar">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export default Alert;
