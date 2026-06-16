import React from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, helperText, indeterminate, className, disabled, id, ...props }, ref) => {
    const checkboxRef = React.useRef<HTMLInputElement>(null);
    const checkboxId = React.useId();
    const finalId = id || checkboxId;

    React.useImperativeHandle(ref, () => checkboxRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (checkboxRef.current) {
        checkboxRef.current.indeterminate = indeterminate || false;
      }
    }, [indeterminate]);

    return (
      <div className={className || ''}>
        <label className="flex items-center cursor-pointer gap-3" htmlFor={finalId}>
          <input
            ref={checkboxRef}
            id={finalId}
            type="checkbox"
            className={`checkbox checkbox-primary ${error ? 'checkbox-error' : ''}`}
            disabled={disabled}
            {...props}
          />
          {label && <span className="text-sm">{label}</span>}
        </label>
        {error && <p className="text-error text-xs mt-1 ml-1">{error}</p>}
        {helperText && !error && <p className="text-base-content/60 text-xs mt-1 ml-1">{helperText}</p>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
