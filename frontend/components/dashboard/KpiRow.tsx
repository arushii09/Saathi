'use client';

import React from 'react';
import { Metrics } from '@/lib/types';
import {
  Clock,
  Zap,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KpiRowProps {
  metrics: Metrics;
  className?: string;
}

export function KpiRow({ metrics, className }: KpiRowProps) {
  const totalTickets =
    (metrics.tickets_by_tier.T1 || 0) +
    (metrics.tickets_by_tier.T2A || 0) +
    (metrics.tickets_by_tier.T2B || 0) +
    (metrics.tickets_by_tier.T3 || 0);

  const autoResolved = (metrics.tickets_by_tier.T1 || 0) + (metrics.tickets_by_tier.T2A || 0);
  const autoRate = totalTickets > 0 ? Math.round((autoResolved / totalTickets) * 100) : 0;

  const kpis = [
    {
      label: 'Avg Resolution Speed',
      value: `${metrics.avg_time_to_resolution_s}s`,
      target: 'Target < 5.0s',
      status: metrics.avg_time_to_resolution_s <= 5.0 ? 'good' : 'warning',
      icon: Clock,
      sub: 'Voice query to verified resolution',
    },
    {
      label: 'Downtime Recovered',
      value: `${metrics.downtime_minutes_recovered}m`,
      target: 'Soundbox active time',
      status: 'good',
      icon: Zap,
      sub: 'Hours of silent merchant box avoided',
    },
    {
      label: 'Autonomous Resolution',
      value: `${autoRate}%`,
      target: 'Tier 1 & Tier 2A',
      status: autoRate >= 60 ? 'good' : 'neutral',
      icon: CheckCircle2,
      sub: `${autoResolved} of ${totalTickets} resolved without human staff`,
    },
    {
      label: 'Safety Policy Violations',
      value: `${metrics.policy_violations}`,
      target: 'Zero tolerance (0)',
      status: metrics.policy_violations === 0 ? 'good' : 'danger',
      icon: ShieldCheck,
      sub: 'Zero unauthorized balance/money changes',
    },
    {
      label: 'Handoff Completeness',
      value: `${metrics.handoff_completeness}%`,
      target: 'Zero-repetition benchmark',
      status: metrics.handoff_completeness >= 90 ? 'good' : 'warning',
      icon: RotateCcw,
      sub: 'Merchant never repeats problem to agent',
    },
  ];

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4', className)}>
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-3xl border border-[#E8EEF5] p-5 shadow-[0_4px_20px_rgba(0,41,112,0.03)] flex flex-col justify-between transition-all hover:shadow-[0_8px_30px_rgba(0,41,112,0.07)]"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold text-[#5B7089]">
                  {kpi.label}
                </span>
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                  kpi.status === 'good' ? 'bg-[#E6F9F0] text-[#00B368]' : 'bg-[#EBF7FD] text-[#00BAF2]'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="font-heading font-black text-2xl sm:text-3xl text-[#002970] tracking-tight">
                {kpi.value}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-[#00BAF2]">
                {kpi.target}
              </span>
              <span className="text-[10px] text-[#5B7089] font-medium leading-tight">
                {kpi.sub}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
