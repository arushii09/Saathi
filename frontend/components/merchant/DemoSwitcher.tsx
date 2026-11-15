'use client';

import React, { useEffect } from 'react';
import { RefreshCw, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DemoSwitcherProps {
  currentMerchantId: string;
  onSelect: (merchantId: string) => void;
  onReset: () => void;
  className?: string;
}

const MERCHANTS = [
  { id: 'm1', label: 'm1: Soundbox Silent', store: 'Ramesh Kirana' },
  { id: 'm2', label: 'm2: Settlement Delay', store: 'Meena Tea' },
  { id: 'm3', label: 'm3: Hardware Fault', store: 'Sharma Sweets' },
  { id: 'm4', label: 'm4: Fraud Dispute', store: 'Iqbal Store' },
  { id: 'm5', label: 'm5: Dual Issue', store: 'Patel Mobile' },
];

export function DemoSwitcher({
  currentMerchantId,
  onSelect,
  onReset,
  className,
}: DemoSwitcherProps) {
  // Keyboard shortcuts 1 to 5
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 5) {
        onSelect(`m${num}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelect]);

  return (
    <div
      className={cn(
        'w-full bg-navy-900 text-white text-xs px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto shadow-xs border-b border-navy-800',
        className
      )}
    >
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-500 border border-brand-500/30">
          Demo Scenarios
        </span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
        {MERCHANTS.map((m, idx) => {
          const isSelected = m.id === currentMerchantId;
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className={cn(
                'px-2 py-1 rounded text-[11px] font-medium transition-all whitespace-nowrap flex items-center gap-1',
                isSelected
                  ? 'bg-brand-500 text-white font-bold shadow-xs'
                  : 'bg-navy-800 text-slate-300 hover:bg-navy-700 hover:text-white'
              )}
              title={`Shortcut: ${idx + 1}`}
            >
              <span className="opacity-70 font-mono text-[10px]">[{idx + 1}]</span>
              <span>{m.id}</span>
              <span className="hidden sm:inline opacity-80 text-[10px]">({m.store})</span>
            </button>
          );
        })}
      </div>

      <div className="shrink-0 flex items-center gap-2">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white transition-colors text-[11px] font-medium border border-navy-700"
          title="Reset demo state"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </div>
  );
}
