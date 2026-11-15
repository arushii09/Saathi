'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { listApprovals, listEscalations, resetDemo, logout } from '@/lib/api';
import { getCurrentUserRole } from '@/lib/auth';
import {
  CheckSquare,
  ShieldAlert,
  Ticket,
  LayoutDashboard,
  Mic,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Shield,
  UserCheck,
  Radio,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  // Agent role auth guard
  useEffect(() => {
    const role = getCurrentUserRole();
    if (role !== 'agent') {
      router.replace('/login?role=agent');
    } else {
      setAuthorized(true);
    }
  }, [router]);

  // Poll approvals and escalations counts every 3000ms
  const { data: approvals = [], mutate: mutateApprovals } = useSWR(
    authorized ? 'listApprovals' : null,
    listApprovals,
    { refreshInterval: 3000 }
  );

  const { data: escalations = [] } = useSWR(
    authorized ? 'listEscalations' : null,
    listEscalations,
    { refreshInterval: 3000 }
  );

  const navLinks = [
    {
      href: '/console/approvals',
      label: 'Approval Queue',
      icon: CheckSquare,
      badge: approvals.length,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      href: '/console/escalations',
      label: 'Escalation Inbox',
      icon: ShieldAlert,
      badge: escalations.length,
      badgeColor: 'bg-[#EE272C] text-white',
    },
    {
      href: '/console/tickets',
      label: 'All Tickets',
      icon: Ticket,
      badge: null,
      badgeColor: '',
    },
  ];

  const handleReset = async () => {
    await resetDemo();
    mutateApprovals();
  };

  const handleLogout = () => {
    logout();
    router.push('/login?role=agent');
  };

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
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col md:flex-row font-body text-[#0F2038]">

      {/* ── Desktop & Mobile Sidebar ── */}
      <aside
        className={cn(
          'bg-[#002970] text-white w-full md:w-64 xl:w-72 shrink-0 flex flex-col z-40 transition-all duration-200',
          'md:sticky md:top-0 md:h-screen'
        )}
      >
        {/* Brand Bar */}
        <div className="h-16 sm:h-[72px] px-6 flex items-center justify-between border-b border-white/10">
          <Link href="/console" className="flex items-center gap-2.5">
            <span className="font-heading font-black text-2xl text-white tracking-tight">
              pay<span className="text-[#00BAF2]">tm</span>
            </span>
            <div className="flex flex-col border-l border-white/20 pl-2">
              <span className="text-[10px] font-black tracking-widest uppercase text-[#00BAF2]">
                Console
              </span>
              <span className="text-[11px] font-bold text-blue-200">
                Agent Support
              </span>
            </div>
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation Section */}
        <div className={cn(
          'flex-1 flex-col justify-between p-4 overflow-y-auto',
          mobileMenuOpen ? 'flex' : 'hidden md:flex'
        )}>
          {/* Main Console Nav */}
          <div className="space-y-6">
            <div>
              <span className="px-3 text-[10px] font-black uppercase tracking-wider text-blue-300/80 block mb-2">
                Human-in-the-Loop Queue
              </span>
              <nav className="space-y-1">
                {navLinks.map((link) => {
                  const isActive = pathname.startsWith(link.href);
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all',
                        isActive
                          ? 'bg-[#00BAF2] text-white shadow-md'
                          : 'text-blue-100 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{link.label}</span>
                      </div>
                      {link.badge !== null && link.badge > 0 && (
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-sm', link.badgeColor)}>
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Platform Cross-Links */}
            <div>
              <span className="px-3 text-[10px] font-black uppercase tracking-wider text-blue-300/80 block mb-2">
                Surfaces
              </span>
              <nav className="space-y-1">
                <Link
                  href="/"
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl text-xs font-semibold text-blue-200 hover:bg-white/10 hover:text-white transition-all"
                >
                  <Mic className="w-4 h-4 text-[#00BAF2]" />
                  <span>Merchant Voice View</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl text-xs font-semibold text-blue-200 hover:bg-white/10 hover:text-white transition-all"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#00BAF2]" />
                  <span>Outcomes Dashboard</span>
                </Link>
                <Link
                  href="/ui-kit"
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl text-xs font-semibold text-blue-200 hover:bg-white/10 hover:text-white transition-all"
                >
                  <Sparkles className="w-4 h-4 text-[#00BAF2]" />
                  <span>Design System UI Kit</span>
                </Link>
              </nav>
            </div>
          </div>

          {/* Bottom Footer Info */}
          <div className="pt-4 mt-6 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs px-2">
              <span className="text-blue-300 font-medium">Mode</span>
              <span className="font-mono text-[11px] font-bold bg-[#00BAF2]/20 text-[#00BAF2] border border-[#00BAF2]/30 px-2 py-0.5 rounded-full">
                MOCK ACTIVE
              </span>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all border border-white/15"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#00BAF2]" />
              <span>Reset Prototype Data</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area with Top Bar ── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Bar */}
        <header className="bg-white border-b border-[#E8EEF5] h-16 sm:h-[72px] px-6 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-[0_2px_12px_rgba(0,41,112,0.03)]">
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-black text-lg text-[#002970]">
              Paytm Support Console
            </h1>
            <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-slate-300" />
            <span className="hidden sm:inline-block text-xs text-[#5B7089] font-medium">
              Deterministic Safety & Approvals
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Sync Dot */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F9F0] border border-[#B7EDCE] text-[11px] font-bold text-[#00B368]">
              <span className="w-2 h-2 rounded-full bg-[#00B368] animate-pulse" />
              <span>SWR 3s Sync</span>
            </div>

            {/* Specialist Profile Pill & Logout */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 bg-[#F5F7FA] border border-slate-200 px-3 py-1.5 rounded-full text-xs font-bold text-[#002970]">
                <div className="w-5 h-5 rounded-full bg-[#002970] text-white flex items-center justify-center text-[10px]">
                  PS
                </div>
                <span>Tier 2 Support Specialist</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Log out of console"
                className="flex items-center gap-1.5 text-xs font-bold text-[#5B7089] hover:text-[#EE272C] hover:bg-red-50 px-2.5 py-1.5 rounded-xl border border-transparent hover:border-red-200 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
