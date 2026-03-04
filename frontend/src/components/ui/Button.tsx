import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style variant
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'danger';

  /**
   * Button size
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Loading state (shows visual feedback, typically prevents interaction)
   * @default false
   */
  loading?: boolean;

  /**
   * Button content
   */
  children: React.ReactNode;
}

/**
 * Reusable Button Component
 * Supports three variants (primary, secondary, danger) and three sizes (sm, md, lg)
 *
 * @example
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Save
 * </Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, className, children, ...props }, ref) => {
    // Size classes
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    // Variant classes
    const variantClasses = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500',
      secondary: 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 active:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-slate-300 disabled:text-slate-500',
    };

    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:cursor-not-allowed';

    const finalClassName = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className || ''}`;

    return (
      <button
        ref={ref}
        className={finalClassName}
        disabled={loading || disabled}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
