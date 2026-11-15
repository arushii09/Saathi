import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-card bg-surface/50 border border-dashed border-border',
        className
      )}
      {...props}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-text-muted mb-3">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h4 className="font-heading font-semibold text-base text-text mb-1">{title}</h4>
      {description && <p className="text-sm text-text-muted max-w-sm mb-4">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
