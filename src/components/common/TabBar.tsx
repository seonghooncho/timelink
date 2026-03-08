import React from 'react';

interface Tab {
  key: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

const TabBar: React.FC<TabBarProps> = ({ tabs, activeKey, onChange, className = '' }) => {
  return (
    <div className={`flex items-center gap-1 px-5 py-2.5 ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeKey === tab.key
              ? 'bg-foreground text-background shadow-soft'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabBar;
