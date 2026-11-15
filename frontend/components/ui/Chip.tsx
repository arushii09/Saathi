import React from 'react';
import { cn } from '@/lib/utils';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'brand' | 'neutral';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export function Chip({
  className,
  variant = 'default',
  size = 'md',
  icon,
  children,
  ...props
}: ChipProps) {
  const variants = {
    default: 'bg-surface text-text border border-border',
    brand: 'bg-sky-50 text-brand-600 border border-brand-500/20 font-medium',
    success: 'bg-emerald-50 text-online border border-emerald-300 font-medium',
    warning: 'bg-amber-50 text-amber-700 border border-amber-300 font-medium',
    danger: 'bg-red-50 text-offline border border-red-200 font-medium',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip leading-none select-none transition-colors',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
