'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Mic, Loader2 } from 'lucide-react';
import { Language, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface ConfirmCardProps {
  promptText?: string;
  onConfirm: (answer: 'yes' | 'no') => Promise<void>;
  lang?: Language;
  className?: string;
}

export function ConfirmCard({
  promptText,
  onConfirm,
  lang = 'hi',
  className,
}: ConfirmCardProps) {
  const [loadingAnswer, setLoadingAnswer] = useState<'yes' | 'no' | null>(null);

  const handleAction = async (answer: 'yes' | 'no') => {
    if (loadingAnswer) return;
    setLoadingAnswer(answer);
    try {
      await onConfirm(answer);
    } finally {
      setLoadingAnswer(null);
    }
  };

  const isPending = loadingAnswer !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      className={cn(
        'w-full bg-white rounded-card p-4 sm:p-5 border-2 border-brand-500/30 shadow-paytm space-y-3.5',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping" />
          <h3 className="font-heading font-bold text-base text-navy-900">
            {promptText || t('confirm_restart', lang)}
          </h3>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted bg-sky-50/70 p-2 rounded-btn border border-sky-100">
        <Mic className="w-3.5 h-3.5 text-brand-500" />
        <span className="font-medium text-brand-600">{t('or_speak_yes', lang)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Yes Button (at least 56px high) */}
        <button
          disabled={isPending}
          onClick={() => handleAction('yes')}
          className="h-14 min-h-[56px] rounded-btn bg-brand-500 text-white font-bold text-base flex items-center justify-center gap-2 shadow-soft hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loadingAnswer === 'yes' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Check className="w-5 h-5 stroke-[2.5]" />
          )}
          <span>{t('yes_do_it', lang)}</span>
        </button>

        {/* No Button */}
        <button
          disabled={isPending}
          onClick={() => handleAction('no')}
          className="h-14 min-h-[56px] rounded-btn bg-slate-100 text-navy-900 border border-slate-200 font-bold text-base flex items-center justify-center gap-2 shadow-soft hover:bg-slate-200 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loadingAnswer === 'no' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <X className="w-5 h-5 stroke-[2.5]" />
          )}
          <span>{t('no', lang)}</span>
        </button>
      </div>
    </motion.div>
  );
}
