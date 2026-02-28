import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  /**
   * Breadcrumb label
   */
  label: string;

  /**
   * URL to navigate to (if provided, renders as link)
   */
  href?: string;

  /**
   * Is this the current page
   */
  current?: boolean;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Array of breadcrumb items
   */
  items: BreadcrumbItem[];

  /**
   * Callback when a breadcrumb is clicked
   */
  onNavigate?: (href: string, label: string) => void;
}

/**
 * Reusable Breadcrumb Component
 * Navigation aid showing the current page's position in a hierarchy
 *
 * @example
 * <Breadcrumb
 *   items={[
 *     { label: 'Home', href: '/' },
 *     { label: 'Employees', href: '/employees' },
 *     { label: 'John Doe', current: true },
 *   ]}
 *   onNavigate={(href) => navigate(href)}
 * />
 */
const Breadcrumb = React.forwardRef<HTMLDivElement, BreadcrumbProps>(
  ({ items, onNavigate, className, ...props }, ref) => {
    return (
      <nav ref={ref as React.Ref<HTMLElement>} className={`flex ${className || ''}`} aria-label="Breadcrumb" {...props}>
        <ol className="flex items-center gap-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              {item.href && !item.current ? (
                <button
                  onClick={() => onNavigate?.(item.href!, item.label)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded px-1"
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={`text-sm ${item.current ? 'text-slate-700 font-medium' : 'text-slate-600'}`}
                  aria-current={item.current ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}

              {index < items.length - 1 && (
                <ChevronRight size={16} className="text-slate-400" aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  }
);

Breadcrumb.displayName = 'Breadcrumb';

export default Breadcrumb;
