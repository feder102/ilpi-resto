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
      <div className="form-control w-full">
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
          <label className="label" id={`${id}-error`}>
            <span className="label-text-alt text-error">{error}</span>
          </label>
        )}
        {helpText && !error && (
          <label className="label" id={`${id}-help`}>
            <span className="label-text-alt">{helpText}</span>
          </label>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
