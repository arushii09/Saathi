'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Approval } from '@/lib/types';
import { TierBadge } from '@/components/ui/TierBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatRelativeTime } from '@/lib/format';
import {
  Check,
  X,
  Wrench,
  Store,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ApprovalCardProps {
  approval: Approval;
  onDecide: (id: string, approve: boolean) => Promise<void>;
  keyboardShortcutHint?: boolean;
}

export function ApprovalCard({
  approval,
  onDecide,
  keyboardShortcutHint = true,
}: ApprovalCardProps) {
  const [loadingAction, setLoadingAction] = useState<'approve' | 'reject' | null>(null);

  const handleAction = async (approve: boolean) => {
    setLoadingAction(approve ? 'approve' : 'reject');
    try {
      await onDecide(approval.id, approve);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-3xl border border-[#E8EEF5] shadow-[0_4px_24px_rgba(0,41,112,0.05)] overflow-hidden transition-all hover:shadow-[0_8px_32px_rgba(0,41,112,0.09)]"
    >
      {/* Top Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-[#E8EEF5] bg-gradient-to-r from-[#F9FBFE] to-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#EBF7FD] flex items-center justify-center text-[#00BAF2] border border-[#D0EBFB] shrink-0 font-bold">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-sm text-[#002970]">
                {approval.tool.replace(/_/g, ' ').toUpperCase()}
              </span>
              <TierBadge tier="T2B" size="sm" />
            </div>
            <div className="flex items-center gap-2 text-xs text-[#5B7089] mt-0.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Created {formatRelativeTime(approval.created_at)}</span>
              <span>•</span>
              <span className="font-mono text-[11px] text-[#002970] font-bold">Ticket #{approval.ticket_id}</span>
            </div>
          </div>
        </div>

        {/* Merchant Quick Pill */}
        <div className="flex items-center gap-2 bg-[#F5F7FA] border border-slate-200 px-3 py-1.5 rounded-full text-xs">
          <Store className="w-3.5 h-3.5 text-[#00BAF2]" />
          <span className="font-bold text-[#002970]">{approval.merchant.name}</span>
          <span className="text-slate-400">·</span>
          <span className="text-[#5B7089] font-medium">{approval.merchant.city}</span>
          <span className={cn(
            'w-2 h-2 rounded-full ml-1',
            approval.merchant.device_status === 'online' ? 'bg-[#00B368]' : 'bg-[#EE272C]'
          )} />
        </div>
      </div>

      {/* Body: Reason & Recommended Action */}
      <div className="p-5 sm:p-6 space-y-4">
        {/* Why approval is requested */}
        <div className="bg-[#FFF8EE] border border-[#FDE6C8] rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Diagnosis & Policy Trigger</span>
          </div>
          <p className="text-sm font-semibold text-amber-950 leading-relaxed font-hindi">
            {approval.reason}
          </p>
        </div>

        {/* Recommended Action */}
        <div className="bg-[#F0F7FF] border border-[#D0E6FC] rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#002970] uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00BAF2]" />
            <span>Recommended Action (Tier 2B Guardrail)</span>
          </div>
          <p className="text-sm font-bold text-[#002970] leading-relaxed">
            {approval.recommended_action}
          </p>
        </div>

        {/* Bottom Actions Bar */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
          <Link
            href={`/console/tickets/${approval.ticket_id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00BAF2] hover:text-[#002970] transition-colors group"
          >
            <span>View Full Decision Trace</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* Action Buttons: Reject & Approve */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() => handleAction(false)}
              className="px-4 py-2.5 rounded-2xl bg-white hover:bg-red-50 border border-red-200 text-[#EE272C] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              {loadingAction === 'reject' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              <span>Reject Request</span>
              {keyboardShortcutHint && (
                <kbd className="hidden sm:inline bg-red-100 text-[#EE272C] px-1.5 py-0.5 rounded text-[10px] font-mono ml-0.5">
                  R
                </kbd>
              )}
            </button>

            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() => handleAction(true)}
              className="px-5 py-2.5 rounded-2xl bg-[#00B368] hover:bg-[#009657] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              {loadingAction === 'approve' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>Approve Dispatch</span>
              {keyboardShortcutHint && (
                <kbd className="hidden sm:inline bg-emerald-700/50 text-white px-1.5 py-0.5 rounded text-[10px] font-mono ml-0.5">
                  A
                </kbd>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
