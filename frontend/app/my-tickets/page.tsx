'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { listMyTickets, getMyProfile, logout } from '@/lib/api';
import { getAuthSession, getCurrentMerchant, isAuthenticated } from '@/lib/auth';
import { TicketDetail, Merchant } from '@/lib/types';
import { StatusPill } from '@/components/ui/StatusPill';
import { TierBadge } from '@/components/ui/TierBadge';
import { LangToggle } from '@/components/merchant/LangToggle';
import { Language, t } from '@/lib/i18n';
import { formatRelativeTime } from '@/lib/format';
import {
  Store,
  Ticket,
  Clock,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Radio,
  LogOut,
  Sparkles,
  RefreshCw,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MyTicketsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('hi');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Auth Guard: redirect to /login if unauthenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  // Load merchant profile
  const { data: merchant } = useSWR('myProfile', getMyProfile);

  // Load merchant-scoped tickets exclusively
  const { data: tickets = [], isLoading, mutate } = useSWR(
    'myTickets',
    listMyTickets,
    { refreshInterval: 4000 }
  );

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return t.id.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col font-body text-[#0F2038]">

      {/* ── Official Paytm-Style Clean Header ── */}
      <header className="bg-white border-b border-[#E8EEF5] sticky top-0 z-50 shadow-[0_2px_12px_rgba(0,41,112,0.04)]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between gap-4">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 focus:outline-none">
              <span className="font-heading font-black text-2xl sm:text-3xl tracking-tight text-[#002970]">
                pay<span className="text-[#00BAF2]">tm</span>
              </span>
              <div className="flex flex-col ml-1 border-l border-slate-300 pl-2">
                <span className="text-[11px] font-extrabold text-[#002970] uppercase tracking-wider leading-none">
                  Soundbox
                </span>
                <span className="text-[10px] font-bold text-[#00BAF2] tracking-wide leading-tight">
                  Saathi AI
                </span>
              </div>
            </Link>
          </div>

          {/* Scoped Merchant Navbar: Only Chat and My Tickets */}
          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className="px-4 py-2 rounded-full text-xs font-bold text-[#5B7089] hover:text-[#002970] hover:bg-slate-100 transition-all"
            >
              <span className="hidden sm:inline">🎙️ </span>Chat
            </Link>
            <Link
              href="/my-tickets"
              className="px-4 py-2 rounded-full text-xs font-bold bg-[#EBF7FD] text-[#002970] border border-[#D0EBFB] shadow-sm transition-all"
            >
              My Tickets
            </Link>
          </nav>

          {/* Right side: LangToggle + Merchant Profile & Logout */}
          <div className="flex items-center gap-2.5">
            <LangToggle value={lang} onChange={setLang} />

            {merchant && (
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200 text-xs">
                <div className="w-7 h-7 rounded-full bg-[#002970] text-white flex items-center justify-center font-bold text-xs">
                  {merchant.name.charAt(0)}
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-[#002970] truncate max-w-[120px]">{merchant.name}</span>
                  <span className="text-[10px] text-slate-500">{merchant.city}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-full text-slate-400 hover:text-[#EE272C] hover:bg-red-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Merchant Store Status Banner ── */}
      {merchant && (
        <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 pt-5">
          <div className="bg-gradient-to-r from-[#EBF7FD] via-[#F3FAFE] to-[#EBF7FD] border border-[#DCEEFB] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#002970] to-[#0D3C7E] text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                {merchant.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading font-black text-lg sm:text-xl text-[#002970]">
                    {merchant.name}
                  </h1>
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                    merchant.device_status === 'online'
                      ? 'bg-[#E6F9F0] text-[#00B368] border-[#B7EDCE]'
                      : 'bg-[#FEEBEB] text-[#EE272C] border-[#FBC4C4]'
                  )}>
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      merchant.device_status === 'online' ? 'bg-[#00B368] animate-pulse' : 'bg-[#EE272C]'
                    )} />
                    <span>Soundbox {merchant.device_status}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#5B7089] font-medium mt-0.5">
                  <span>{merchant.city}</span>
                  <span>•</span>
                  <span className="font-mono text-xs font-bold text-[#002970] bg-white px-2 py-0.5 rounded border border-slate-200">
                    {merchant.soundbox_id}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/"
                className="px-4 py-2 rounded-2xl bg-[#00BAF2] hover:bg-[#009EDB] text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
              >
                <span>Speak with Saathi</span>
                <Sparkles className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Area: My Tickets ── */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">

        {/* Toolbar & Filter Bar */}
        <div className="bg-white rounded-3xl border border-[#E8EEF5] p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,41,112,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="font-heading font-black text-xl text-[#002970]">
              My Support Tickets
            </h2>
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EBF7FD] text-[#00BAF2] border border-[#D0EBFB]">
              {tickets.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Segmented Buttons */}
            <div className="flex items-center gap-1 bg-[#F0F5FA] p-1 rounded-2xl border border-slate-200 text-xs font-bold">
              {[
                { id: 'all', label: 'All' },
                { id: 'resolved', label: 'Resolved' },
                { id: 'awaiting_merchant', label: 'Needs Action' },
                { id: 'escalated', label: 'Escalated' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatusFilter(s.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl transition-all',
                    statusFilter === s.id
                      ? 'bg-white text-[#002970] shadow-sm font-extrabold'
                      : 'text-[#5B7089] hover:text-[#002970]'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => mutate()}
              className="p-2 rounded-xl border border-slate-200 hover:border-[#00BAF2] hover:bg-[#EBF7FD] text-[#00BAF2] transition-colors"
              title="Refresh Tickets"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tickets List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white rounded-3xl border border-[#E8EEF5] animate-pulse" />
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E8EEF5] p-12 text-center max-w-md mx-auto shadow-sm space-y-3">
            <Ticket className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-heading font-black text-base text-[#002970]">
              No Tickets Found
            </h3>
            <p className="text-xs text-[#5B7089]">
              {statusFilter !== 'all'
                ? `No ${statusFilter.replace('_', ' ')} tickets for your account.`
                : 'You have zero support issues. Your Soundbox is operating smoothly.'}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00BAF2] text-white text-xs font-bold shadow-sm"
            >
              <span>Ask Saathi a question</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => {
              const isExpanded = expandedId === ticket.id;
              return (
                <div
                  key={ticket.id}
                  className="bg-white rounded-3xl border border-[#E8EEF5] shadow-[0_4px_24px_rgba(0,41,112,0.03)] overflow-hidden transition-all hover:border-[#D0EBFB]"
                >
                  {/* Card Header (Click to toggle detail view) */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                    className="p-5 sm:p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none hover:bg-[#F9FBFE] transition-colors"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#00BAF2]">
                          #{ticket.id}
                        </span>
                        <StatusPill status={ticket.status} size="sm" />
                        {ticket.tier && <TierBadge tier={ticket.tier} size="sm" />}
                        <span className="text-[11px] text-[#5B7089] ml-1">
                          • {formatRelativeTime(ticket.created_at)}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-[#002970] font-hindi leading-snug">
                        "{ticket.summary}"
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className="text-xs font-bold text-[#00BAF2]">
                        {isExpanded ? 'Hide Details' : 'View Details'}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[#00BAF2]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#00BAF2]" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail View */}
                  {isExpanded && (
                    <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-4">
                      
                      {/* Ticket Diagnostic Timeline */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-[#002970] uppercase tracking-wider block">
                          Saathi Actions & Verification History
                        </span>
                        
                        <div className="space-y-2">
                          {(ticket.events || []).map((ev, i) => (
                            <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center justify-between text-[#5B7089]">
                                <span className="font-bold text-[#002970] uppercase text-[10px]">
                                  Step {ev.step_no}: {ev.type.replace(/_/g, ' ')}
                                </span>
                                <span className="font-mono text-[10px]">{formatRelativeTime(ev.ts)}</span>
                              </div>
                              {Boolean(ev.payload?.transcript) && (
                                <p className="font-hindi text-slate-700 font-medium">
                                  "{String(ev.payload.transcript)}"
                                </p>
                              )}
                              {Boolean(ev.payload?.reply_text) && (
                                <p className="font-hindi text-[#002970] font-semibold bg-[#EBF7FD] p-2 rounded-lg">
                                  Saathi: "{String(ev.payload.reply_text)}"
                                </p>
                              )}
                              {Boolean(ev.payload?.reason) && (
                                <p className="text-slate-600">
                                  <strong>Guardrail note:</strong> {String(ev.payload.reason)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-[#E8EEF5] mt-auto">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5B7089]">
          <div className="flex items-center gap-2">
            <span className="font-heading font-black text-[#002970] text-base tracking-tight">
              pay<span className="text-[#00BAF2]">tm</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-[#002970]">Merchant Support Portal</span>
          </div>

          <span className="text-xs text-slate-500">
            Scoped Access Active • All interactions encrypted
          </span>
        </div>
      </footer>
    </div>
  );
}
