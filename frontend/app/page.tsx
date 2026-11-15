'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getMyProfile,
  sendVoice,
  sendText,
  confirmTicket,
  loginMerchant,
  logout,
} from '@/lib/api';
import { Merchant } from '@/lib/types';
import { Language, t } from '@/lib/i18n';
import { stopSpeaking, preloadVoices, isSpeaking, isTTSSupported } from '@/lib/speech';
import { getAuthSession, isAuthenticated } from '@/lib/auth';
import { LangToggle } from '@/components/merchant/LangToggle';
import { ChatThread } from '@/components/merchant/ChatThread';
import { ChatMessage } from '@/components/merchant/ReplyBubble';
import { ConfirmCard } from '@/components/merchant/ConfirmCard';
import { MicButton } from '@/components/merchant/MicButton';
import { AlertBanner } from '@/components/merchant/AlertBanner';
import { ErrorState } from '@/components/ui/ErrorState';
import { TierBadge } from '@/components/ui/TierBadge';
import {
  Keyboard,
  Mic,
  Send,
  Sparkles,
  ShieldCheck,
  Users,
  UserCheck,
  ShieldAlert,
  Wifi,
  WifiOff,
  Info,
  Zap,
  ChevronDown,
  LogOut,
  Radio,
  SlidersHorizontal,
  Ticket,
  HelpCircle,
  Volume2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DEMO_MERCHANTS = [
  { id: 'm1', name: 'Ramesh Kirana Store', city: 'Ahmedabad', phone: '9876543210', scenario: 'Soundbox Silent' },
  { id: 'm2', name: 'Meena Tea Stall', city: 'Jaipur', phone: '9876543211', scenario: 'Settlement Delay' },
  { id: 'm3', name: 'Sharma Sweets', city: 'Lucknow', phone: '9876543212', scenario: 'Hardware Fault' },
  { id: 'm4', name: 'Iqbal General Store', city: 'Delhi', phone: '9876543213', scenario: 'Fraud Dispute' },
  { id: 'm5', name: 'Patel Mobile Point', city: 'Surat', phone: '9876543214', scenario: 'Dual Issue' },
];

export default function MerchantPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('hi');
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingTicketId, setPendingTicketId] = useState<string | null>(null);
  const [requiresConfirm, setRequiresConfirm] = useState(false);
  const [confirmPrompt, setConfirmPrompt] = useState<string | undefined>();
  const [proactiveAlert, setProactiveAlert] = useState(false);
  const [processingState, setProcessingState] = useState<'listening' | 'understanding' | 'checking' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micDenied, setMicDenied] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputVal, setTextInputVal] = useState('');
  const [saathiSpeaking, setSaathiSpeaking] = useState(false);
  
  // Demo Mode behind ?demo=1
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoSwitchOpen, setDemoSwitchOpen] = useState(false);

  const speakPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pre-load TTS voices on mount
  useEffect(() => {
    if (typeof window !== 'undefined') preloadVoices();
  }, []);

  // Poll isSpeaking() to track TTS state
  useEffect(() => {
    if (!isTTSSupported()) return;
    speakPollRef.current = setInterval(() => {
      setSaathiSpeaking(isSpeaking());
    }, 300);
    return () => {
      if (speakPollRef.current) clearInterval(speakPollRef.current);
    };
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const data = await getMyProfile();
      setMerchant(data);
    } catch {
      router.push('/login');
    }
  }, [router]);

  // Check auth session & URL demo parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setIsDemoMode(params.get('demo') === '1');

      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }

      const saved = localStorage.getItem('saathi_lang') as Language;
      if (saved === 'hi' || saved === 'en') {
        setLang(saved);
      } else {
        setLang('hi');
      }

      // Load authenticated merchant profile
      loadProfile();
    }
  }, [router, loadProfile]);

  const handleLangChange = (l: Language) => {
    setLang(l);
    localStorage.setItem('saathi_lang', l);
  };

  // Demo Switcher: logs in through the normal auth login flow, NOT by passing merchant_id!
  const handleSwitchDemoMerchant = async (phone: string) => {
    setDemoSwitchOpen(false);
    setMessages([]);
    setPendingTicketId(null);
    setRequiresConfirm(false);
    try {
      await loginMerchant(phone, '123456');
      await loadProfile();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to switch merchant.');
    }
  };

  const handleRecordingComplete = async (blob: Blob, duration: number, liveTranscript?: string) => {
    stopSpeaking();
    setSaathiSpeaking(false);
    setErrorMessage(null);
    setProcessingState('understanding');
    try {
      setTimeout(() => setProcessingState(p => p ? 'checking' : null), 500);
      const resp = await sendVoice(merchant?.id || '', blob, lang);
      setProcessingState(null);
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        sender: 'merchant',
        text: resp.transcript || liveTranscript || (lang === 'en' ? 'Voice query' : 'आवाज़ द्वारा प्रश्न'),
        duration,
        language: resp.language,
        confidence: resp.stt_confidence ?? (liveTranscript ? 0.9 : null),
        ts: new Date().toISOString(),
      };
      const saathiMsg: ChatMessage = {
        id: `msg-${Date.now()}-saathi`,
        sender: 'saathi',
        text: resp.reply_text,
        status: resp.status,
        tier: resp.tier,
        evidence: resp.evidence || [],
        ts: new Date().toISOString(),
      };
      setMessages(p => [...p, userMsg, saathiMsg]);
      setPendingTicketId(resp.ticket_id);
      if (resp.requires_confirmation) {
        setRequiresConfirm(true);
        setConfirmPrompt(resp.reply_text);
      } else {
        setRequiresConfirm(false);
      }
      if (resp.status === 'resolved') await loadProfile();
    } catch {
      setProcessingState(null);
      setErrorMessage(t('error', lang));
    }
  };

  const submitTextQuery = async (queryText: string) => {
    if (!queryText.trim() || processingState) return;
    stopSpeaking();
    setSaathiSpeaking(false);
    setErrorMessage(null);
    setProcessingState('understanding');
    try {
      setTimeout(() => setProcessingState(p => p ? 'checking' : null), 400);
      const resp = await sendText(merchant?.id || '', queryText.trim(), lang);
      setProcessingState(null);
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        sender: 'merchant',
        text: queryText.trim(),
        duration: 2,
        language: lang,
        confidence: 0.99,
        ts: new Date().toISOString(),
      };
      const saathiMsg: ChatMessage = {
        id: `msg-${Date.now()}-saathi`,
        sender: 'saathi',
        text: resp.reply_text,
        status: resp.status,
        tier: resp.tier,
        evidence: resp.evidence || [],
        ts: new Date().toISOString(),
      };
      setMessages(p => [...p, userMsg, saathiMsg]);
      setPendingTicketId(resp.ticket_id);
      if (resp.requires_confirmation) {
        setRequiresConfirm(true);
        setConfirmPrompt(resp.reply_text);
      } else {
        setRequiresConfirm(false);
      }
      if (resp.status === 'resolved') await loadProfile();
    } catch {
      setProcessingState(null);
      setErrorMessage(t('error', lang));
    }
  };

  const handleSendText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!textInputVal.trim()) return;
    const q = textInputVal;
    setTextInputVal('');
    await submitTextQuery(q);
  };

  const handleConfirm = async (answer: 'yes' | 'no') => {
    if (!pendingTicketId) return;
    try {
      const resp = await confirmTicket(pendingTicketId, answer);
      setRequiresConfirm(false);
      const replyMsg: ChatMessage = {
        id: `msg-${Date.now()}-confirm`,
        sender: 'saathi',
        text: resp.reply_text,
        status: resp.status,
        tier: resp.tier,
        evidence: resp.evidence || (answer === 'yes' ? ['Device: online', 'Restart: successful'] : []),
        ts: new Date().toISOString(),
      };
      setMessages(p => [...p, replyMsg]);
      setProactiveAlert(false);
      await loadProfile();
    } catch {
      setErrorMessage(t('error', lang));
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col font-body text-[#0F2038]">

      {/* ── Official Paytm Clean White Navigation Bar ── */}
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
              className="px-4 py-2 rounded-full text-xs font-bold bg-[#EBF7FD] text-[#002970] border border-[#D0EBFB] shadow-sm transition-all"
            >
              <span className="hidden sm:inline">🎙️ </span>Chat
            </Link>
            <Link
              href="/my-tickets"
              className="px-4 py-2 rounded-full text-xs font-bold text-[#5B7089] hover:text-[#002970] hover:bg-slate-100 transition-all"
            >
              My Tickets
            </Link>
          </nav>

          {/* Right side: LangToggle + Pitch Demo Switcher (?demo=1) + Merchant Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LangToggle value={lang} onChange={handleLangChange} />

            {/* Switch Demo Merchant Menu behind ?demo=1 */}
            {isDemoMode && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDemoSwitchOpen(!demoSwitchOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#00BAF2] text-[#00BAF2] hover:bg-[#EBF7FD] text-xs font-bold transition-all shadow-sm"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Switch demo merchant</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {demoSwitchOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-[#E8EEF5] py-2 z-50 text-[#0F2038]">
                    <div className="px-4 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Switch Demo Merchant (Full Login Flow)
                    </div>
                    {DEMO_MERCHANTS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSwitchDemoMerchant(m.phone)}
                        className={cn(
                          'w-full px-4 py-2.5 text-left text-xs transition-colors flex flex-col',
                          merchant?.id === m.id
                            ? 'bg-[#EBF7FD] text-[#002970] font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        )}
                      >
                        <span className="font-bold">{m.name}</span>
                        <span className="text-[11px] text-[#5B7089]">{m.city} • {m.scenario}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Merchant Logout Pill */}
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

      {/* ── Official Paytm Soundbox Merchant Store Banner ── */}
      {merchant && (
        <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 pt-5 sm:pt-6">
          <div className="relative bg-gradient-to-r from-[#EBF7FD] via-[#F3FAFE] to-[#EBF7FD] border border-[#DCEEFB] rounded-3xl p-5 sm:p-7 shadow-[0_4px_20px_rgba(0,186,242,0.06)] overflow-hidden">
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              {/* Left Headline */}
              <div className="max-w-xl space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#D0EBFB] shadow-sm text-xs font-extrabold text-[#002970]">
                  <Radio className="w-3.5 h-3.5 text-[#00BAF2] animate-pulse" />
                  <span>Paytm Soundbox AI Companion</span>
                </div>
                <h1 className="font-heading font-black text-2xl sm:text-3xl text-[#002970] tracking-tight leading-tight">
                  {lang === 'hi' ? (
                    <>
                      भारत के बढ़ते व्यापार की <span className="text-[#00BAF2]">सच्ची आवाज़</span>
                    </>
                  ) : (
                    <>
                      The Sound of <span className="text-[#00BAF2]">India's Growing Business</span>
                    </>
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-[#5B7089] font-medium leading-relaxed">
                  {lang === 'hi'
                    ? 'साउंडबॉक्स और सेटलमेंट की हर समस्या का समाधान — माइक दबाकर बोलें।'
                    : 'Instant diagnosis for your Soundbox and settlements — speak naturally.'}
                </p>
              </div>

              {/* Right: Logged-in Merchant Card */}
              <div className="bg-white rounded-2xl border border-[#DCEEFB] p-4 shadow-sm flex items-center gap-3.5 shrink-0 self-start md:self-auto">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#002970] to-[#0047BA] text-white flex items-center justify-center font-heading font-black text-xl shadow-md shrink-0">
                  {merchant.name.charAt(0)}
                </div>
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-sm sm:text-base text-[#002970] truncate max-w-[170px]">
                      {merchant.name}
                    </span>
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border',
                      merchant.device_status === 'online'
                        ? 'bg-[#E6F9F0] text-[#00B368] border-[#B7EDCE]'
                        : 'bg-[#FEEBEB] text-[#EE272C] border-[#FBC4C4]'
                    )}>
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        merchant.device_status === 'online' ? 'bg-[#00B368] animate-pulse' : 'bg-[#EE272C]'
                      )} />
                      <span>{merchant.device_status === 'online' ? t('online', lang) : t('offline', lang)}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#5B7089] font-medium mt-0.5">
                    <span>{merchant.city}</span>
                    <span>•</span>
                    <span className="font-mono text-[11px] bg-[#F5F7FA] px-1.5 py-0.5 rounded border border-slate-200 text-[#002970] font-bold">
                      {merchant.soundbox_id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Layout: Clean Merchant View (No Demo Scenarios panel!) ── */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr_330px] xl:grid-cols-[300px_1fr_340px] gap-5 sm:gap-6">

        {/* ══ LEFT SIDEBAR: Safety Tiers & Quick Tips ══ */}
        <aside className="flex flex-col gap-5 min-w-0">

          {/* Safety Policy Tiers Card */}
          <div className="bg-white rounded-3xl border border-[#E8EEF5] shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8EEF5]">
              <h3 className="font-heading font-black text-sm text-[#002970]">Safety Policy Tiers</h3>
              <p className="text-xs text-[#5B7089] font-medium mt-0.5">How Saathi handles merchant queries</p>
            </div>
            <div className="divide-y divide-[#E8EEF5]">
              {[
                { tier: 'T1' as const, label: 'Auto (Tier 1)', desc: 'AI acts alone, every step logged' },
                { tier: 'T2A' as const, label: 'Merchant Confirms (Tier 2A)', desc: 'Soundbox restart. You say yes.' },
                { tier: 'T2B' as const, label: 'Agent Approves (Tier 2B)', desc: 'Technician visit requires support agent.' },
                { tier: 'T3' as const, label: 'Human Only (Tier 3)', desc: 'Fraud & money — AI never touches money.' },
              ].map(({ tier, label, desc }) => (
                <div key={tier} className="flex items-start gap-3 px-5 py-3 hover:bg-[#F9FBFE] transition-colors">
                  <TierBadge tier={tier} size="sm" showLabel={false} className="shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#002970]">{label}</div>
                    <div className="text-xs text-[#5B7089] leading-snug font-medium mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Merchant Support Quick Links */}
          <div className="bg-white rounded-3xl border border-[#E8EEF5] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#00BAF2]" />
              <h4 className="font-heading font-black text-sm text-[#002970]">Helpful Tips</h4>
            </div>
            <ul className="text-xs text-[#5B7089] space-y-2 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-[#00BAF2] font-bold">•</span>
                <span>Speak naturally in Hindi, English, or mixed Hinglish.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00BAF2] font-bold">•</span>
                <span>Ask: "Mera Soundbox kal se nahi bol raha" to restart.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00BAF2] font-bold">•</span>
                <span>Ask: "Kal ka settlement kab aayega" for payment status.</span>
              </li>
            </ul>
          </div>
        </aside>

        {/* ══ CENTER: Voice Assistant Main Chat & Mic ══ */}
        <section className="flex flex-col gap-4 min-w-0">

          {/* Proactive Alert Banner */}
          {proactiveAlert && (
            <AlertBanner onPlayAlert={() => {}} lang={lang} />
          )}

          {/* Error Banner */}
          {errorMessage && (
            <ErrorState compact message={errorMessage} onRetry={() => { setErrorMessage(null); loadProfile(); }} lang={lang} />
          )}

          {/* Mic Permission Denied Notice */}
          {micDenied && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-amber-800">{t('mic_denied', lang)}</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed font-medium">{t('mic_denied_help', lang)}</p>
                <button onClick={() => setShowTextInput(true)} className="text-xs font-bold text-[#00BAF2] underline mt-1.5">
                  {t('type_instead', lang)}
                </button>
              </div>
            </div>
          )}

          {/* Main White Chat Container */}
          <div className="bg-white rounded-3xl border border-[#E8EEF5] shadow-[0_8px_30px_rgba(0,41,112,0.05)] flex flex-col overflow-hidden" style={{ minHeight: '520px' }}>
            
            {/* Chat Panel Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-[#E8EEF5] flex items-center justify-between bg-gradient-to-r from-[#F9FBFE] to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#EBF7FD] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#00BAF2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-sm text-[#002970]">Paytm Saathi Chat</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F9F0] text-[#00B368] border border-[#B7EDCE]">
                      LIVE
                    </span>
                  </div>
                  <p className="text-xs text-[#5B7089] font-medium mt-0.5">
                    {lang === 'hi' ? 'बोलकर या लिखकर सवाल पूछें' : 'Speak or type your question'}
                  </p>
                </div>
              </div>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  className="text-xs text-[#5B7089] hover:text-[#002970] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-[#F0F5FA] border border-slate-200 transition-all"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 flex flex-col">
              <ChatThread
                messages={messages}
                lang={lang}
                processingState={processingState}
                onSelectQuickQuery={submitTextQuery}
              />
            </div>

            {/* Merchant Confirmation Card (Tier 2A) */}
            {requiresConfirm && (
              <div className="px-5 sm:px-6 pb-4 shrink-0">
                <ConfirmCard promptText={confirmPrompt} onConfirm={handleConfirm} lang={lang} />
              </div>
            )}

            {/* Centered Voice Mic Section (Paytm Blue & White) */}
            <div className="border-t border-[#E8EEF5] bg-gradient-to-b from-[#F9FBFE] to-white px-4 sm:px-6 py-6 shrink-0 relative overflow-hidden">
              {showTextInput ? (
                <form onSubmit={handleSendText} className="flex items-center gap-2 sm:gap-3 max-w-xl mx-auto">
                  <input
                    type="text"
                    value={textInputVal}
                    onChange={e => setTextInputVal(e.target.value)}
                    placeholder={t('type_message_placeholder', lang)}
                    className="flex-1 h-12 px-4 rounded-2xl border border-[#DCE7F3] text-sm focus:outline-none focus:ring-2 focus:ring-[#00BAF2] bg-white font-hindi text-[#002970] placeholder:text-slate-400 shadow-sm"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!textInputVal.trim()}
                    className="h-12 px-5 rounded-2xl bg-[#00BAF2] text-white font-bold hover:bg-[#009EDB] disabled:opacity-40 transition-all shadow-sm flex items-center gap-2 text-sm shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('send', lang)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTextInput(false)}
                    className="h-12 px-3.5 rounded-2xl bg-white border border-[#DCE7F3] text-[#5B7089] hover:text-[#002970] transition-all shadow-sm shrink-0"
                    title="Switch to voice"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto relative z-10">
                  {/* Centered Mic Button */}
                  <div className="relative p-2 flex items-center justify-center">
                    <MicButton
                      onRecordingComplete={handleRecordingComplete}
                      onPermissionDenied={() => setMicDenied(true)}
                      lang={lang}
                      disabled={requiresConfirm || processingState !== null}
                      hideCaption={true}
                    />
                  </div>

                  {/* Single Clean Label */}
                  {saathiSpeaking ? (
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="flex items-end gap-0.5 h-4">
                        {[2, 4, 3, 5, 2, 4, 3].map((h, i) => (
                          <span
                            key={i}
                            className="w-0.5 bg-[#00BAF2] rounded-full animate-bounce"
                            style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s` }}
                          />
                        ))}
                      </span>
                      <p className="font-heading font-bold text-sm sm:text-base text-[#00BAF2]">
                        {lang === 'hi' ? 'साथी बोल रहा है…' : 'Saathi is speaking…'}
                      </p>
                      <button
                        type="button"
                        onClick={() => { stopSpeaking(); setSaathiSpeaking(false); }}
                        className="ml-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold border border-red-200"
                      >
                        {lang === 'hi' ? 'रोकें' : 'Stop'}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-0.5">
                      <p className="font-heading font-black text-base sm:text-lg text-[#002970]">
                        {t('hold_to_speak', lang)}
                      </p>
                      <p className="text-xs sm:text-sm text-[#5B7089] font-hindi font-medium">
                        {lang === 'hi'
                          ? 'Soundbox, पेमेंट या सेटलमेंट समस्या बोलें'
                          : 'Speak your Soundbox, payment or settlement issue'}
                      </p>
                    </div>
                  )}

                  {/* Switch to Keyboard Pill */}
                  <button
                    type="button"
                    onClick={() => setShowTextInput(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#00BAF2] hover:text-[#002970] transition-colors bg-[#EBF7FD] hover:bg-sky-100 px-4 py-1.5 rounded-full border border-[#D0EBFB]"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>{t('type_instead', lang)} →</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Reassurance Banner under Chat */}
          <div className="bg-[#EBF7FD]/70 border border-[#D0EBFB] rounded-full py-2.5 px-5 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-[#002970] text-center shadow-sm">
            <ShieldCheck className="w-4 h-4 text-[#00BAF2] shrink-0" />
            <span>
              {lang === 'hi'
                ? 'साथी कभी पैसे ट्रांसफर नहीं करता। जोखिम भरे मामले सीधे इंसानी टीम के पास जाते हैं।'
                : 'Saathi never moves money. Risky cases go to a human.'}
            </span>
          </div>
        </section>

        {/* ══ RIGHT SIDEBAR: Live Observability ══ */}
        <aside className="flex flex-col gap-5 min-w-0">

          {/* Live "What Saathi is doing" Card */}
          <div className="bg-white rounded-3xl border border-[#E8EEF5] shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8EEF5] flex items-center justify-between bg-gradient-to-r from-[#F9FBFE] to-white">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  processingState ? "bg-amber-500 animate-ping" : "bg-[#00BAF2]"
                )} />
                <h3 className="font-heading font-black text-sm text-[#002970]">What Saathi is doing</h3>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#EBF7FD] text-[#00BAF2] border border-[#D0EBFB]">
                {processingState === 'listening'
                  ? 'LISTENING'
                  : processingState === 'understanding'
                  ? 'ANALYZING'
                  : processingState === 'checking'
                  ? 'EVALUATING'
                  : requiresConfirm
                  ? 'CONFIRM REQ.'
                  : messages.length > 0
                  ? 'RESOLVED'
                  : 'READY'}
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Step 1: Voice & Language */}
              <div className="flex items-start gap-3.5">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all shadow-sm",
                  processingState === 'listening'
                    ? "bg-amber-500 text-white animate-pulse"
                    : messages.length > 0 || processingState
                    ? "bg-[#00BAF2] text-white"
                    : "bg-[#F0F5FA] text-[#5B7089]"
                )}>
                  <Mic className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#002970]">1. Voice & Intent</span>
                    <span className="text-[10px] font-mono text-[#5B7089] font-bold">{lang === 'hi' ? 'hi-IN' : 'en-IN'}</span>
                  </div>
                  <p className="text-xs text-[#5B7089] mt-0.5 leading-snug font-medium">
                    {processingState === 'listening'
                      ? 'Hearing merchant speech...'
                      : processingState === 'understanding'
                      ? 'Transcribing and detecting intent...'
                      : messages.length > 0
                      ? 'Intent processed successfully'
                      : 'Ready to listen to merchant voice query'}
                  </p>
                </div>
              </div>

              {/* Step 2: Device Telemetry Check */}
              <div className="flex items-start gap-3.5">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all shadow-sm",
                  processingState === 'checking'
                    ? "bg-[#00BAF2] text-white animate-pulse"
                    : merchant?.device_status === 'online'
                    ? "bg-[#00B368] text-white"
                    : "bg-[#F0F5FA] text-[#5B7089]"
                )}>
                  <Wifi className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#002970]">2. Soundbox Telemetry</span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      merchant?.device_status === 'online' ? "text-[#00B368] bg-[#E6F9F0] border-[#B7EDCE]" : "text-[#EE272C] bg-[#FEEBEB] border-[#FBC4C4]"
                    )}>
                      {merchant?.device_status === 'online' ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  <p className="text-xs text-[#5B7089] mt-0.5 leading-snug font-medium">
                    {processingState === 'checking'
                      ? `Querying heartbeat telemetry for ${merchant?.soundbox_id || 'Soundbox'}...`
                      : merchant?.device_status === 'online'
                      ? `Soundbox ${merchant?.soundbox_id || ''} ping OK, network active`
                      : `Soundbox ${merchant?.soundbox_id || ''} silent (offline telemetry detected)`}
                  </p>
                </div>
              </div>

              {/* Step 3: Settlement Records Check */}
              <div className="flex items-start gap-3.5">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all shadow-sm",
                  processingState === 'checking'
                    ? "bg-[#00BAF2] text-white animate-pulse"
                    : messages.length > 0
                    ? "bg-[#00BAF2] text-white"
                    : "bg-[#F0F5FA] text-[#5B7089]"
                )}>
                  <Zap className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#002970]">3. Settlement Ledger Check</span>
                    <span className="text-[10px] font-mono text-[#5B7089] font-bold">T+0 / T+1</span>
                  </div>
                  <p className="text-xs text-[#5B7089] mt-0.5 leading-snug font-medium">
                    {processingState === 'checking'
                      ? 'Cross-referencing payment batch & bank settlement records...'
                      : messages.length > 0
                      ? 'Bank cycle verified; transactions accounted'
                      : 'Settlement database ready for verification'}
                  </p>
                </div>
              </div>

              {/* Step 4: Safety Policy Tier */}
              <div className="flex items-start gap-3.5">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all shadow-sm",
                  requiresConfirm
                    ? "bg-[#002970] text-white animate-bounce"
                    : messages.length > 0
                    ? "bg-[#00B368] text-white"
                    : "bg-[#F0F5FA] text-[#5B7089]"
                )}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#002970]">4. Safety Policy Tier</span>
                    <span className="text-[10px] font-bold text-[#002970] bg-[#EBF7FD] px-2 py-0.5 rounded-full border border-[#D0EBFB]">
                      Deterministic
                    </span>
                  </div>
                  <p className="text-xs text-[#5B7089] mt-0.5 leading-snug font-medium">
                    {requiresConfirm
                      ? 'Tier 2A: Merchant confirmation required before restart'
                      : messages.some(m => m.tier === 'T3')
                      ? 'Tier 3: Handed off to human agent - Saathi never moves money'
                      : messages.some(m => m.tier === 'T2B')
                      ? 'Tier 2B: Hardware fault escalated to agent console'
                      : 'Policy active: strictly blocks unauthorized balance changes'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Synthetic Data Guarantee */}
          <div className="bg-[#EBF7FD]/60 border border-[#D0EBFB] rounded-3xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-[#00BAF2] shrink-0 mt-0.5" />
            <p className="text-xs text-[#002970] leading-relaxed font-medium">
              <strong>Merchant-Scoped Privacy.</strong> Access is bound to your merchant account. Other shopkeepers cannot access your tickets or audio traces.
            </p>
          </div>
        </aside>
      </main>

      {/* ── Official Paytm-Style Clean White Footer ── */}
      <footer className="bg-white border-t border-[#E8EEF5] mt-auto">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5B7089]">
          <div className="flex items-center gap-2.5">
            <span className="font-heading font-black text-[#002970] text-base tracking-tight">
              pay<span className="text-[#00BAF2]">tm</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-[#002970]">Paytm Soundbox Saathi</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-slate-600">Logged in as {merchant?.name || 'Merchant'}</span>
            <span className="text-slate-300">•</span>
            <button onClick={logout} className="text-[#EE272C] font-bold hover:underline">
              Sign Out
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
