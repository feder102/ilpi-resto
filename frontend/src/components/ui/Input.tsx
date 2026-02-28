import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Error message to display below input
   */
  error?: string;

  /**
   * Help text to display below input
   */
  helpText?: string;

  /**
   * Loading state (shows spinner)
   * @default false
   */
  loading?: boolean;

  /**
   * HTML id attribute (required for proper label association)
   */
  id: string;

  /**
   * Accessibility description ID (for error/help text)
   */
  'aria-describedby'?: string;
}

/**
 * Reusable Input Component
 * Supports text, email, password, number, search, tel, and url types
 * Includes error and help text support
 *
 * @example
 * <Input
 *   id="email"
 *   type="email"
 *   placeholder="user@example.com"
 *   error={error}
 *   helpText="We'll never share your email"
 * />
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, helpText, loading = false, disabled, className, id, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const baseClasses = 'w-full px-3 py-2 border rounded-md text-base text-slate-700 placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600';

    const borderClasses = error ? 'border-red-600' : 'border-slate-200 focus:border-indigo-600';

    const disabledClasses = disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white';

    const finalClassName = `${baseClasses} ${borderClasses} ${disabledClasses} ${className || ''}`;

    // Build aria-describedby string
    const ids = [];
    if (error) ids.push(`${id}-error`);
    if (helpText) ids.push(`${id}-help`);
    if (ariaDescribedBy) ids.push(ariaDescribedBy);
    const finalAriaDescribedBy = ids.length > 0 ? ids.join(' ') : undefined;

    return (
      <div className="w-full">
        <div className="relative">
          <input
            ref={ref}
            id={id}
            className={finalClassName}
            disabled={loading || disabled}
            aria-describedby={finalAriaDescribedBy}
            {...props}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="animate-spin h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
        </div>

        {error && (
          <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
            {error}
          </p>
        )}

        {helpText && !error && (
          <p id={`${id}-help`} className="mt-1 text-xs text-slate-500">
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
