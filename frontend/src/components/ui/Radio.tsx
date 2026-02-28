import React from 'react';

export interface RadioOption {
  /**
   * Radio option value
   */
  value: string;

  /**
   * Display label
   */
  label: string;

  /**
   * Disabled state for this option
   */
  disabled?: boolean;
}

export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * Array of radio options
   */
  options: RadioOption[];

  /**
   * Currently selected value
   */
  value?: string;

  /**
   * Callback when selection changes
   */
  onChange?: (value: string) => void;

  /**
   * Group label/legend
   */
  legend?: string;

  /**
   * Display orientation
   * @default 'vertical'
   */
  orientation?: 'vertical' | 'horizontal';

  /**
   * Error message
   */
  error?: string;

  /**
   * Disabled state for entire group
   */
  disabled?: boolean;
}

/**
 * Reusable Radio Group Component
 * Radio button group with validation support
 *
 * @example
 * <RadioGroup
 *   legend="Select shift type"
 *   options={[
 *     { value: 'morning', label: 'Morning' },
 *     { value: 'afternoon', label: 'Afternoon' },
 *     { value: 'night', label: 'Night' },
 *   ]}
 *   value={selected}
 *   onChange={setSelected}
 * />
 */
const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      options,
      value,
      onChange,
      legend,
      orientation = 'vertical',
      error,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div ref={ref} className={`flex flex-col ${className || ''}`} {...props}>
        {legend && (
          <legend className="mb-3 text-sm font-medium text-slate-900">{legend}</legend>
        )}

        <fieldset
          className={`${
            orientation === 'horizontal'
              ? 'flex flex-wrap items-center gap-6'
              : 'space-y-3'
          }`}
          disabled={disabled}
        >
          {options.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                id={`radio-${option.value}`}
                name={legend || 'radio-group'}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={option.disabled || disabled}
                className="h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-slate-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
              />
              <label
                htmlFor={`radio-${option.value}`}
                className={`text-sm font-medium ${
                  option.disabled || disabled
                    ? 'cursor-not-allowed text-slate-400'
                    : 'cursor-pointer text-slate-700'
                }`}
              >
                {option.label}
              </label>
            </div>
          ))}
        </fieldset>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';

export default RadioGroup;
