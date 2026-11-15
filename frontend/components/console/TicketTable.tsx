'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { TicketDetail, TicketStatus, Tier } from '@/lib/types';
import { TierBadge } from '@/components/ui/TierBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatRelativeTime } from '@/lib/format';
import {
  Search,
  Filter,
  ArrowRight,
  Store,
  Clock,
  Radio,
  FileQuestion,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TicketTableProps {
  tickets: TicketDetail[];
  className?: string;
}

export function TicketTable({ tickets, className }: TicketTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesId = t.id.toLowerCase().includes(query);
        const matchesName = t.merchant?.name?.toLowerCase().includes(query);
        const matchesSummary = t.summary?.toLowerCase().includes(query);
        if (!matchesId && !matchesName && !matchesSummary) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }

      // Tier filter
      if (tierFilter !== 'all' && t.tier !== tierFilter) {
        return false;
      }

      return true;
    });
  }, [tickets, searchTerm, statusFilter, tierFilter]);

  return (
    <div className={cn('bg-white rounded-3xl border border-[#E8EEF5] shadow-[0_4px_24px_rgba(0,41,112,0.04)] overflow-hidden', className)}>
      {/* Search & Filters Toolbar */}
      <div className="p-4 sm:p-5 border-b border-[#E8EEF5] bg-gradient-to-r from-[#F9FBFE] to-white flex flex-wrap items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tickets by ID, merchant or issue..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2] text-[#002970] placeholder:text-slate-400 font-medium"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-xl border border-slate-200 text-xs font-bold bg-white text-[#002970] focus:outline-none focus:ring-2 focus:ring-[#00BAF2] appearance-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="resolved">Resolved</option>
              <option value="awaiting_human">Awaiting Human</option>
              <option value="awaiting_merchant">Awaiting Merchant</option>
              <option value="escalated">Escalated</option>
              <option value="open">Open</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Tier Filter */}
          <div className="relative">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-xl border border-slate-200 text-xs font-bold bg-white text-[#002970] focus:outline-none focus:ring-2 focus:ring-[#00BAF2] appearance-none cursor-pointer"
            >
              <option value="all">All Tiers</option>
              <option value="T1">Tier 1 (Auto)</option>
              <option value="T2A">Tier 2A (Confirm)</option>
              <option value="T2B">Tier 2B (Approve)</option>
              <option value="T3">Tier 3 (Human)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFD] border-b border-[#E8EEF5] text-[#5B7089] uppercase tracking-wider text-[11px] font-extrabold">
            <tr>
              <th className="py-3.5 px-4 sm:px-6">Ticket</th>
              <th className="py-3.5 px-4">Merchant</th>
              <th className="py-3.5 px-4">Safety Tier</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 hidden md:table-cell">Source</th>
              <th className="py-3.5 px-4 hidden lg:table-cell">Summary</th>
              <th className="py-3.5 px-4">Created</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8EEF5]">
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <FileQuestion className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-sm">No tickets match the selected filters.</p>
                </td>
              </tr>
            ) : (
              filteredTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="hover:bg-[#F5F9FD] transition-colors group cursor-pointer"
                >
                  {/* Ticket ID */}
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-[#002970]">
                    <Link href={`/console/tickets/${ticket.id}`} className="hover:underline flex items-center gap-1.5">
                      <span>#{ticket.id}</span>
                    </Link>
                  </td>

                  {/* Merchant */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#002970] truncate max-w-[150px]">
                      {ticket.merchant?.name || ticket.merchant_id}
                    </div>
                    <div className="text-[11px] text-[#5B7089] truncate">
                      {ticket.merchant?.city}
                    </div>
                  </td>

                  {/* Tier */}
                  <td className="py-3.5 px-4">
                    {ticket.tier ? (
                      <TierBadge tier={ticket.tier} size="sm" />
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <StatusPill status={ticket.status} size="sm" />
                  </td>

                  {/* Source */}
                  <td className="py-3.5 px-4 hidden md:table-cell">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                      ticket.source === 'proactive'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    )}>
                      {ticket.source === 'proactive' && <Radio className="w-2.5 h-2.5 animate-pulse" />}
                      <span>{ticket.source}</span>
                    </span>
                  </td>

                  {/* Summary */}
                  <td className="py-3.5 px-4 hidden lg:table-cell max-w-xs font-hindi text-slate-700 font-medium truncate">
                    {ticket.summary}
                  </td>

                  {/* Created */}
                  <td className="py-3.5 px-4 text-[#5B7089] whitespace-nowrap">
                    {formatRelativeTime(ticket.created_at)}
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/console/tickets/${ticket.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#EBF7FD] hover:bg-[#00BAF2] text-[#00BAF2] hover:text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <span>Trace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
