import React from 'react';
import { Card } from './Card';
import { cn } from '@/lib/utils';

export interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  badge?: string;
  highlightZero?: boolean;
}

export function KpiCard({
  title,
  value,
  subtext,
  icon,
  badge,
  highlightZero = false,
  className,
  ...props
}: KpiCardProps) {
  const isZero = value === 0 || value === '0';

  return (
    <Card className={cn('flex flex-col justify-between p-4 sm:p-5', className)} {...props}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          {title}
        </span>
        {icon && <div className="text-brand-500 shrink-0">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'text-3xl font-extrabold tracking-tight font-heading',
            highlightZero && isZero ? 'text-online' : 'text-text'
          )}
        >
          {value}
        </span>
        {badge && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-chip bg-emerald-50 text-online border border-emerald-200">
            {badge}
          </span>
        )}
      </div>

      {subtext && <p className="text-xs text-text-muted mt-2 font-medium">{subtext}</p>}
    </Card>
  );
}
