'use client';

import React from 'react';
import { TraceEvent, TraceType } from '@/lib/types';
import { TierBadge } from '@/components/ui/TierBadge';
import { JsonViewer } from '@/components/ui/JsonViewer';
import { formatTimeOffset } from '@/lib/format';
import {
  Mic,
  Zap,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  Server,
  UserCheck,
  Users,
  CheckCircle2,
  XCircle,
  Volume2,
  AlertTriangle,
  Code2,
  Check,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TraceTimelineProps {
  events: TraceEvent[];
  className?: string;
}

export function TraceTimeline({ events, className }: TraceTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-[#E8EEF5] p-8 text-center text-slate-500">
        <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold">No trace events recorded yet.</p>
      </div>
    );
  }

  const startTs = events[0]?.ts;

  const getEventMeta = (type: TraceType, payload: Record<string, unknown>) => {
    switch (type) {
      case 'transcript':
        return {
          icon: <Mic className="w-3.5 h-3.5" />,
          title: 'Merchant Voice Query Transcribed',
          badge: payload.language ? String(payload.language).toUpperCase() : 'STT',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          pinColor: 'bg-[#00BAF2] text-white',
        };
      case 'intent':
        return {
          icon: <Zap className="w-3.5 h-3.5" />,
          title: 'Intent & Entity Extraction',
          badge: payload.intent ? String(payload.intent) : 'INTENT',
          badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
          pinColor: 'bg-purple-600 text-white',
        };
      case 'tool_proposed':
        return {
          icon: <Wrench className="w-3.5 h-3.5" />,
          title: 'Action / Tool Proposed by AI',
          badge: payload.tool ? String(payload.tool) : 'TOOL',
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
          pinColor: 'bg-amber-500 text-white',
        };
      case 'policy_decision':
        return {
          icon: <ShieldCheck className="w-3.5 h-3.5" />,
          title: 'Safety Policy Tier Evaluated',
          badge: payload.decision ? String(payload.decision) : 'POLICY',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          pinColor: 'bg-[#002970] text-white',
        };
      case 'tool_result':
        return {
          icon: <Server className="w-3.5 h-3.5" />,
          title: 'Tool Execution / Telemetry Query Result',
          badge: payload.status ? String(payload.status).toUpperCase() : 'SUCCESS',
          badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
          pinColor: 'bg-emerald-600 text-white',
        };
      case 'merchant_confirmation':
        return {
          icon: <UserCheck className="w-3.5 h-3.5" />,
          title: 'Merchant Interactive Confirmation',
          badge: payload.answer ? `ANSWER: ${String(payload.answer).toUpperCase()}` : 'CONFIRM',
          badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
          pinColor: 'bg-[#00BAF2] text-white',
        };
      case 'approval_created':
        return {
          icon: <Users className="w-3.5 h-3.5" />,
          title: 'Escalated to Human Approval Queue (Tier 2B)',
          badge: 'PENDING AGENT',
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
          pinColor: 'bg-amber-500 text-white',
        };
      case 'approval_decided':
        return {
          icon: payload.decision === 'approve' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />,
          title: `Human Agent ${payload.decision === 'approve' ? 'Approved' : 'Rejected'} Action`,
          badge: payload.decision ? String(payload.decision).toUpperCase() : 'DECIDED',
          badgeColor: payload.decision === 'approve' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200',
          pinColor: payload.decision === 'approve' ? 'bg-[#00B368] text-white' : 'bg-[#EE272C] text-white',
        };
      case 'escalation':
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5" />,
          title: 'Handed Off to Human Support (Tier 3)',
          badge: 'TIER 3 ESCALATED',
          badgeColor: 'bg-red-50 text-red-700 border-red-200',
          pinColor: 'bg-[#EE272C] text-white',
        };
      case 'reply':
        return {
          icon: <Volume2 className="w-3.5 h-3.5" />,
          title: 'Spoken Audio & Text Reply Delivered',
          badge: 'REPLY',
          badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
          pinColor: 'bg-[#002970] text-white',
        };
      case 'error':
      default:
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          title: 'Error or Exception',
          badge: 'ERROR',
          badgeColor: 'bg-red-50 text-red-700 border-red-200',
          pinColor: 'bg-[#EE272C] text-white',
        };
    }
  };

  return (
    <div className={cn('relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E8EEF5]', className)}>
      {events.map((event, idx) => {
        const meta = getEventMeta(event.type, event.payload);
        const offset = formatTimeOffset(event.ts, startTs);

        return (
          <div key={idx} className="relative group">
            {/* Timeline Node Pin */}
            <div
              className={cn(
                'absolute -left-6 sm:-left-8 top-1 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-110 z-10',
                meta.pinColor
              )}
            >
              {meta.icon}
            </div>

            {/* Event Container Card */}
            <div className="bg-white rounded-2xl border border-[#E8EEF5] shadow-[0_2px_12px_rgba(0,41,112,0.04)] overflow-hidden transition-all hover:border-[#D0EBFB]">
              {/* Event Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-[#F9FBFE] to-white border-b border-[#E8EEF5] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-black text-xs sm:text-sm text-[#002970]">
                    Step {event.step_no}: {meta.title}
                  </span>
                  <span className={cn('text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border', meta.badgeColor)}>
                    {meta.badge}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#5B7089]">
                  <span className="font-mono text-[11px] bg-[#F0F5FA] px-2 py-0.5 rounded font-bold text-[#002970]">
                    {offset}
                  </span>
                </div>
              </div>

              {/* Event Body Details */}
              <div className="p-4 space-y-3">
                {/* Policy Decision Special Callout */}
                {event.type === 'policy_decision' ? (
                  <div className="bg-[#EBF7FD] border border-[#D0EBFB] rounded-xl p-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#002970]">Policy Rule:</span>
                        <code className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-[#D0EBFB] text-[#002970]">
                          {String(event.payload.rule || 'RULE_DEFAULT')}
                        </code>
                      </div>
                      {Boolean(event.payload.tier) && (
                        <TierBadge tier={event.payload.tier as any} size="sm" />
                      )}
                    </div>
                    {Boolean(event.payload.reason) && (
                      <p className="text-xs text-[#002970] font-medium leading-relaxed">
                        <strong>Why this tier:</strong> {String(event.payload.reason)}
                      </p>
                    )}
                  </div>
                ) : null}

                {/* Plain-language explanation for transcript */}
                {event.type === 'transcript' && Boolean(event.payload.transcript) ? (
                  <p className="text-sm font-semibold text-[#002970] font-hindi bg-sky-50/50 p-2.5 rounded-xl border border-sky-100">
                    "{String(event.payload.transcript)}"
                  </p>
                ) : null}

                {/* Plain-language explanation for reply */}
                {event.type === 'reply' && Boolean(event.payload.reply_text) ? (
                  <p className="text-sm font-semibold text-[#002970] font-hindi bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                    "{String(event.payload.reply_text)}"
                  </p>
                ) : null}

                {/* Collapsible JSON payload */}
                <JsonViewer data={event.payload} title={`Event #${event.step_no} Payload`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
