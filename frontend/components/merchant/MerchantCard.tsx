'use client';

import React from 'react';
import { Merchant } from '@/lib/types';
import { DeviceBadge } from '@/components/ui/DeviceBadge';
import { Language } from '@/lib/i18n';
import { MapPin, Speaker } from 'lucide-react';

export interface MerchantCardProps {
  merchant: Merchant;
  lang: Language;
}

export function MerchantCard({ merchant, lang }: MerchantCardProps) {
  return (
    <div className="bg-white rounded-card p-4 border border-border shadow-soft transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-heading font-bold text-lg text-navy-900 leading-snug">
              {merchant.name}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1 font-medium text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
              <span>{merchant.city}</span>
            </span>

            <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 text-navy-900 px-2 py-0.5 rounded font-semibold border border-slate-200">
              <Speaker className="w-3 h-3 text-brand-500 shrink-0" />
              <span>{merchant.soundbox_id}</span>
            </span>
          </div>
        </div>

        <div className="shrink-0">
          <DeviceBadge status={merchant.device_status} lang={lang} />
        </div>
      </div>
    </div>
  );
}
