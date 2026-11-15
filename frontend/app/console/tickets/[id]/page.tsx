'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { getTicket } from '@/lib/api';
import { TraceTimeline } from '@/components/console/TraceTimeline';
import { TierBadge } from '@/components/ui/TierBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatRelativeTime, formatTime } from '@/lib/format';
import {
  ArrowLeft,
  Store,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Wifi,
  Radio,
  FileText,
  AlertCircle,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TicketTracePage() {
  const params = useParams();
  const ticketId = String(params.id);

  // Poll active tickets every 2000ms, resolved tickets every 10000ms
  const { data: ticket, isLoading, error } = useSWR(
    ticketId ? `ticket-${ticketId}` : null,
    () => getTicket(ticketId),
    {
      refreshInterval: (t) => {
        if (!t) return 2000;
        const isActive = t.status === 'open' || t.status === 'awaiting_merchant' || t.status === 'awaiting_human';
        return isActive ? 2000 : 10000;
      },
    }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-white rounded-3xl border border-[#E8EEF5] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white rounded-3xl border border-[#E8EEF5] animate-pulse" />
          <div className="h-96 bg-white rounded-3xl border border-[#E8EEF5] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="bg-white rounded-3xl border border-[#E8EEF5] p-12 text-center max-w-lg mx-auto space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="font-heading font-black text-lg text-[#002970]">
          Ticket Not Found
        </h2>
        <p className="text-xs text-[#5B7089]">
          No ticket exists with ID <code>#{ticketId}</code>.
        </p>
        <Link
          href="/console/tickets"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00BAF2] text-white text-xs font-bold shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Tickets</span>
        </Link>
      </div>
    );
  }

  const getTierExplanation = (tier: string | null) => {
    switch (tier) {
      case 'T1':
        return {
          title: 'Tier 1 — Fully Autonomous Read/Explain',
          summary: 'Read-only diagnostics and explanations. AI operates freely without asking permission.',
          allowed: ['Query heartbeat & device telemetry', 'Query settlement batch cycles', 'Audio response delivery'],
          blocked: ['Device restart', 'Technician dispatch', 'Payment re-routing'],
        };
      case 'T2A':
        return {
          title: 'Tier 2A — Merchant Interactively Confirms',
          summary: 'Actions with minor side effects. AI diagnoses problem, asks merchant for confirmation, and only acts on explicit "Yes".',
          allowed: ['Remote Soundbox device restart', 'Network reconnection ping'],
          blocked: ['Technician dispatch', 'Balance modifications'],
        };
      case 'T2B':
        return {
          title: 'Tier 2B — Human Support Agent Approves',
          summary: 'Actions carrying physical or dispatch costs. AI places ticket in approval queue for specialist review.',
          allowed: ['Queue technician dispatch recommendation', 'Prepare device RMA file'],
          blocked: ['Automatic dispatch without agent approval'],
        };
      case 'T3':
        return {
          title: 'Tier 3 — Human Only (Zero AI Autonomy)',
          summary: 'Money movement, disputed debits, fraud, KYC. Saathi NEVER acts on money. Prepares comprehensive case file for human escalation.',
          allowed: ['Compile diagnostic Case File', 'Provide empathetic holding message'],
          blocked: ['Any modification of funds or banking records'],
        };
      default:
        return {
          title: 'Unclassified / Open',
          summary: 'Evaluating appropriate guardrails.',
          allowed: [],
          blocked: [],
        };
    }
  };

  const tierInfo = getTierExplanation(ticket.tier);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Ticket Header */}
      <div className="bg-white rounded-3xl border border-[#E8EEF5] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,41,112,0.04)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/console/tickets"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00BAF2] hover:text-[#002970] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Tickets</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5B7089]">
              Created {formatRelativeTime(ticket.created_at)} ({formatTime(ticket.created_at)})
            </span>
          </div>
        </div>

        {/* Title & Metadata Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-heading font-black text-xl sm:text-2xl text-[#002970]">
                Ticket #{ticket.id}
              </h2>
              {ticket.tier && <TierBadge tier={ticket.tier} size="md" />}
              <StatusPill status={ticket.status} size="md" />
            </div>
            <p className="text-sm font-medium text-slate-700 font-hindi mt-1">
              "{ticket.summary}"
            </p>
          </div>

          {/* Merchant Quick Card */}
          <div className="bg-[#F5F7FA] border border-[#E1EAF2] rounded-2xl p-3 flex items-center gap-3 shrink-0 self-start lg:self-auto">
            <div className="w-10 h-10 rounded-xl bg-[#002970] text-white flex items-center justify-center font-black text-sm">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm text-[#002970]">
                {ticket.merchant?.name || ticket.merchant_id}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#5B7089] mt-0.5 font-medium">
                <span>{ticket.merchant?.city}</span>
                <span>•</span>
                <span className="font-mono text-[10px] bg-white px-1.5 py-0.2 rounded border font-bold text-slate-800">
                  {ticket.merchant?.soundbox_id}
                </span>
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  ticket.merchant?.device_status === 'online' ? 'bg-[#00B368]' : 'bg-[#EE272C]'
                )} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-6 items-start">
        
        {/* Left Column: Trace Timeline (Hero) */}
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-black text-base text-[#002970]">
                Decision Trace Timeline
              </h3>
              <span className="text-[11px] font-mono font-bold bg-[#EBF7FD] text-[#00BAF2] px-2 py-0.5 rounded-full border border-[#D0EBFB]">
                {ticket.events?.length || 0} STEPS
              </span>
            </div>
            <span className="text-xs text-[#5B7089] font-medium">
              Deterministic Execution Flow
            </span>
          </div>

          <TraceTimeline events={ticket.events || []} />
        </div>

        {/* Right Column: Policy Guardrails & Telemetry Sidebar */}
        <aside className="space-y-5 min-w-0">
          
          {/* Policy Guardrail Card */}
          <div className="bg-white rounded-3xl border border-[#E8EEF5] shadow-[0_4px_24px_rgba(0,41,112,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8EEF5] bg-gradient-to-r from-[#F9FBFE] to-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00BAF2]" />
                <h4 className="font-heading font-black text-sm text-[#002970]">Safety Policy Guardrail</h4>
              </div>
              {ticket.tier && <TierBadge tier={ticket.tier} size="sm" />}
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="font-bold text-xs text-[#002970] block mb-1">
                  {tierInfo.title}
                </span>
                <p className="text-xs text-[#5B7089] leading-relaxed font-medium">
                  {tierInfo.summary}
                </p>
              </div>

              {/* Allowed vs Blocked Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-black uppercase text-[#00B368] tracking-wider block">
                  Autonomous Actions Permitted
                </span>
                <ul className="text-xs text-slate-700 space-y-1 font-medium">
                  {tierInfo.allowed.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00B368] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-black uppercase text-[#EE272C] tracking-wider block">
                  Strictly Prohibited
                </span>
                <ul className="text-xs text-slate-700 space-y-1 font-medium">
                  {tierInfo.blocked.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#EE272C] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Soundbox Telemetry Card */}
          <div className="bg-white rounded-3xl border border-[#E8EEF5] shadow-[0_4px_24px_rgba(0,41,112,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8EEF5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-[#00BAF2]" />
                <h4 className="font-heading font-black text-sm text-[#002970]">Soundbox Telemetry</h4>
              </div>
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                ticket.merchant?.device_status === 'online'
                  ? 'bg-[#E6F9F0] text-[#00B368] border-[#B7EDCE]'
                  : 'bg-[#FEEBEB] text-[#EE272C] border-[#FBC4C4]'
              )}>
                {ticket.merchant?.device_status === 'online' ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#5B7089] font-medium">Device Hardware ID</span>
                <span className="font-mono font-bold text-[#002970]">{ticket.merchant?.soundbox_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5B7089] font-medium">Last Heartbeat Ping</span>
                <span className="font-mono text-slate-700">{ticket.merchant?.last_heartbeat ? formatRelativeTime(ticket.merchant.last_heartbeat) : 'Just now'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5B7089] font-medium">Interaction Channel</span>
                <span className="font-bold text-[#002970] capitalize">{ticket.source}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5B7089] font-medium">Spoken Language</span>
                <span className="font-mono uppercase font-bold text-[#00BAF2]">{ticket.language}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
