import React from 'react';
import { ShieldCheck, UserCheck, Users, ShieldAlert } from 'lucide-react';
import { Tier } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface TierBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tier: Tier;
  rule?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const TIER_CONFIG: Record<
  Tier,
  {
    code: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  T1: {
    code: 'Tier 1',
    label: 'Auto',
    icon: ShieldCheck,
    className: 'bg-[var(--tier-t1-bg)] border-[var(--tier-t1-border)] text-[var(--tier-t1-text)]',
  },
  T2A: {
    code: 'Tier 2A',
    label: 'Merchant confirms',
    icon: UserCheck,
    className: 'bg-[var(--tier-t2a-bg)] border-[var(--tier-t2a-border)] text-[var(--tier-t2a-text)]',
  },
  T2B: {
    code: 'Tier 2B',
    label: 'Human approves',
    icon: Users,
    className: 'bg-[var(--tier-t2b-bg)] border-[var(--tier-t2b-border)] text-[var(--tier-t2b-text)]',
  },
  T3: {
    code: 'Tier 3',
    label: 'Human only',
    icon: ShieldAlert,
    className: 'bg-[var(--tier-t3-bg)] border-[var(--tier-t3-border)] text-[var(--tier-t3-text)]',
  },
};

export function TierBadge({
  tier,
  rule,
  size = 'md',
  showLabel = true,
  className,
  ...props
}: TierBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.T1;
  const Icon = config.icon;

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 border',
    md: 'text-xs px-2.5 py-1 gap-1.5 border font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 border-2 font-bold',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full select-none whitespace-nowrap transition-all shadow-xs',
        config.className,
        sizeStyles[size],
        className
      )}
      {...props}
    >
      <Icon className={cn('shrink-0 stroke-[2.2]', iconSizes[size])} />
      <span>{config.code}</span>
      {showLabel && <span className="font-normal opacity-90">({config.label})</span>}
      {rule && (
        <span className="ml-1 pl-1.5 border-l border-current/30 opacity-75 font-mono text-[11px] font-normal">
          {rule}
        </span>
      )}
    </span>
  );
}
