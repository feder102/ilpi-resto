import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses = {
  primary: 'btn-primary',
  secondary: 'btn-secondary btn-outline',
  danger: 'btn-error',
};

const sizeClasses = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`btn ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
        disabled={loading || disabled}
        {...props}
      >
        {loading && <span className="loading loading-spinner loading-sm" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
