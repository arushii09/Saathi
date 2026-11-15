'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, X, AlertTriangle, Loader2 } from 'lucide-react';
import { AudioRecorder } from '@/lib/recorder';
import { startSTT, isSTTSupported, type SpeechLang } from '@/lib/speech';
import { Language, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface MicButtonProps {
  /** Called when user stops speaking — blob for backend upload + live transcript text. */
  onRecordingComplete: (blob: Blob, duration: number, liveTranscript?: string) => void;
  onPermissionDenied?: () => void;
  lang?: Language;
  disabled?: boolean;
  className?: string;
  hideCaption?: boolean;
}

export function MicButton({
  onRecordingComplete,
  onPermissionDenied,
  lang = 'hi',
  disabled = false,
  className,
  hideCaption = false,
}: MicButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [duration, setDuration] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [liveText, setLiveText] = useState<string>('');
  const [sttAvailable, setSttAvailable] = useState(false);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const sttRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isCancelledRef = useRef(false);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    setSttAvailable(isSTTSupported());
    recorderRef.current = new AudioRecorder({
      onLevelChange: (lvl) => setAudioLevel(lvl),
      onDurationChange: (sec) => setDuration(sec),
    });
    return () => {
      recorderRef.current?.cancel();
      sttRef.current?.abort();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const startRecording = async () => {
    if (disabled || isRecording) return;
    isCancelledRef.current = false;
    finalTranscriptRef.current = '';
    setLiveText('');
    setDuration(0);

    try {
      await recorderRef.current?.start();
      setIsRecording(true);

      // Haptic tick on mobile
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(40);
      }

      // Start live STT in parallel (Chrome/Edge only)
      if (sttAvailable) {
        sttRef.current = startSTT(lang as SpeechLang, {
          onInterim: (text) => setLiveText(text),
          onFinal: (text) => {
            finalTranscriptRef.current = text;
            setLiveText(text);
          },
          onError: (err) => {
            if (err === 'DENIED') onPermissionDenied?.();
            // STT error is non-fatal — audio recording still works
          },
        });
      }
    } catch (err: any) {
      if (err.message === 'DENIED') {
        onPermissionDenied?.();
      } else {
        showToast(t('error', lang));
      }
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);

    // Stop STT first
    sttRef.current?.stop();
    sttRef.current = null;

    if (isCancelledRef.current) {
      recorderRef.current?.cancel();
      setLiveText('');
      return;
    }

    try {
      const result = await recorderRef.current?.stop();
      if (!result) {
        showToast(t('too_short', lang));
        setLiveText('');
        return;
      }
      onRecordingComplete(result.blob, result.duration, finalTranscriptRef.current || undefined);
      setLiveText('');
    } catch {
      showToast(t('error', lang));
      setLiveText('');
    }
  };

  // Touch: hold-to-speak, slide-left to cancel
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    startRecording();
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !isRecording) return;
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    if (deltaX < -60 && !isCancelledRef.current) {
      isCancelledRef.current = true;
      showToast('Cancelled');
      stopRecording();
    }
  };
  const handleTouchEnd = () => {
    touchStartRef.current = null;
    stopRecording();
  };

  // Click: tap to toggle (desktop accessibility)
  const handleClick = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const countdownPct = Math.min(100, (duration / 30) * 100);

  return (
    <div className={cn('flex flex-col items-center justify-center relative select-none', className)}>
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-10 px-3 py-1 bg-navy-900 text-white text-xs font-semibold rounded-full shadow-card flex items-center gap-1.5 whitespace-nowrap z-20"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live transcript bubble */}
      <AnimatePresence>
        {liveText && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            className="absolute -top-16 left-0 right-0 mx-auto max-w-xs px-3 py-2 bg-white border border-[#00BAF2]/30 rounded-xl shadow-card text-xs text-navy-900 font-hindi leading-relaxed z-20 text-center"
          >
            <span className="text-[#00BAF2] font-bold mr-1">●</span>
            {liveText}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex items-center justify-center w-[104px] h-[104px]">
        {/* Idle breathing glow - constrained within button bounds */}
        {!isRecording && (
          <div className="absolute w-[94px] h-[94px] rounded-full bg-[#00BAF2]/15 animate-breathe pointer-events-none" />
        )}

        {/* Live level-meter glow - constrained */}
        {isRecording && (
          <motion.div
            className="absolute rounded-full bg-red-400/25 pointer-events-none"
            animate={{
              width: Math.min(104, 88 + audioLevel * 16),
              height: Math.min(104, 88 + audioLevel * 16),
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          />
        )}

        {/* 30s countdown ring */}
        {isRecording && (
          <svg className="absolute w-[96px] h-[96px] -rotate-90 pointer-events-none">
            <circle cx="48" cy="48" r="44" stroke="#E2ECF6" strokeWidth="3" fill="none" />
            <circle
              cx="48" cy="48" r="44"
              stroke="#EE272C" strokeWidth="3.5" fill="none"
              strokeDasharray={276} strokeDashoffset={276 - (276 * countdownPct) / 100}
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Main 88px button */}
        <button
          disabled={disabled}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-label={isRecording ? t('tap_to_stop', lang) : t('hold_to_speak', lang)}
          className={cn(
            'w-[84px] h-[84px] rounded-full flex flex-col items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#00BAF2]/40 relative z-10 disabled:opacity-50 disabled:pointer-events-none active:scale-95',
            isRecording
              ? 'bg-[#EE272C] text-white shadow-card'
              : 'bg-[#00BAF2] hover:bg-[#0090C8] text-white shadow-paytm'
          )}
        >
          {isRecording ? (
            <>
              <Square className="w-7 h-7 fill-white stroke-none mb-0.5" />
              <span className="text-[11px] font-mono font-bold">{Math.floor(duration)}s</span>
            </>
          ) : (
            <Mic className="w-9 h-9 stroke-[2.2]" />
          )}
        </button>
      </div>

      {/* Caption - conditionally rendered */}
      {!hideCaption && (
        <div className="mt-3 text-center space-y-0.5">
          <span className="text-xs font-semibold text-text-muted block font-hindi">
            {isRecording ? t('tap_to_stop', lang) : t('hold_to_speak', lang)}
          </span>
          {isRecording && (
            <span className="text-[11px] text-[#EE272C] font-medium block animate-pulse">
              Slide left to cancel
            </span>
          )}
          {!isRecording && sttAvailable && (
            <span className="text-[11px] text-[#00B368] font-medium block">
              ✓ Live transcription ready
            </span>
          )}
          {!isRecording && !sttAvailable && (
            <span className="text-[11px] text-text-muted block opacity-70">
              Use Chrome for live transcription
            </span>
          )}
        </div>
      )}
    </div>
  );
}
