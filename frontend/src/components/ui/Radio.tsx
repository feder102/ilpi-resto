import React from 'react';

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLFieldSetElement>, 'onChange'> {
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  legend?: string;
  orientation?: 'vertical' | 'horizontal';
  error?: string;
  disabled?: boolean;
}

const RadioGroup = React.forwardRef<HTMLFieldSetElement, RadioGroupProps>(
  ({ options, value, onChange, legend, orientation = 'vertical', error, disabled, className, ...props }, ref) => {
    const groupId = React.useId();
    return (
      <fieldset ref={ref} className={className || ''} disabled={disabled} {...props}>
        {legend && <legend className="text-sm font-medium mb-2">{legend}</legend>}
        <div className={orientation === 'horizontal' ? 'flex flex-wrap items-center gap-4' : 'space-y-2'}>
          {options.map((option) => (
            <label key={option.value} className="flex items-center cursor-pointer gap-3" htmlFor={`${groupId}-${option.value}`}>
              <input
                type="radio"
                id={`${groupId}-${option.value}`}
                name={groupId}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={option.disabled || disabled}
                className="radio radio-primary"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
        {error && <p className="text-error text-xs mt-1">{error}</p>}
      </fieldset>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';

export default RadioGroup;
