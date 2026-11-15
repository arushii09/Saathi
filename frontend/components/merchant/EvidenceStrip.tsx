'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, ShieldCheck } from 'lucide-react';
import { Language, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface EvidenceStripProps {
  evidence?: string[];
  lang?: Language;
  className?: string;
}

export function EvidenceStrip({
  evidence = [],
  lang = 'hi',
  className,
}: EvidenceStripProps) {
  const [expanded, setExpanded] = useState(false);

  if (!evidence || evidence.length === 0) return null;

  return (
    <div className={cn('flex flex-col space-y-1.5 pt-1.5', className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {evidence.map((item, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-brand-600 border border-sky-200"
          >
            <CheckCircle className="w-3 h-3 text-online shrink-0" />
            <span>{item}</span>
          </span>
        ))}

        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-text-muted hover:text-navy-900 transition-colors ml-1 px-1.5 py-0.5 rounded hover:bg-slate-100"
        >
          <span>{expanded ? t('hide_details', lang) : t('what_i_checked', lang)}</span>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {expanded && (
        <div className="p-3 bg-white/90 rounded-lg border border-sky-100 text-xs text-navy-900 space-y-1.5 shadow-xs">
          <div className="font-bold text-brand-600 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-online" />
            <span>{t('what_i_checked', lang)}:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-text-muted pl-1">
            {evidence.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                <span className="text-navy-900 font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
