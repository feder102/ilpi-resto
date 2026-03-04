import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Badge variant/color
   */
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';

  /**
   * Badge content
   */
  children: React.ReactNode;
}

/**
 * Reusable Badge Component
 * Status labels with semantic colors
 *
 * @example
 * <Badge variant="success">Approved</Badge>
 * <Badge variant="warning">Pending</Badge>
 * <Badge variant="error">Rejected</Badge>
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant, className, children, ...props }, ref) => {
    const variantClasses = {
      success: 'bg-green-100 text-green-700',
      warning: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700',
      info: 'bg-blue-100 text-blue-700',
      neutral: 'bg-slate-100 text-slate-700',
    };

    const baseClasses = 'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium';

    const finalClassName = `${baseClasses} ${variantClasses[variant]} ${className || ''}`;

    return (
      <span ref={ref} className={finalClassName} {...props}>
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
