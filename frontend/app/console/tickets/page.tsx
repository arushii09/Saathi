'use client';

import React from 'react';
import useSWR from 'swr';
import { listTickets } from '@/lib/api';
import { TicketTable } from '@/components/console/TicketTable';
import { Ticket, Clock, CheckCircle2 } from 'lucide-react';

export default function TicketsPage() {
  const { data: tickets = [], isLoading } = useSWR(
    'listTickets',
    () => listTickets(),
    { refreshInterval: 3000 }
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading font-black text-2xl text-[#002970]">
              All Support Tickets
            </h2>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#00BAF2] text-white shadow-sm font-mono">
              {tickets.length} TOTAL
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5B7089] font-medium mt-1">
            Complete database of merchant voice interactions, proactive alerts, and autonomous resolutions.
          </p>
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="h-96 bg-white rounded-3xl border border-[#E8EEF5] animate-pulse" />
      ) : (
        <TicketTable tickets={tickets} />
      )}
    </div>
  );
}
