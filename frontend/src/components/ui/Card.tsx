import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Card variant/style
   * @default 'default'
   */
  variant?: 'default' | 'elevated';

  /**
   * Card content
   */
  children: React.ReactNode;
}

/**
 * Reusable Card Component
 * Container for grouped content with consistent padding, border, and shadow
 *
 * @example
 * <Card>
 *   <h3 className="font-bold">Title</h3>
 *   <p>Content goes here</p>
 * </Card>
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    const baseClasses = 'rounded-lg border border-slate-200 p-4';

    const variantClasses = {
      default: 'bg-white',
      elevated: 'bg-white shadow-md',
    };

    const finalClassName = `${baseClasses} ${variantClasses[variant]} ${className || ''}`;

    return (
      <div ref={ref} className={finalClassName} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
