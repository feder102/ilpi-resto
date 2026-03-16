import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: TabItem[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}

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
        <div className="tabs tabs-bordered" role="tablist">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              disabled={item.disabled}
              className={`tab ${activeTab === item.id ? 'tab-active' : ''}`}
              role="tab"
              aria-selected={activeTab === item.id}
              aria-disabled={item.disabled}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="pt-4">{activeContent}</div>
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';

export default Tabs;
