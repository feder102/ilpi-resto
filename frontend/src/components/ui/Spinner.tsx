import React from 'react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  color?: 'indigo' | 'slate' | 'white';
  label?: string;
}

const sizeClasses = {
  sm: 'loading-sm',
  md: 'loading-md',
  lg: 'loading-lg',
};

const colorClasses = {
  indigo: 'text-primary',
  slate: 'text-neutral',
  white: 'text-base-100',
};

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', color = 'indigo', label, className, ...props }, ref) => {
    return (
      <div ref={ref} className={`flex flex-col items-center justify-center gap-2 ${className || ''}`} {...props}>
        <span className={`loading loading-spinner ${sizeClasses[size]} ${colorClasses[color]}`} />
        {label && <p className="text-sm text-base-content/60">{label}</p>}
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';

export default Spinner;
