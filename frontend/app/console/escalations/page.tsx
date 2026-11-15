'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { listEscalations } from '@/lib/api';
import { CaseFile } from '@/components/console/CaseFile';
import { CaseFile as CaseFileType } from '@/lib/types';
import {
  ShieldAlert,
  Store,
  ChevronRight,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EscalationsPage() {
  const { data: escalations = [], isLoading } = useSWR(
    'listEscalations',
    listEscalations,
    { refreshInterval: 3000 }
  );

  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const selectedCase: CaseFileType | undefined = escalations[selectedIndex];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="font-heading font-black text-2xl text-[#002970]">
            Tier 3 Escalation Inbox
          </h2>
          <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#EE272C] text-white shadow-sm font-mono">
            {escalations.length} ESCALATED
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5B7089] font-medium mt-1">
          High-risk cases (money disputes, fraud, KYC) handed off with zero-repetition AI Case Files.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-white rounded-3xl border border-[#E8EEF5] animate-pulse" />
          <div className="lg:col-span-2 h-96 bg-white rounded-3xl border border-[#E8EEF5] animate-pulse" />
        </div>
      ) : escalations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E8EEF5] p-12 text-center max-w-lg mx-auto shadow-[0_4px_24px_rgba(0,41,112,0.03)] space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#E6F9F0] border border-[#B7EDCE] text-[#00B368] flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-heading font-black text-lg text-[#002970]">
            Zero Escalations Pending
          </h3>
          <p className="text-xs sm:text-sm text-[#5B7089] font-medium leading-relaxed">
            All merchant escalations have been assigned or resolved. AI guardrails are actively monitoring new transactions.
          </p>
        </div>
      ) : (
        /* Split Pane Layout */
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] gap-6 items-start">
          
          {/* Left Column: Escalations List */}
          <div className="bg-white rounded-3xl border border-[#E8EEF5] shadow-[0_4px_24px_rgba(0,41,112,0.04)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E8EEF5] bg-gradient-to-r from-[#F9FBFE] to-white flex items-center justify-between">
              <span className="font-heading font-black text-xs text-[#002970] uppercase tracking-wider">
                Case Files ({escalations.length})
              </span>
              <span className="text-[10px] font-bold text-[#00B368] bg-[#E6F9F0] px-2 py-0.5 rounded-full border border-[#B7EDCE]">
                100% COMPLETE HANDOFF
              </span>
            </div>

            <div className="divide-y divide-[#E8EEF5]">
              {escalations.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={cn(
                      'w-full p-4 text-left transition-all hover:bg-[#F5F9FD] flex items-start gap-3 group',
                      isSelected
                        ? 'bg-[#EBF7FD]/80 border-l-4 border-[#00BAF2]'
                        : 'border-l-4 border-transparent'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs',
                      isSelected ? 'bg-[#00BAF2] text-white shadow-sm' : 'bg-red-50 text-[#EE272C]'
                    )}>
                      <ShieldAlert className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-sm text-[#002970] truncate">
                          {item.merchant.name}
                        </span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                          Tier 3
                        </span>
                      </div>
                      <p className="text-xs text-[#5B7089] truncate font-medium">
                        {item.merchant.city} • {item.merchant.soundbox_id}
                      </p>
                      <p className="text-xs text-[#EE272C] font-semibold mt-1 truncate">
                        {item.escalation_reason}
                      </p>
                    </div>

                    <ChevronRight className={cn(
                      'w-4 h-4 text-slate-300 ml-1 shrink-0 group-hover:text-[#00BAF2] transition-colors',
                      isSelected && 'text-[#00BAF2]'
                    )} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Full CaseFile View */}
          <div className="min-w-0">
            {selectedCase ? (
              <CaseFile caseFile={selectedCase} />
            ) : (
              <div className="bg-white rounded-3xl border border-[#E8EEF5] p-12 text-center text-slate-400">
                Select an escalation on the left to inspect its complete AI case file.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
