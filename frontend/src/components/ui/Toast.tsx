import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ToastProps {
  /**
   * Toast message
   */
  message: string;

  /**
   * Toast variant/type
   */
  variant?: 'success' | 'warning' | 'error' | 'info';

  /**
   * Duration before auto-dismiss (ms), set to 0 to disable
   * @default 5000
   */
  duration?: number;

  /**
   * Callback when toast is dismissed
   */
  onDismiss?: () => void;

  /**
   * Optional title
   */
  title?: string;
}

/**
 * Reusable Toast Component
 * Non-blocking notification that appears briefly and auto-dismisses
 *
 * @example
 * <Toast
 *   message="Operation completed successfully"
 *   variant="success"
 *   duration={5000}
 *   onDismiss={handleDismiss}
 * />
 */
const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ message, variant = 'info', duration = 5000, onDismiss, title }, ref) => {
    useEffect(() => {
      if (duration > 0 && onDismiss) {
        const timer = setTimeout(onDismiss, duration);
        return () => clearTimeout(timer);
      }
    }, [duration, onDismiss]);

    const variantClasses = {
      success: 'bg-green-50 border-l-4 border-green-600 text-green-800',
      warning: 'bg-yellow-50 border-l-4 border-yellow-600 text-yellow-800',
      error: 'bg-red-50 border-l-4 border-red-600 text-red-800',
      info: 'bg-blue-50 border-l-4 border-blue-600 text-blue-800',
    };

    return (
      <div
        ref={ref}
        className={`rounded-md p-4 shadow-md flex items-start justify-between gap-3 ${variantClasses[variant]}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex-1">
          {title && <h4 className="font-medium mb-1">{title}</h4>}
          <p className="text-sm">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 hover:opacity-75"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        )}
      </div>
    );
  }
);

Toast.displayName = 'Toast';

export default Toast;
