'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Language, t } from '@/lib/i18n';

export interface DeviceBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: 'online' | 'offline';
  lang?: Language;
  showIcon?: boolean;
}

export function DeviceBadge({
  status,
  lang = 'hi',
  showIcon = true,
  className,
  ...props
}: DeviceBadgeProps) {
  const isOnline = status === 'online';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-2.5 py-1 rounded-chip border text-xs font-medium transition-all duration-300',
        isOnline
          ? 'bg-emerald-50 text-online border-emerald-300'
          : 'bg-red-50 text-offline border-red-300',
        className
      )}
      {...props}
    >
      <div className="relative flex items-center justify-center w-2.5 h-2.5">
        <AnimatePresence mode="wait">
          {isOnline ? (
            <motion.span
              key="online-dot"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="relative flex h-2.5 w-2.5"
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-online" />
            </motion.span>
          ) : (
            <motion.span
              key="offline-dot"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="relative flex h-2.5 w-2.5"
            >
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-offline" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        <motion.span
          key={`${status}-${lang}`}
          initial={{ y: 2, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -2, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1 font-semibold"
        >
          {isOnline ? (
            <>
              {showIcon && <Check className="w-3.5 h-3.5 text-online stroke-[2.5]" />}
              <span>{t('online', lang)}</span>
              <span className="text-[11px] font-normal opacity-75">· Online</span>
            </>
          ) : (
            <>
              {showIcon && <WifiOff className="w-3.5 h-3.5 text-offline" />}
              <span>{t('offline', lang)}</span>
              <span className="text-[11px] font-normal opacity-75">· Offline</span>
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
