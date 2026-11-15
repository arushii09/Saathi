'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginMerchant, loginAgent } from '@/lib/api';
import { getAuthSession } from '@/lib/auth';
import {
  Store,
  Shield,
  Smartphone,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Radio,
  AlertCircle,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DEMO_MERCHANTS = [
  { id: 'm1', name: 'Ramesh Kirana Store', city: 'Ahmedabad', phone: '9876543210', scenario: 'Soundbox Silent' },
  { id: 'm2', name: 'Meena Tea Stall', city: 'Jaipur', phone: '9876543211', scenario: 'Settlement Delay' },
  { id: 'm3', name: 'Sharma Sweets', city: 'Lucknow', phone: '9876543212', scenario: 'Hardware Fault' },
  { id: 'm4', name: 'Iqbal General Store', city: 'Delhi', phone: '9876543213', scenario: 'Fraud Dispute' },
  { id: 'm5', name: 'Patel Mobile Point', city: 'Surat', phone: '9876543214', scenario: 'Dual Issue' },
];

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'merchant' | 'agent'>('merchant');
  
  // Merchant form state
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState('123456');
  
  // Status & error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already authenticated, redirect
  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      if (session.role === 'agent') {
        router.push('/console/approvals');
      } else {
        router.push('/');
      }
    }
  }, [router]);

  const handleMerchantSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!phone.trim()) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await loginMerchant(phone.trim(), otp.trim() || '123456');
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (mPhone: string) => {
    setPhone(mPhone);
    setOtp('123456');
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await loginMerchant(mPhone, '123456');
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgentSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await loginAgent('123456');
      router.push('/console/approvals');
    } catch (err: any) {
      setErrorMsg(err.message || 'Agent sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center items-center p-4 sm:p-6 font-body text-[#0F2038]">
      
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 focus:outline-none mb-2">
          <span className="font-heading font-black text-3xl sm:text-4xl tracking-tight text-[#002970]">
            pay<span className="text-[#00BAF2]">tm</span>
          </span>
          <div className="flex flex-col ml-1 border-l-2 border-slate-300 pl-2 text-left">
            <span className="text-xs font-black tracking-wider uppercase text-[#002970] leading-none">
              Soundbox
            </span>
            <span className="text-[11px] font-bold text-[#00BAF2] tracking-wide leading-tight">
              Saathi AI
            </span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-[#5B7089] font-medium max-w-sm mx-auto">
          Voice-first AI support teammate with merchant-scoped data isolation.
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E8EEF5] shadow-[0_8px_30px_rgba(0,41,112,0.06)] overflow-hidden">
        
        {/* Role Segmented Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-[#F0F5FA] border-b border-[#E8EEF5]">
          <button
            type="button"
            onClick={() => { setActiveTab('merchant'); setErrorMsg(null); }}
            className={cn(
              'py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2',
              activeTab === 'merchant'
                ? 'bg-white text-[#002970] shadow-sm'
                : 'text-[#5B7089] hover:text-[#002970]'
            )}
          >
            <Store className="w-4 h-4 text-[#00BAF2]" />
            <span>Merchant Login</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('agent'); setErrorMsg(null); }}
            className={cn(
              'py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2',
              activeTab === 'agent'
                ? 'bg-white text-[#002970] shadow-sm'
                : 'text-[#5B7089] hover:text-[#002970]'
            )}
          >
            <Shield className="w-4 h-4 text-[#00BAF2]" />
            <span>Support Agent</span>
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="mx-6 mt-5 p-3 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-[#EE272C]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Tab 1: Merchant Form */}
        {activeTab === 'merchant' ? (
          <div className="p-6 sm:p-7 space-y-6">
            <form onSubmit={handleMerchantSubmit} className="space-y-4">
              {/* Phone input */}
              <div>
                <label className="block text-xs font-bold text-[#002970] mb-1.5">
                  Merchant Registered Mobile
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <span>+91</span>
                    <span className="text-slate-300">|</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full h-12 pl-16 pr-4 rounded-2xl border border-[#DCE7F3] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00BAF2] text-[#002970] placeholder:text-slate-400 bg-white"
                  />
                </div>
              </div>

              {/* OTP input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#002970]">
                    Verification OTP
                  </label>
                  <span className="text-[11px] font-bold text-[#00BAF2] bg-[#EBF7FD] px-2 py-0.5 rounded-full">
                    Demo OTP: 123456
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full h-12 pl-10 pr-4 rounded-2xl border border-[#DCE7F3] text-sm font-semibold font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#00BAF2] text-[#002970] bg-white"
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-2xl bg-[#00BAF2] hover:bg-[#009EDB] active:scale-[0.98] text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Soundbox Assistant</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Merchant Shortcut */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5B7089] block mb-2.5">
                Login as Demo Merchant (1-Click)
              </span>
              <div className="space-y-1.5">
                {DEMO_MERCHANTS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleQuickLogin(m.phone)}
                    className="w-full p-2.5 rounded-xl border border-[#E8EEF5] hover:border-[#00BAF2] hover:bg-[#F5F9FD] text-left transition-all flex items-center justify-between group text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#002970] group-hover:text-[#00BAF2]">
                        {m.name}
                      </span>
                      <span className="text-[11px] text-[#5B7089] ml-1.5">({m.city})</span>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {m.phone} • {m.scenario}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#00BAF2] group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Tab 2: Agent Form */
          <div className="p-6 sm:p-7 space-y-6">
            <div className="bg-[#EBF7FD] border border-[#D0EBFB] rounded-2xl p-4 text-xs text-[#002970] space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Shield className="w-4 h-4 text-[#00BAF2]" />
                <span>Paytm Specialist Access</span>
              </div>
              <p className="text-[#5B7089]">
                Gives access to the Approval Queue, Escalation Inbox, and All Tickets table.
              </p>
            </div>

            <form onSubmit={handleAgentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002970] mb-1.5">
                  Agent ID
                </label>
                <input
                  type="text"
                  disabled
                  value="agent_1 (Pooja Sharma - Tier 2 Support)"
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002970] mb-1.5">
                  Passcode / OTP
                </label>
                <input
                  type="password"
                  disabled
                  value="•••••• (123456)"
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-600"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-2xl bg-[#002970] hover:bg-[#001D50] active:scale-[0.98] text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Enter Agent Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-[#5B7089]">
        <span>Strict Scoping: Merchant A cannot read Merchant B tickets.</span>
      </div>
    </div>
  );
}
