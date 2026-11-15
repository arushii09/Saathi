'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { listApprovals, decideApproval } from '@/lib/api';
import { ApprovalCard } from '@/components/console/ApprovalCard';
import { CheckSquare, CheckCircle2, RotateCcw, AlertCircle, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function ApprovalsPage() {
  const { data: approvals = [], mutate, error, isLoading } = useSWR(
    'listApprovals',
    listApprovals,
    { refreshInterval: 3000 }
  );

  const [undoItem, setUndoItem] = useState<{ id: string; approved: boolean } | null>(null);

  const handleDecide = useCallback(async (id: string, approve: boolean) => {
    // Optimistic update
    const previous = approvals;
    mutate(approvals.filter(a => a.id !== id), false);

    try {
      await decideApproval(id, approve);
      setUndoItem({ id, approved: approve });
      setTimeout(() => setUndoItem(null), 5000);
      mutate();
    } catch {
      mutate(previous, false);
    }
  }, [approvals, mutate]);

  // Keyboard shortcuts [A] for Approve, [R] for Reject on the first item
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (approvals.length > 0) {
        const topItem = approvals[0];
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          handleDecide(topItem.id, true);
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          handleDecide(topItem.id, false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [approvals, handleDecide]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading font-black text-2xl text-[#002970]">
              Pending Approval Queue
            </h2>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm font-mono">
              {approvals.length} PENDING
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5B7089] font-medium mt-1">
            Tier 2B actions requiring human specialist sign-off before dispatching physical hardware or technicians.
          </p>
        </div>

        {/* Keyboard shortcut guide */}
        <div className="hidden lg:flex items-center gap-3 bg-white border border-[#E8EEF5] px-4 py-2 rounded-2xl shadow-sm text-xs font-medium text-[#5B7089]">
          <span>Shortcuts:</span>
          <span className="flex items-center gap-1 font-mono font-bold text-[#002970]">
            <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[11px]">A</kbd> Approve
          </span>
          <span className="flex items-center gap-1 font-mono font-bold text-[#EE272C]">
            <kbd className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[11px]">R</kbd> Reject
          </span>
        </div>
      </div>

      {/* Undo Toast Notification */}
      <AnimatePresence>
        {undoItem && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#002970] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-4 text-xs font-medium"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00BAF2]" />
              <span>
                Request #{undoItem.id} was <strong>{undoItem.approved ? 'Approved' : 'Rejected'}</strong>.
              </span>
            </div>
            <button
              onClick={() => {
                setUndoItem(null);
                mutate();
              }}
              className="inline-flex items-center gap-1 text-[#00BAF2] hover:text-white font-bold underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Dismiss</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Approval Cards List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 bg-white rounded-3xl border border-[#E8EEF5] p-6 animate-pulse" />
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E8EEF5] p-12 text-center max-w-lg mx-auto shadow-[0_4px_24px_rgba(0,41,112,0.03)] space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#E6F9F0] border border-[#B7EDCE] text-[#00B368] flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-heading font-black text-lg text-[#002970]">
            All Caught Up!
          </h3>
          <p className="text-xs sm:text-sm text-[#5B7089] font-medium leading-relaxed">
            Zero pending approval requests in the queue. All Tier 2B field dispatches have been reviewed.
          </p>
          <div className="pt-2">
            <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
              Auto-refreshing via SWR every 3s
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {approvals.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onDecide={handleDecide}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
