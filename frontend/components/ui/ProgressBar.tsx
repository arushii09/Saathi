import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  target?: number; // target marker 0 to 100
  color?: 'brand' | 'online' | 'warning' | 'offline';
  height?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  target,
  color = 'brand',
  height = 'md',
  showLabel = false,
  className,
  ...props
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const colors = {
    brand: 'bg-brand-500',
    online: 'bg-online',
    warning: 'bg-amber-500',
    offline: 'bg-offline',
  };

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full', className)} {...props}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold mb-1 text-text">
          <span>Progress</span>
          <span>{clampedValue.toFixed(1)}%</span>
        </div>
      )}
      <div className={cn('relative w-full rounded-full bg-slate-100 overflow-hidden', heights[height])}>
        <div
          className={cn('h-full transition-all duration-500 ease-out rounded-full', colors[color])}
          style={{ width: `${clampedValue}%` }}
        />
        {target !== undefined && (
          <div
            title={`Target: ${target}%`}
            className="absolute top-0 bottom-0 w-1 bg-navy-900 border-x border-white shadow-xs z-10"
            style={{ left: `${Math.min(100, Math.max(0, target))}%` }}
          />
        )}
      </div>
    </div>
  );
}
