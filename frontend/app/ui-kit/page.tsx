'use client';

import React, { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Chip,
  TierBadge,
  StatusPill,
  DeviceBadge,
  Skeleton,
  EmptyState,
  ErrorState,
  ToastProvider,
  useToast,
  Tooltip,
  Tabs,
  Timeline,
  TimelineNode,
  JsonViewer,
  KpiCard,
  ProgressBar,
  Segmented,
} from '@/components/ui';
import {
  Mic,
  Volume2,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Sliders,
  Play,
  CheckCircle,
  Radio,
  ArrowRight,
} from 'lucide-react';
import { Language } from '@/lib/i18n';
import Link from 'next/link';

function UiKitDemo() {
  const [lang, setLang] = useState<Language>('hi');
  const [deviceStatus, setDeviceStatus] = useState<'online' | 'offline'>('offline');
  const [activeTab, setActiveTab] = useState('overview');
  const { showToast } = useToast();

  const colorTokens = [
    { name: 'Paytm Navy', hex: '#002E6E', tag: 'navy-900', use: 'Headers, sidebar' },
    { name: 'Paytm Blue', hex: '#00BAF2', tag: 'brand-500', use: 'Primary CTAs, links' },
    { name: 'Deep Sky', hex: '#0090C8', tag: 'brand-600', use: 'Hover states' },
    { name: 'Teal Accent', hex: '#00D3C7', tag: 'teal-500', use: 'Mic glow, resolved' },
    { name: 'Ice Surface', hex: '#F5F9FD', tag: 'surface', use: 'App background' },
    { name: 'Pure White', hex: '#FFFFFF', tag: 'card', use: 'Cards, surfaces' },
    { name: 'Hairline Border', hex: '#E2ECF6', tag: 'border', use: 'Dividers, borders' },
    { name: 'Midnight Text', hex: '#001A44', tag: 'text', use: 'Headings, primary' },
    { name: 'Slate Muted', hex: '#5A6E85', tag: 'muted', use: 'Subtext, metadata' },
    { name: 'Success Green', hex: '#00B368', tag: 'online', use: 'Online status' },
    { name: 'Alert Red', hex: '#EE272C', tag: 'offline', use: 'Offline status' },
  ];

  const sampleJson = {
    ticket_id: 't-m1-001',
    merchant: {
      id: 'm1',
      name: 'Ramesh Kirana Store',
      soundbox: 'SB-JF3A31',
      city: 'Ahmedabad',
    },
    action: {
      tool: 'restart_device',
      decision: 'ALLOW',
      tier: 'T2A',
      rule: 'restart_requires_merchant_yes',
    },
    latency_ms: 420,
    status: 'resolved',
  };

  return (
    <div className="min-h-screen bg-surface font-body text-text">
      {/* Top Paytm Brand Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-heading">
              <span className="text-2xl font-black text-brand-500 tracking-tight">Paytm</span>
              <span className="text-2xl font-bold text-navy-900 tracking-tight">Saathi</span>
            </div>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-brand-600 border border-brand-500/20">
              Design System &amp; UI Kit
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-semibold text-brand-600 hover:text-navy-900 flex items-center gap-1 mr-2">
              <span>Go to Merchant App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Segmented<Language>
              size="sm"
              options={[
                { value: 'hi', label: 'हिन्दी' },
                { value: 'en', label: 'English' },
              ]}
              value={lang}
              onChange={(v) => setLang(v)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeviceStatus(deviceStatus === 'online' ? 'offline' : 'online')}
            >
              Toggle Soundbox State
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Hero Banner */}
        <div className="paytm-gradient rounded-card p-6 sm:p-8 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
              Paytm Blue &amp;
            </span>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
              Paytm Saathi Design System
            </h1>
            <p className="text-sm sm:text-base text-sky-100 font-normal leading-relaxed">
              Tailored for 30M+ Soundbox merchants across India. Voice-first, high contrast, vernacular typography, and transparent policy decision tracing.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
            <div className="bg-white/10 backdrop-blur-sm rounded-btn px-4 py-2 border border-white/20">
              <span className="text-xs text-sky-200 block">Current Language</span>
              <span className="text-sm font-bold text-white">{lang === 'hi' ? 'हिन्दी (Hindi)' : 'English'}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-btn px-4 py-2 border border-white/20">
              <span className="text-xs text-sky-200 block">Soundbox State</span>
              <span className="text-sm font-bold text-white capitalize">{deviceStatus}</span>
            </div>
          </div>
        </div>

        {/* 1. Colour Tokens & Design Palettes */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-lg font-heading font-bold text-navy-900">
                1. Colour Palette (Paytm Blue &amp; White)
              </h2>
              <p className="text-xs text-text-muted">
                Official Paytm navy, cyan blue, ice surface, and accessible semantic colors.
              </p>
            </div>
            <span className="text-xs font-mono bg-sky-50 text-brand-600 px-2 py-1 rounded border border-sky-100">
              CSS variables + Tailwind tokens
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {colorTokens.map((c) => (
              <div
                key={c.name}
                className="p-3 bg-white rounded-card border border-border shadow-soft flex flex-col justify-between hover:border-brand-500/40 transition-colors"
              >
                <div>
                  <div
                    className="w-full h-12 rounded-lg mb-2.5 border border-black/5 shadow-xs"
                    style={{ backgroundColor: c.hex }}
                  />
                  <div className="font-heading font-bold text-xs text-navy-900">{c.name}</div>
                  <div className="font-mono text-[11px] text-text-muted">{c.hex}</div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-text-muted block">{c.use}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Safety Tiers */}
        <section className="space-y-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-heading font-bold text-navy-900">
              2. Safety Tiers (Icon + Label + Strict Palette)
            </h2>
            <p className="text-xs text-text-muted">
              Never rely on color alone. Every decision tier carries an icon and clear human description.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* T1 */}
            <div className="p-4 rounded-card bg-[var(--tier-t1-bg)] border border-[var(--tier-t1-border)] flex flex-col justify-between">
              <div>
                <div className="mb-2">
                  <TierBadge tier="T1" size="md" />
                </div>
                <h3 className="font-bold text-sm text-[var(--tier-t1-text)] mb-1">
                  Read-Only &amp; Informational
                </h3>
                <p className="text-xs text-[var(--tier-t1-text)] opacity-90 leading-relaxed">
                  Checks device health, explains settlements, reads battery. Saathi acts automatically without side-effects.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[var(--tier-t1-border)]/20 text-[11px] font-mono font-medium text-[var(--tier-t1-text)]">
                Rule: read_only_lookup
              </div>
            </div>

            {/* T2A */}
            <div className="p-4 rounded-card bg-[var(--tier-t2a-bg)] border border-[var(--tier-t2a-border)] flex flex-col justify-between">
              <div>
                <div className="mb-2">
                  <TierBadge tier="T2A" size="md" />
                </div>
                <h3 className="font-bold text-sm text-[var(--tier-t2a-text)] mb-1">
                  Merchant Confirmation
                </h3>
                <p className="text-xs text-[var(--tier-t2a-text)] opacity-90 leading-relaxed">
                  Soundbox remote restart. Saathi asks merchant by voice, waits for confirmation, then acts.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[var(--tier-t2a-border)]/20 text-[11px] font-mono font-medium text-[var(--tier-t2a-text)]">
                Rule: restart_requires_merchant_yes
              </div>
            </div>

            {/* T2B */}
            <div className="p-4 rounded-card bg-[var(--tier-t2b-bg)] border border-[var(--tier-t2b-border)] flex flex-col justify-between">
              <div>
                <div className="mb-2">
                  <TierBadge tier="T2B" size="md" />
                </div>
                <h3 className="font-bold text-sm text-[var(--tier-t2b-text)] mb-1">
                  Human Support Approval
                </h3>
                <p className="text-xs text-[var(--tier-t2b-text)] opacity-90 leading-relaxed">
                  Technician dispatch, hardware replacement. Queued in console for agent one-click approval.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[var(--tier-t2b-border)]/20 text-[11px] font-mono font-medium text-[var(--tier-t2b-text)]">
                Rule: technician_requires_approval
              </div>
            </div>

            {/* T3 */}
            <div className="p-4 rounded-card bg-[var(--tier-t3-bg)] border border-[var(--tier-t3-border)] flex flex-col justify-between">
              <div>
                <div className="mb-2">
                  <TierBadge tier="T3" size="md" />
                </div>
                <h3 className="font-bold text-sm text-[var(--tier-t3-text)] mb-1">
                  Human Only (Escalate)
                </h3>
                <p className="text-xs text-[var(--tier-t3-text)] opacity-90 leading-relaxed">
                  Money movement, KYC, disputed payments, fraud. Saathi refuses to act and compiles an audit case file.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[var(--tier-t3-border)]/20 text-[11px] font-mono font-medium text-[var(--tier-t3-text)]">
                Rule: fraud_and_money_human_only
              </div>
            </div>
          </div>
        </section>

        {/* 3. Typography & Vernacular Support */}
        <section className="space-y-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-heading font-bold text-navy-900">
              3. Typography &amp; Vernacular Hindi Rendering
            </h2>
            <p className="text-xs text-text-muted">
              High-readability typography optimized for bright shop counters and fast scanning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border shadow-soft space-y-3">
              <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">
                Devanagari (Hindi) Voice &amp; Transcript Copy
              </span>
              <p className="text-xl font-hindi font-medium text-navy-900 leading-relaxed" lang="hi">
                "नमस्ते रमेश जी! आपका साउंडबॉक्स 18 घंटे से बंद है। क्या मैं इसे अभी रीस्टार्ट कर दूँ?"
              </p>
              <div className="flex items-center gap-2 pt-2 text-xs text-text-muted">
                <Chip variant="success">95% STT Confidence</Chip>
                <Chip variant="brand">Hindi (hi)</Chip>
              </div>
            </Card>

            <Card className="border-border shadow-soft space-y-3">
              <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">
                English Agent &amp; Explanation Copy
              </span>
              <p className="text-base text-navy-900 leading-relaxed font-body">
                "Your Soundbox has been offline for 18 hours. Telemetry indicates SIM modem recovery is required. Shall I initiate restart?"
              </p>
              <div className="flex items-center gap-2 pt-2 text-xs text-text-muted">
                <Chip variant="neutral">Verified Telemetry</Chip>
                <Chip variant="default">English (en)</Chip>
              </div>
            </Card>
          </div>
        </section>

        {/* 4. Action Buttons & Touch Targets */}
        <section className="space-y-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-heading font-bold text-navy-900">
              4. Buttons &amp; Tap Targets (Minimum 44px – 56px for Shopkeepers)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Paytm Blue Button</Button>
            <Button variant="navy">Navy Primary</Button>
            <Button variant="secondary">White Surface</Button>
            <Button variant="teal" icon={<Sparkles className="w-4 h-4" />}>
              Resolved Accent
            </Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost Link</Button>
            <Button variant="danger">Danger Action</Button>
            <Button variant="primary" loading>
              Loading
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button size="lg" variant="primary" className="min-w-[200px]" icon={<CheckCircle className="w-5 h-5" />}>
              हाँ, कर दो (Yes, do it)
            </Button>
            <Button size="lg" variant="secondary" className="min-w-[140px]">
              नहीं (No)
            </Button>
          </div>
        </section>

        {/* 5. DeviceBadge & Status Pills */}
        <section className="space-y-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-heading font-bold text-navy-900">
              5. Live Status Indicators &amp; Device Badge
            </h2>
          </div>

          <div className="p-4 bg-white rounded-card border border-border shadow-soft flex flex-wrap items-center gap-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text-muted">Interactive Device Status:</span>
              <DeviceBadge status={deviceStatus} lang={lang} />
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-xs font-semibold text-text-muted">Merchant Status Pills (Vernacular):</span>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status="resolved" />
                <StatusPill status="awaiting_merchant" />
                <StatusPill status="awaiting_human" />
                <StatusPill status="escalated" />
                <StatusPill status="failed" />
              </div>
            </div>
          </div>
        </section>

        {/* 6. Timeline & JsonViewer */}
        <section className="space-y-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-heading font-bold text-navy-900">
              6. Decision Trace Timeline &amp; Payload Inspector
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border shadow-soft">
              <CardHeader>
                <CardTitle>Decision Timeline</CardTitle>
                <CardDescription>Visual audit trail with policy rule evaluation</CardDescription>
              </CardHeader>
              <CardContent>
                <Timeline>
                  <TimelineNode stepNo={1} timeOffset="+0.0s" variant="brand">
                    <div className="p-3 bg-white rounded-btn border border-border shadow-xs">
                      <span className="font-semibold text-xs text-brand-600 uppercase">Transcript</span>
                      <p className="text-sm text-navy-900 mt-1 font-hindi" lang="hi">
                        "Mera Soundbox kal se nahi bol raha" (Hindi · 93%)
                      </p>
                    </div>
                  </TimelineNode>
                  <TimelineNode stepNo={2} timeOffset="+0.6s" variant="tier1">
                    <div className="p-3 bg-[var(--tier-t1-bg)] border border-[var(--tier-t1-border)] rounded-btn">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[var(--tier-t1-text)]">Policy: ALLOW</span>
                        <TierBadge tier="T1" size="sm" />
                      </div>
                      <p className="text-xs text-[var(--tier-t1-text)]">
                        Rule: read_only_lookup (Safe diagnostic read)
                      </p>
                    </div>
                  </TimelineNode>
                  <TimelineNode stepNo={3} timeOffset="+1.2s" variant="tier2a">
                    <div className="p-3 bg-[var(--tier-t2a-bg)] border border-[var(--tier-t2a-border)] rounded-btn">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[var(--tier-t2a-text)]">Policy: NEEDS_CONFIRM</span>
                        <TierBadge tier="T2A" size="sm" />
                      </div>
                      <p className="text-xs text-[var(--tier-t2a-text)]">
                        Rule: restart_requires_merchant_yes
                      </p>
                    </div>
                  </TimelineNode>
                </Timeline>
              </CardContent>
            </Card>

            <Card className="border-border shadow-soft">
              <CardHeader>
                <CardTitle>Trace Payload Inspector</CardTitle>
                <CardDescription>Collapsible formatted JSON with copy support</CardDescription>
              </CardHeader>
              <CardContent>
                <JsonViewer data={sampleJson} title="Payload: restart_event.json" defaultExpanded />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 7. KPI Metrics & Target vs Measured */}
        <section className="space-y-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-heading font-bold text-navy-900">
              7. KPI Metrics &amp; Targets
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Tickets Handled" value="596" subtext="Across 5 test merchants" />
            <KpiCard title="Avg Resolution Time" value="4.8s" subtext="Target: < 5.0s" badge="On Track" />
            <KpiCard title="Downtime Recovered" value="1,420m" subtext="Simulated outage recovery" />
            <KpiCard title="Policy Violations" value={0} highlightZero subtext="Zero safety breaches" />
          </div>

          <Card className="border-border shadow-soft space-y-4">
            <CardTitle>Accuracy &amp; Benchmark Performance</CardTitle>
            <div className="space-y-4 pt-1">
              <div>
                <div className="flex justify-between text-xs font-semibold text-navy-900 mb-1.5">
                  <span>Hindi Voice Intent Accuracy</span>
                  <span>Measured: 94.2% · Target: 90.0%</span>
                </div>
                <ProgressBar value={94.2} target={90} color="online" />
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold text-navy-900 mb-1.5">
                  <span>Safety Tier Classification</span>
                  <span>Measured: 99.4% · Target: 98.0%</span>
                </div>
                <ProgressBar value={99.4} target={98} color="brand" />
              </div>
            </div>
          </Card>
        </section>

        {/* 8. Empty & Error States */}
        <section className="space-y-4 pb-10">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-heading font-bold text-navy-900">
              8. Empty &amp; Resilient Error States
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <EmptyState
              title="No Approvals Pending"
              description="Saathi is handling all automated Tier 1 checks. No technician visits require approval right now."
            />
            <ErrorState
              title="Connection Interrupted"
              message="Could not reach backend service. Retrying in background..."
              onRetry={() =>
                showToast({
                  message: 'Reconnected to mock services',
                  type: 'success',
                })
              }
              lang={lang}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default function UiKitPage() {
  return (
    <ToastProvider>
      <UiKitDemo />
    </ToastProvider>
  );
}
