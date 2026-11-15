'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { Tier } from '@/lib/types';
import { TierBadge } from '@/components/ui/TierBadge';
import { cn } from '@/lib/utils';

export interface TierChartProps {
  data: Record<Tier, number>;
  className?: string;
}

const TIER_COLORS: Record<Tier, string> = {
  T1: '#12A150',   // Auto Green
  T2A: '#1D6FE0',  // Merchant Confirms Blue
  T2B: '#D98100',  // Support Approves Amber
  T3: '#D93636',   // Human Only Red
};

const TIER_LABELS: Record<Tier, string> = {
  T1: 'Tier 1 — Auto (Read-only)',
  T2A: 'Tier 2A — Merchant Confirms',
  T2B: 'Tier 2B — Support Approves',
  T3: 'Tier 3 — Human Only (Escalated)',
};

export function TierChart({ data, className }: TierChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = [
    { name: 'Tier 1 (Auto)', tier: 'T1' as Tier, value: data.T1 || 0, color: TIER_COLORS.T1 },
    { name: 'Tier 2A (Confirm)', tier: 'T2A' as Tier, value: data.T2A || 0, color: TIER_COLORS.T2A },
    { name: 'Tier 2B (Approve)', tier: 'T2B' as Tier, value: data.T2B || 0, color: TIER_COLORS.T2B },
    { name: 'Tier 3 (Human)', tier: 'T3' as Tier, value: data.T3 || 0, color: TIER_COLORS.T3 },
  ];

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className={cn('bg-white rounded-3xl border border-[#E8EEF5] p-6 shadow-[0_4px_24px_rgba(0,41,112,0.04)]', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-black text-base text-[#002970]">
            Workload Distribution by Safety Tier
          </h3>
          <p className="text-xs text-[#5B7089] font-medium mt-0.5">
            Deterministic segregation of autonomous vs human-supervised queries
          </p>
        </div>
        <span className="font-mono text-xs font-bold bg-[#EBF7FD] text-[#00BAF2] px-2.5 py-1 rounded-full border border-[#D0EBFB]">
          {total} TOTAL TICKETS
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] items-center gap-6">
        {/* Donut Chart */}
        <div className="h-64 relative flex items-center justify-center">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                      return (
                        <div className="bg-[#002970] text-white px-3 py-2 rounded-xl text-xs shadow-xl font-medium">
                          <p className="font-bold">{item.name}</p>
                          <p className="text-[#00BAF2]">{item.value} tickets ({pct}%)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-48 h-48 rounded-full border-4 border-slate-100 animate-pulse" />
          )}

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-heading font-black text-2xl text-[#002970]">{total}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B7089]">Evaluations</span>
          </div>
        </div>

        {/* Legend Breakdown */}
        <div className="space-y-3">
          {chartData.map((item) => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={item.tier} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-bold text-[#002970]">{item.tier}</span>
                  <span className="text-[#5B7089] text-[11px] truncate max-w-[110px]">
                    {item.name.replace(/.*—\s*/, '')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="font-bold text-[#002970]">{item.value}</span>
                  <span className="text-slate-400">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
