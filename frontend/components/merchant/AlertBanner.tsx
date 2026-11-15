'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Play, Sparkles } from 'lucide-react';
import { Language, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface AlertBannerProps {
  onPlayAlert?: () => void;
  lang?: Language;
  className?: string;
}

export function AlertBanner({
  onPlayAlert,
  lang = 'hi',
  className,
}: AlertBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'w-full bg-amber-500 text-white px-4 py-2.5 rounded-card shadow-soft flex items-center justify-between gap-3 text-xs font-semibold',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
        <span className="font-hindi">{t('simulated_outage_banner', lang)}</span>
      </div>

      {onPlayAlert && (
        <button
          onClick={onPlayAlert}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-amber-900 text-[11px] font-bold hover:bg-amber-50 transition-colors shrink-0 shadow-xs"
        >
          <Play className="w-3 h-3 fill-amber-900" />
          <span>{t('play_alert', lang)}</span>
        </button>
      )}
    </motion.div>
  );
}
