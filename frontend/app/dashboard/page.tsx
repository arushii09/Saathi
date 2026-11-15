'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getMetrics } from '@/lib/api';
import { getCurrentUserRole } from '@/lib/auth';
import { KpiRow } from '@/components/dashboard/KpiRow';
import { TierChart } from '@/components/dashboard/TierChart';
import { TargetVsMeasured } from '@/components/dashboard/TargetVsMeasured';
import {
  LayoutDashboard,
  Mic,
  Terminal,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Info,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const role = getCurrentUserRole();
    if (role !== 'agent') {
      router.replace('/login?role=agent');
    } else {
      setAuthorized(true);
    }
  }, [router]);

  const { data: metrics, isLoading, mutate } = useSWR(
    authorized ? 'getMetrics' : null,
    getMetrics,
    { refreshInterval: 5000 }
  );

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center font-body text-[#0F2038]">
        <div className="text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-sm">
          <div className="w-10 h-10 border-4 border-[#002970] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-[#002970]">Checking agent authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col font-body text-[#0F2038]">

      {/* ── Official Paytm-Style Top Header ── */}
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
                  Outcomes
                </span>
                <span className="text-[10px] font-bold text-[#00BAF2] tracking-wide leading-tight">
                  Dashboard
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              href="/"
              className="px-4 py-2 rounded-full text-xs font-bold text-[#5B7089] hover:text-[#002970] hover:bg-slate-100 transition-all"
            >
              Merchant View
            </Link>
            <Link
              href="/console"
              className="px-4 py-2 rounded-full text-xs font-bold text-[#5B7089] hover:text-[#002970] hover:bg-slate-100 transition-all"
            >
              Agent Console
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-full text-xs font-bold bg-[#EBF7FD] text-[#002970] border border-[#D0EBFB] shadow-sm transition-all"
            >
              Outcomes Dashboard
            </Link>
          </nav>

          {/* Refresh Action */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => mutate()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-[#00BAF2] text-xs font-bold text-[#002970] hover:bg-[#EBF7FD] transition-all shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#00BAF2]" />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">

        {/* Prototype & Synthetic Notice Ribbon */}
        <div className="bg-[#EBF7FD] border border-[#D0EBFB] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#002970]">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-[#00BAF2] shrink-0" />
            <span className="font-medium">
              <strong>Synthetic Prototype Notice:</strong> Telemetry, merchant profiles and ticket histories are simulated for evaluation. Benchmark numbers reflect live test runs and deterministic guardrail verifications.
            </span>
          </div>

          <span className="font-mono text-[11px] font-bold bg-white text-[#00BAF2] px-2.5 py-0.5 rounded-full border border-[#D0EBFB] shrink-0 self-start sm:self-auto">
            MOCK ACTIVE
          </span>
        </div>

        {/* Dashboard Title & Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-[#002970]">
              Paytm Saathi Outcomes & Safety Metrics
            </h1>
            <p className="text-xs sm:text-sm text-[#5B7089] font-medium mt-1">
              Autonomous resolution efficiency, human-in-the-loop escalations, and strict guardrail enforcement.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/console/approvals"
              className="px-4 py-2 rounded-2xl bg-[#002970] hover:bg-[#001D50] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <span>Open Approval Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI Summary Row */}
        {isLoading || !metrics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-white rounded-3xl border border-[#E8EEF5] animate-pulse" />
            ))}
          </div>
        ) : (
          <KpiRow metrics={metrics} />
        )}

        {/* Tier Distribution Chart & System Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-6 items-start">
          
          {/* Left: Recharts Donut Chart */}
          {metrics && (
            <TierChart data={metrics.tickets_by_tier} />
          )}

          {/* Right: Architecture & Safety Highlights */}
          <div className="bg-white rounded-3xl border border-[#E8EEF5] p-6 shadow-[0_4px_24px_rgba(0,41,112,0.04)] space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#00BAF2]" />
              <h3 className="font-heading font-black text-base text-[#002970]">
                Safety Guarantee Architecture
              </h3>
            </div>

            <p className="text-xs text-[#5B7089] leading-relaxed font-medium">
              Paytm Saathi strictly segregates tasks into 4 tiers so AI never possesses unilateral financial control.
            </p>

            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#12A150] shrink-0 mt-1.5" />
                <div>
                  <span className="font-bold text-[#002970]">Tier 1 (Auto):</span>
                  <p className="text-[#5B7089]">Diagnostic queries and explanation delivery. Instantaneous turnaround.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#1D6FE0] shrink-0 mt-1.5" />
                <div>
                  <span className="font-bold text-[#002970]">Tier 2A (Merchant Confirms):</span>
                  <p className="text-[#5B7089]">Device restarts. AI only triggers reboot after merchant speaks "Yes".</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#D98100] shrink-0 mt-1.5" />
                <div>
                  <span className="font-bold text-[#002970]">Tier 2B (Agent Approves):</span>
                  <p className="text-[#5B7089]">Field technician dispatch. AI prepares recommendation for specialist one-click signoff.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#D93636] shrink-0 mt-1.5" />
                <div>
                  <span className="font-bold text-[#002970]">Tier 3 (Human Only):</span>
                  <p className="text-[#5B7089]">Money transfers, fraud, disputes. Zero automated action. Handed off with full Case File.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Target vs Measured Benchmark Table */}
        <TargetVsMeasured evalData={metrics?.eval} />
      </main>

      {/* ── Clean White Footer ── */}
      <footer className="bg-white border-t border-[#E8EEF5] mt-auto">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5B7089]">
          <div className="flex items-center gap-2.5">
            <span className="font-heading font-black text-[#002970] text-base tracking-tight">
              pay<span className="text-[#00BAF2]">tm</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-[#002970]">Paytm Saathi Outcomes Dashboard</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="bg-[#EBF7FD] text-[#00BAF2] border border-[#D0EBFB] px-3 py-1 rounded-full font-bold">
              PROTOTYPE EVALUATION
            </span>
            <span>Next.js 14 · TypeScript</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
