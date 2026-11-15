'use client';

import React from 'react';
import { Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface LangToggleProps {
  value: Language;
  onChange: (lang: Language) => void;
  className?: string;
}

export function LangToggle({ value, onChange, className }: LangToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Language selector"
      className={cn(
        'inline-flex items-center p-1 rounded-full bg-[#F0F5FA] border border-[#DCE7F3] select-none shadow-inner',
        className
      )}
    >
      <button
        role="radio"
        type="button"
        aria-checked={value === 'hi'}
        onClick={() => onChange('hi')}
        className={cn(
          'px-3.5 py-1 text-xs font-bold rounded-full transition-all duration-200 flex items-center gap-1.5',
          value === 'hi'
            ? 'bg-[#00BAF2] text-white shadow-sm font-extrabold'
            : 'text-[#5B7089] hover:text-[#002970] hover:bg-white/60'
        )}
      >
        <span>हिन्दी</span>
        {value === 'hi' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
      </button>

      <button
        role="radio"
        type="button"
        aria-checked={value === 'en'}
        onClick={() => onChange('en')}
        className={cn(
          'px-3.5 py-1 text-xs font-bold rounded-full transition-all duration-200 flex items-center gap-1.5',
          value === 'en'
            ? 'bg-[#00BAF2] text-white shadow-sm font-extrabold'
            : 'text-[#5B7089] hover:text-[#002970] hover:bg-white/60'
        )}
      >
        <span>English</span>
        {value === 'en' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
      </button>
    </div>
  );
}
