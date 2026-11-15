'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CaseFile as CaseFileType } from '@/lib/types';
import { TierBadge } from '@/components/ui/TierBadge';
import { formatConfidence } from '@/lib/format';
import {
  ShieldAlert,
  Copy,
  Check,
  User,
  Store,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CaseFileProps {
  caseFile: CaseFileType;
  ticketId?: string;
  className?: string;
}

export function CaseFile({ caseFile, ticketId, className }: CaseFileProps) {
  const [copied, setCopied] = useState(false);
  const conf = formatConfidence(caseFile.stt_confidence);

  const handleCopySummary = () => {
    const text = `
=== PAYTM SAATHI ESCALATION CASE FILE ===
Merchant: ${caseFile.merchant.name} (${caseFile.merchant.city})
Soundbox ID: ${caseFile.merchant.soundbox_id} [Status: ${caseFile.merchant.device_status}]
Tier: Tier 3 (Human Only - Safety Guardrail)
Language: ${caseFile.language} (Confidence: ${conf.text})

TRANSCRIPT:
"${caseFile.transcript}"

DIAGNOSIS:
${caseFile.diagnosis}

ESCALATION REASON:
${caseFile.escalation_reason}

EVIDENCE:
${caseFile.evidence.map(e => `• ${e}`).join('\n')}

ACTIONS TAKEN:
${caseFile.actions_taken.map(a => `• ${a}`).join('\n')}

TOLD TO MERCHANT:
"${caseFile.told_to_merchant}"

RECOMMENDED NEXT STEP:
${caseFile.recommended_next_step}
=========================================
`.trim();

    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('bg-white rounded-3xl border border-[#E8EEF5] shadow-[0_4px_24px_rgba(0,41,112,0.05)] overflow-hidden', className)}>
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-[#E8EEF5] bg-gradient-to-r from-[#FFF5F5] to-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FEEBEB] border border-[#FBC4C4] flex items-center justify-center text-[#EE272C] shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-black text-base text-[#002970]">
                Tier 3 Escalation Case File
              </h2>
              <TierBadge tier="T3" size="sm" />
            </div>
            <p className="text-xs text-[#5B7089] mt-0.5 font-medium">
              Strict Human-in-the-Loop policy triggered. AI actions blocked.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopySummary}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-[#002970] shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#00B368]" /> : <Copy className="w-3.5 h-3.5 text-[#00BAF2]" />}
          <span>{copied ? 'Copied to Clipboard' : 'Copy Summary for CRM'}</span>
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Merchant & Telemetry Strip */}
        <div className="bg-[#F5F7FA] border border-[#E1EAF2] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#002970] to-[#0D3C7E] text-white flex items-center justify-center font-black font-heading text-lg">
              {caseFile.merchant.name.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-sm text-[#002970]">{caseFile.merchant.name}</div>
              <div className="flex items-center gap-2 text-xs text-[#5B7089] mt-0.5">
                <span>{caseFile.merchant.city}</span>
                <span>•</span>
                <span className="font-mono text-[11px] font-bold text-[#002970]">{caseFile.merchant.soundbox_id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
              caseFile.merchant.device_status === 'online'
                ? 'bg-[#E6F9F0] text-[#00B368] border-[#B7EDCE]'
                : 'bg-[#FEEBEB] text-[#EE272C] border-[#FBC4C4]'
            )}>
              <span className={cn(
                'w-2 h-2 rounded-full',
                caseFile.merchant.device_status === 'online' ? 'bg-[#00B368]' : 'bg-[#EE272C]'
              )} />
              <span>Soundbox {caseFile.merchant.device_status}</span>
            </span>
          </div>
        </div>

        {/* Spoken Query Transcript */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-[#5B7089] font-medium">
            <div className="flex items-center gap-1.5 font-bold text-[#002970]">
              <MessageSquare className="w-3.5 h-3.5 text-[#00BAF2]" />
              <span>Merchant Spoken Query</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold uppercase bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-700">
                {caseFile.language}
              </span>
              <span className="text-[11px] font-bold text-[#00B368] bg-[#E6F9F0] px-2 py-0.5 rounded-full border border-[#B7EDCE]">
                {conf.text}
              </span>
            </div>
          </div>
          <p className="text-base font-semibold text-[#002970] font-hindi leading-relaxed bg-sky-50/50 p-3 rounded-xl border border-sky-100">
            "{caseFile.transcript}"
          </p>
        </div>

        {/* Diagnosis & Escalation Reason */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#FFF8EE] border border-[#FDE6C8] rounded-2xl p-4">
            <span className="text-xs font-black text-amber-800 uppercase tracking-wider block mb-1">
              AI Diagnosis
            </span>
            <p className="text-xs sm:text-sm font-semibold text-amber-950 leading-relaxed">
              {caseFile.diagnosis}
            </p>
          </div>

          <div className="bg-[#FEEBEB] border border-[#FBC4C4] rounded-2xl p-4">
            <span className="text-xs font-black text-[#EE272C] uppercase tracking-wider block mb-1">
              Escalation Trigger Reason
            </span>
            <p className="text-xs sm:text-sm font-semibold text-[#8B1515] leading-relaxed">
              {caseFile.escalation_reason}
            </p>
          </div>
        </div>

        {/* Evidence & Actions Taken Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Evidence */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
            <span className="text-xs font-black text-[#002970] uppercase tracking-wider block mb-2">
              Evidence Verified by AI
            </span>
            <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
              {caseFile.evidence.map((ev, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00B368] shrink-0 mt-0.5" />
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions Taken */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
            <span className="text-xs font-black text-[#002970] uppercase tracking-wider block mb-2">
              Actions Taken by Saathi
            </span>
            <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
              {caseFile.actions_taken.map((act, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-[#00BAF2] shrink-0 mt-0.5" />
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* What was Told to Merchant */}
        <div className="bg-[#EBF7FD] border border-[#D0EBFB] rounded-2xl p-4">
          <span className="text-xs font-black text-[#002970] uppercase tracking-wider block mb-1">
            Exact Response Spoken to Merchant
          </span>
          <p className="text-xs sm:text-sm font-semibold text-[#002970] font-hindi leading-relaxed">
            "{caseFile.told_to_merchant}"
          </p>
        </div>

        {/* Recommended Next Step for Human Agent */}
        <div className="bg-[#002970] text-white rounded-2xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-black text-[#00BAF2] uppercase tracking-wider block mb-1">
              Recommended Support Specialist Action
            </span>
            <p className="text-sm font-bold leading-relaxed text-blue-50">
              {caseFile.recommended_next_step}
            </p>
          </div>

          {ticketId && (
            <Link
              href={`/console/tickets/${ticketId}`}
              className="px-4 py-2 rounded-xl bg-[#00BAF2] hover:bg-[#009EDB] text-white text-xs font-bold transition-all shadow shrink-0 self-start sm:self-auto flex items-center gap-1.5"
            >
              <span>View Audit Trace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
