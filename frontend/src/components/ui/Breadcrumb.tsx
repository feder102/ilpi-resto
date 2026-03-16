import React from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLDivElement> {
  items: BreadcrumbItem[];
  onNavigate?: (href: string, label: string) => void;
}

const Breadcrumb = React.forwardRef<HTMLDivElement, BreadcrumbProps>(
  ({ items, onNavigate, className, ...props }, ref) => {
    return (
      <div ref={ref} className={`breadcrumbs text-sm ${className || ''}`} {...props}>
        <ul>
          {items.map((item, index) => (
            <li key={index}>
              {item.href && !item.current ? (
                <button
                  onClick={() => onNavigate?.(item.href!, item.label)}
                  className="link link-primary"
                >
                  {item.label}
                </button>
              ) : (
                <span className={item.current ? 'font-medium' : ''} aria-current={item.current ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }
);

Breadcrumb.displayName = 'Breadcrumb';

export default Breadcrumb;
