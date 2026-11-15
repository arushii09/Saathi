'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface SegmentedProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Segmented<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: SegmentedProps<T>) {
  const sizeStyles = {
    sm: 'p-0.5 text-xs',
    md: 'p-1 text-sm',
    lg: 'p-1.5 text-base',
  };

  const itemSizeStyles = {
    sm: 'px-2.5 py-1 min-h-[30px]',
    md: 'px-3.5 py-1.5 min-h-[38px]',
    lg: 'px-4.5 py-2 min-h-[46px]',
  };

  return (
    <div
      role="radiogroup"
      className={cn(
        'relative inline-flex items-center bg-slate-100 rounded-btn border border-border select-none',
        sizeStyles[size],
        className
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-10 inline-flex items-center justify-center gap-1.5 font-medium transition-colors duration-150 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              itemSizeStyles[size],
              isSelected ? 'text-navy-900 font-semibold' : 'text-text-muted hover:text-text'
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="segmented-indicator"
                className="absolute inset-0 bg-white rounded-md shadow-soft -z-10 border border-slate-200/60"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
