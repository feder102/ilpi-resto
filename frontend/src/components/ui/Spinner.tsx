import React from 'react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Size of the spinner
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Color of the spinner
   * @default 'indigo'
   */
  color?: 'indigo' | 'slate' | 'white';

  /**
   * Optional label text displayed below spinner
   */
  label?: string;
}

/**
 * Reusable Spinner Component
 * Loading indicator with smooth rotation animation
 *
 * @example
 * <Spinner size="md" color="indigo" label="Loading..." />
 */
const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', color = 'indigo', label, className, ...props }, ref) => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-8 h-8',
      lg: 'w-12 h-12',
    };

    const colorClasses = {
      indigo: 'border-indigo-600',
      slate: 'border-slate-600',
      white: 'border-white',
    };

    const finalClassName = `${sizeClasses[size]} ${className || ''}`;

    return (
      <div ref={ref} className="flex flex-col items-center justify-center gap-2" {...props}>
        <div className={`${finalClassName} border-4 border-opacity-20 border-slate-300 rounded-full animate-spin`}>
          <div className={`w-full h-full border-4 ${colorClasses[color]} border-b-transparent rounded-full`} />
        </div>
        {label && <p className="text-sm text-slate-600">{label}</p>}
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';

export default Spinner;
