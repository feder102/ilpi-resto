import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface DropdownProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const Dropdown = React.forwardRef<HTMLDivElement, DropdownProps>(
  ({ options, value, onChange, placeholder = 'Seleccionar...', disabled = false, className, ...props }, ref) => {
    return (
      <div ref={ref} className={`w-full ${className || ''}`} {...props}>
        <select
          className="select select-bordered w-full"
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';

export { ChevronDown };
export default Dropdown;
