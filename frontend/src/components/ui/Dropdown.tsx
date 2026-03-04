import React, { useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownOption {
  /**
   * Option value
   */
  value: string;

  /**
   * Display label
   */
  label: string;

  /**
   * Disabled state
   */
  disabled?: boolean;
}

export interface DropdownProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * Dropdown options
   */
  options: DropdownOption[];

  /**
   * Currently selected value
   */
  value?: string;

  /**
   * Callback when selection changes
   */
  onChange?: (value: string) => void;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Disabled state
   */
  disabled?: boolean;
}

/**
 * Reusable Dropdown Component
 * Menu for selecting from a list of options
 *
 * @example
 * <Dropdown
 *   options={[
 *     { value: 'opt1', label: 'Option 1' },
 *     { value: 'opt2', label: 'Option 2' },
 *   ]}
 *   value={selected}
 *   onChange={(val) => setSelected(val)}
 *   placeholder="Select an option"
 * />
 */
const Dropdown = React.forwardRef<HTMLDivElement, DropdownProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = 'Select an option',
      disabled = false,
      className,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const selectedLabel = options.find((opt) => opt.value === value)?.label || placeholder;

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
      }
    }, [isOpen]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    return (
      <div ref={ref} className={`relative w-full ${className || ''}`} {...props}>
        {/* Dropdown button */}
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-slate-200 rounded-md text-left text-sm bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-600 flex items-center justify-between"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={value ? 'text-slate-900' : 'text-slate-500'}>{selectedLabel}</span>
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50">
            <ul
              className="max-h-64 overflow-y-auto"
              role="listbox"
              onKeyDown={handleKeyDown}
            >
              {options.map((option) => (
                <li key={option.value}>
                  <button
                    onClick={() => {
                      onChange?.(option.value);
                      setIsOpen(false);
                    }}
                    disabled={option.disabled}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed ${
                      value === option.value ? 'bg-indigo-100 text-indigo-700 font-medium' : ''
                    }`}
                    role="option"
                    aria-selected={value === option.value}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';

export default Dropdown;
