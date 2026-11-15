import React from 'react';
import { cn } from '@/lib/utils';

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Timeline({ children, className, ...props }: TimelineProps) {
  return (
    <div className={cn('relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border', className)} {...props}>
      {children}
    </div>
  );
}

export interface TimelineNodeProps extends React.HTMLAttributes<HTMLDivElement> {
  stepNo?: number;
  timeOffset?: string;
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'tier1' | 'tier2a' | 'tier2b' | 'tier3';
  icon?: React.ReactNode;
}

export function TimelineNode({
  stepNo,
  timeOffset,
  variant = 'brand',
  icon,
  children,
  className,
  ...props
}: TimelineNodeProps) {
  const variantStyles = {
    brand: 'bg-brand-500 border-white text-white',
    success: 'bg-online border-white text-white',
    warning: 'bg-amber-500 border-white text-white',
    danger: 'bg-offline border-white text-white',
    neutral: 'bg-slate-400 border-white text-white',
    tier1: 'bg-[var(--tier-t1-border)] border-white text-white',
    tier2a: 'bg-[var(--tier-t2a-border)] border-white text-white',
    tier2b: 'bg-[var(--tier-t2b-border)] border-white text-white',
    tier3: 'bg-[var(--tier-t3-border)] border-white text-white',
  };

  return (
    <div className={cn('relative flex flex-col group', className)} {...props}>
      {/* Node pin */}
      <div
        className={cn(
          'absolute -left-6 top-1 flex items-center justify-center w-5 h-5 rounded-full border-2 text-[10px] font-bold shadow-soft transition-transform group-hover:scale-110',
          variantStyles[variant]
        )}
      >
        {icon || stepNo}
      </div>

      {/* Header if stepNo or timeOffset */}
      {(stepNo !== undefined || timeOffset) && (
        <div className="flex items-center gap-2 mb-1 text-xs text-text-muted">
          {stepNo !== undefined && <span className="font-semibold text-text">Step {stepNo}</span>}
          {timeOffset && <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{timeOffset}</span>}
        </div>
      )}

      {/* Content */}
      <div className="text-sm">{children}</div>
    </div>
  );
}
