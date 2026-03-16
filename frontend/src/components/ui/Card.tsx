import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated';
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    const shadow = variant === 'elevated' ? 'shadow-lg' : 'shadow-sm';
    return (
      <div ref={ref} className={`card bg-base-100 ${shadow} ${className || ''}`} {...props}>
        <div className="card-body">
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
