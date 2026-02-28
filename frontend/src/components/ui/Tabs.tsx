import React from 'react';

export interface TabItem {
  /**
   * Tab identifier
   */
  id: string;

  /**
   * Tab label
   */
  label: string;

  /**
   * Tab content
   */
  content: React.ReactNode;

  /**
   * Disabled state
   */
  disabled?: boolean;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * Array of tab items
   */
  items: TabItem[];

  /**
   * Initially active tab ID
   */
  defaultTab?: string;

  /**
   * Callback when tab changes
   */
  onChange?: (tabId: string) => void;
}

/**
 * Reusable Tabs Component
 * Tab navigation interface for organizing content
 *
 * @example
 * <Tabs
 *   items={[
 *     { id: 'tab1', label: 'Details', content: <DetailContent /> },
 *     { id: 'tab2', label: 'Settings', content: <SettingsContent /> },
 *   ]}
 *   defaultTab="tab1"
 *   onChange={(id) => console.log(id)}
 * />
 */
const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ items, defaultTab, onChange, className, ...props }, ref) => {
    const [activeTab, setActiveTab] = React.useState(defaultTab || items[0]?.id);

    const handleTabChange = (tabId: string) => {
      setActiveTab(tabId);
      onChange?.(tabId);
    };

    const activeContent = items.find((item) => item.id === activeTab)?.content;

    return (
      <div ref={ref} className={`w-full ${className || ''}`} {...props}>
        {/* Tab buttons */}
        <div className="flex border-b border-slate-200">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              disabled={item.disabled}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === item.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              } ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              role="tab"
              aria-selected={activeTab === item.id}
              aria-disabled={item.disabled}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="pt-4">{activeContent}</div>
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';

export default Tabs;
