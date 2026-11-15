'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Sparkles, AlertCircle } from 'lucide-react';
import { EvidenceStrip } from './EvidenceStrip';
import { StatusPill } from '@/components/ui/StatusPill';
import { Chip } from '@/components/ui/Chip';
import { Language, t } from '@/lib/i18n';
import { formatConfidence } from '@/lib/format';
import { TicketStatus, Tier } from '@/lib/types';
import { speakText, stopSpeaking, isTTSSupported, preloadVoices } from '@/lib/speech';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  sender: 'merchant' | 'saathi';
  text: string;
  duration?: number;
  language?: string;
  confidence?: number | null;
  audioUrl?: string | null;
  status?: TicketStatus;
  tier?: Tier | null;
  evidence?: string[];
  ts: string;
}

// Pre-load voices on first import
if (typeof window !== 'undefined') {
  preloadVoices();
}

/** Saathi reply bubble — with auto-TTS and Play/Pause controls */
function SaathiBubble({ message, lang }: { message: ChatMessage; lang: Language }) {
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    setTtsSupported(isTTSSupported());
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Auto-speak when this bubble first appears
  useEffect(() => {
    if (!isTTSSupported() || !message.text) return;

    // Small delay so UI renders first
    const timer = setTimeout(() => {
      if (!isMountedRef.current) return;
      setIsSpeakingLocal(true);
      speakText(message.text, lang, {
        rate: lang === 'hi' ? 0.9 : 1.0,
        pitch: 1.05,
        onEnd: () => {
          if (isMountedRef.current) setIsSpeakingLocal(false);
        },
      });
    }, 300);

    return () => clearTimeout(timer);
  // Only auto-speak once per message (on mount)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id]);

  const handlePlayPause = () => {
    if (isSpeakingLocal) {
      stopSpeaking();
      setIsSpeakingLocal(false);
    } else {
      setIsSpeakingLocal(true);
      speakText(message.text, lang, {
        rate: lang === 'hi' ? 0.9 : 1.0,
        pitch: 1.05,
        onEnd: () => {
          if (isMountedRef.current) setIsSpeakingLocal(false);
        },
      });
    }
  };

  return (
    <div className="flex flex-col items-start space-y-2 max-w-[92%] mr-auto">
      <div className="bg-white text-navy-900 border border-[#E2ECF6] rounded-2xl rounded-tl-sm p-4 shadow-card space-y-3 w-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-[#00BAF2]/10 border border-[#00BAF2]/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-[#00BAF2]" />
            </div>
            <span className="font-heading font-bold text-xs text-[#00BAF2]">Paytm Saathi</span>
          </div>
          {message.status && <StatusPill status={message.status} size="sm" />}
        </div>

        {/* Reply text — 20px per brief */}
        <p
          className="text-[19px] sm:text-[20px] font-medium text-[#002E6E] leading-relaxed font-hindi"
          lang={lang}
        >
          {message.text}
        </p>

        {/* TTS Play/Pause bar */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          {ttsSupported ? (
            <button
              onClick={handlePlayPause}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all border',
                isSpeakingLocal
                  ? 'bg-[#EE272C]/10 text-[#EE272C] border-[#EE272C]/30 hover:bg-[#EE272C]/20'
                  : 'bg-[#00BAF2]/10 text-[#00BAF2] border-[#00BAF2]/30 hover:bg-[#00BAF2]/20'
              )}
            >
              {isSpeakingLocal ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Speaking…</span>
                  {/* Animated sound bars */}
                  <span className="flex items-end gap-0.5 h-3 ml-0.5">
                    {[2, 4, 3, 5, 2].map((h, i) => (
                      <span
                        key={i}
                        className="w-0.5 bg-[#EE272C] rounded-full animate-bounce"
                        style={{ height: `${h * 2}px`, animationDelay: `${i * 0.12}s` }}
                      />
                    ))}
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-[#00BAF2]" />
                  <span>Play reply</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[11px] text-text-muted flex items-center gap-1">
              <VolumeX className="w-3.5 h-3.5" />
              Voice unavailable in this browser
            </span>
          )}

          {isSpeakingLocal && (
            <span className="text-[11px] text-text-muted animate-pulse">
              {lang === 'hi' ? 'बोल रहा हूँ…' : 'Speaking…'}
            </span>
          )}
        </div>

        {/* Evidence strip */}
        {message.evidence && message.evidence.length > 0 && (
          <EvidenceStrip evidence={message.evidence} lang={lang} />
        )}
      </div>
    </div>
  );
}

/** Merchant voice/text bubble */
function MerchantBubble({ message, lang }: { message: ChatMessage; lang: Language }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const conf = formatConfidence(message.confidence);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) setTimeout(() => setIsPlaying(false), 3000);
  };

  return (
    <div className="flex flex-col items-end space-y-1.5 max-w-[88%] ml-auto">
      <div className="bg-sky-50 text-navy-900 border border-sky-200 rounded-2xl rounded-tr-sm p-3.5 shadow-soft space-y-2 w-full">
        {/* Waveform player */}
        <div className="flex items-center gap-2.5 pb-2 border-b border-sky-200/60">
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-[#00BAF2] text-white flex items-center justify-center hover:bg-[#0090C8] transition-colors shrink-0"
          >
            {isPlaying
              ? <Pause className="w-4 h-4" />
              : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          {/* Animated waveform bars */}
          <div className="flex items-center gap-0.5 flex-1 h-5 overflow-hidden">
            {[40, 75, 55, 90, 60, 30, 85, 100, 65, 45, 80, 50, 95, 70, 40, 60].map((h, i) => (
              <span
                key={i}
                className={cn('w-1 rounded-full transition-all duration-200',
                  isPlaying ? 'bg-[#00BAF2] animate-pulse' : 'bg-[#00BAF2]/40')}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <span className="text-[11px] font-mono text-text-muted shrink-0">
            {message.duration ? `0:0${Math.round(message.duration)}` : '0:03'}
          </span>
        </div>

        {/* Transcript text */}
        <p className="text-sm font-medium text-navy-900 leading-relaxed font-hindi" lang="hi">
          "{message.text}"
        </p>

        {/* Language & Confidence chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-navy-900 border border-sky-200 uppercase">
            {message.language || 'hi'}
          </span>
          {conf.isUnknown ? (
            <Chip variant="neutral" size="sm">{t('confidence_unknown', lang)}</Chip>
          ) : conf.isLow ? (
            <Chip variant="warning" size="sm" icon={<AlertCircle className="w-3 h-3" />}>
              {conf.text} · {t('low_confidence_warning', lang)}
            </Chip>
          ) : (
            <Chip variant="success" size="sm">{conf.text}</Chip>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReplyBubble({ message, lang = 'hi' }: { message: ChatMessage; lang?: Language }) {
  if (message.sender === 'merchant') {
    return <MerchantBubble message={message} lang={lang} />;
  }
  return <SaathiBubble message={message} lang={lang} />;
}
