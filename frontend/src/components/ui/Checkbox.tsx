import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Checkbox label
   */
  label?: string;

  /**
   * Error message to display below checkbox
   */
  error?: string;

  /**
   * Helper text
   */
  helperText?: string;

  /**
   * Indeterminate state
   */
  indeterminate?: boolean;
}

/**
 * Reusable Checkbox Component
 * Checkbox input with label and validation support
 *
 * @example
 * <Checkbox
 *   label="I agree to the terms"
 *   checked={agreed}
 *   onChange={(e) => setAgreed(e.target.checked)}
 * />
 */
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
      <div className={`flex flex-col ${className || ''}`}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              ref={checkboxRef}
              id={finalId}
              type="checkbox"
              className="h-5 w-5 cursor-pointer appearance-none rounded border-2 border-slate-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
              disabled={disabled}
              {...props}
            />
            {(props.checked || indeterminate) && (
              <Check
                size={16}
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white"
              />
            )}
          </div>
          {label && (
            <label
              htmlFor={finalId}
              className={`text-sm font-medium ${
                disabled ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-700'
              }`}
            >
              {label}
            </label>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
