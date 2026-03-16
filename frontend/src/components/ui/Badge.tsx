import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
}

const variantClasses = {
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'badge-info',
  neutral: 'badge-neutral',
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant, className, children, ...props }, ref) => {
    return (
      <span ref={ref} className={`badge ${variantClasses[variant]} ${className || ''}`} {...props}>
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
