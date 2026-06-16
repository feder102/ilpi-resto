import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helpText?: string;
  loading?: boolean;
  id: string;
  'aria-describedby'?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, helpText, loading = false, disabled, className, id, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
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
            className={`input input-bordered w-full ${error ? 'input-error' : ''} ${className || ''}`}
            disabled={loading || disabled}
            aria-describedby={finalAriaDescribedBy}
            {...props}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="loading loading-spinner loading-xs" />
            </div>
          )}
        </div>
        {error && (
          <p className="text-error text-xs mt-1" id={`${id}-error`}>{error}</p>
        )}
        {helpText && !error && (
          <p className="text-base-content/60 text-xs mt-1" id={`${id}-help`}>{helpText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
