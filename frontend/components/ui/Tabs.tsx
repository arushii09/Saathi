'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pills';
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className,
}: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-1',
        variant === 'underline' ? 'border-b border-border' : 'bg-surface p-1 rounded-btn border border-border',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium transition-all duration-150 select-none relative',
              variant === 'underline'
                ? isActive
                  ? 'text-brand-600 font-semibold border-b-2 border-brand-500'
                  : 'text-text-muted hover:text-text'
                : isActive
                ? 'bg-white text-navy-900 rounded-md shadow-soft font-semibold'
                : 'text-text-muted hover:text-text rounded-md'
            )}
          >
            {tab.icon && <span className="w-4 h-4 shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'ml-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none',
                  isActive
                    ? 'bg-brand-500 text-white'
                    : 'bg-slate-200 text-slate-700'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
