'use client';

import React, { useEffect, useRef } from 'react';
import { ReplyBubble, ChatMessage } from './ReplyBubble';
import { Language, t } from '@/lib/i18n';
import { Sparkles, MessageSquare } from 'lucide-react';

export interface ChatThreadProps {
  messages: ChatMessage[];
  lang?: Language;
  processingState?: 'listening' | 'understanding' | 'checking' | null;
  className?: string;
  onSelectQuickQuery?: (query: string) => void;
}

export function ChatThread({
  messages,
  lang = 'hi',
  processingState,
  className,
  onSelectQuickQuery,
}: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, processingState]);

  const quickStartOptions = [
    {
      hi: 'साउंडबॉक्स बोल नहीं रहा',
      en: 'Soundbox not speaking',
    },
    {
      hi: 'सेटलमेंट नहीं मिला',
      en: 'Settlement not received',
    },
    {
      hi: 'पैसे कट गए',
      en: 'Money debited',
    },
  ];

  if (messages.length === 0 && !processingState) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 min-h-[300px]">
        <div className="w-14 h-14 rounded-2xl bg-[#00BAF2]/10 flex items-center justify-center text-[#00BAF2] border border-[#00BAF2]/20 shadow-sm">
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h3 className="font-heading font-bold text-lg text-[#002E6E]">
            {lang === 'hi' ? 'नमस्ते! मैं आपका पेटीएम साथी हूँ' : 'Hello! I am your Paytm Saathi'}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed font-hindi">
            {lang === 'hi'
              ? 'साउंडबॉक्स या सेटलमेंट की समस्या बताने के लिए माइक दबाकर बोलें या नीचे से चुनें:'
              : 'Hold the mic to speak your Soundbox or settlement issue, or choose below:'}
          </p>
        </div>

        {/* Quick-start Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 max-w-md">
          {quickStartOptions.map((opt) => {
            const label = lang === 'hi' ? opt.hi : opt.en;
            return (
              <button
                key={opt.en}
                type="button"
                onClick={() => onSelectQuickQuery?.(label)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-sky-50 border border-[#DCE7F3] hover:border-[#00BAF2] text-xs sm:text-sm font-semibold text-[#002E6E] shadow-sm hover:shadow transition-all duration-150 active:scale-95 flex items-center gap-1.5 group text-left"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00BAF2] group-hover:scale-125 transition-transform" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((msg) => (
        <ReplyBubble key={msg.id} message={msg} lang={lang} />
      ))}

      {/* Typing / Processing animation */}
      {processingState && (
        <div className="flex items-center gap-2.5 p-3 rounded-2xl rounded-tl-sm bg-white border border-border text-xs text-navy-900 shadow-soft max-w-[85%]">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:0.4s]" />
          </div>
          <span className="font-bold text-brand-600 font-hindi">
            {t(processingState, lang)}
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
