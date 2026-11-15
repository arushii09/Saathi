import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TicketStatus } from '@/lib/types';

export type StatusPillType = TicketStatus | 'online' | 'offline' | 'waiting' | 'in_progress';

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusPillType;
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusPill({ status, label, size = 'md', className, ...props }: StatusPillProps) {
  const configs: Record<
    StatusPillType,
    { defaultLabel: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    resolved: {
      defaultLabel: 'Resolved automatically',
      bg: 'bg-emerald-50',
      text: 'text-online',
      border: 'border-emerald-300',
      icon: CheckCircle2,
    },
    online: {
      defaultLabel: 'Online',
      bg: 'bg-emerald-50',
      text: 'text-online',
      border: 'border-emerald-300',
      icon: CheckCircle2,
    },
    offline: {
      defaultLabel: 'Offline',
      bg: 'bg-red-50',
      text: 'text-offline',
      border: 'border-red-300',
      icon: AlertOctagon,
    },
    awaiting_merchant: {
      defaultLabel: 'Waiting for confirmation',
      bg: 'bg-sky-50',
      text: 'text-brand-600',
      border: 'border-sky-300',
      icon: Clock,
    },
    waiting: {
      defaultLabel: 'Waiting for you',
      bg: 'bg-sky-50',
      text: 'text-brand-600',
      border: 'border-sky-300',
      icon: Clock,
    },
    awaiting_human: {
      defaultLabel: 'Waiting for support approval',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-300',
      icon: Clock,
    },
    escalated: {
      defaultLabel: 'Our team will contact you',
      bg: 'bg-red-50',
      text: 'text-offline',
      border: 'border-red-200',
      icon: AlertTriangle,
    },
    open: {
      defaultLabel: 'Open',
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      border: 'border-slate-300',
      icon: Clock,
    },
    in_progress: {
      defaultLabel: 'In progress',
      bg: 'bg-sky-50',
      text: 'text-brand-500',
      border: 'border-brand-500/30',
      icon: Clock,
    },
    failed: {
      defaultLabel: 'Something went wrong',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-300',
      icon: HelpCircle,
    },
  };

  const current = configs[status] || configs.open;
  const Icon = current.icon;

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip border select-none transition-all',
        current.bg,
        current.text,
        current.border,
        sizeStyles[size],
        className
      )}
      {...props}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{label || current.defaultLabel}</span>
    </span>
  );
}
