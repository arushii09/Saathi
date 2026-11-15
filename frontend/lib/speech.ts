/**
 * Browser Speech Engine
 * ─────────────────────
 * STT: Web Speech API (SpeechRecognition) — Chrome, Edge, Safari 15+
 * TTS: Web Speech API (SpeechSynthesis)   — all modern browsers
 *
 * Hindi BCP-47: hi-IN
 * English BCP-47: en-IN (falls back to en-US)
 */

export type SpeechLang = 'hi' | 'en';

const LANG_TAG: Record<SpeechLang, string> = {
  hi: 'hi-IN',
  en: 'en-IN',
};

// ─── Text-to-Speech ───────────────────────────────────────────────────────────

let _utteranceQueue: SpeechSynthesisUtterance[] = [];

export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Speak text aloud using the browser's speech synthesis engine. */
export function speakText(
  text: string,
  lang: SpeechLang = 'hi',
  opts?: {
    rate?: number;    // 0.5 – 2.0 (default 0.95)
    pitch?: number;   // 0.0 – 2.0 (default 1.0)
    volume?: number;  // 0.0 – 1.0 (default 1.0)
    onEnd?: () => void;
  }
): void {
  if (!isTTSSupported()) return;

  // Cancel any currently playing speech
  window.speechSynthesis.cancel();
  _utteranceQueue = [];

  // Split long text into sentences so iOS Safari doesn't cut off
  const sentences = text.match(/[^।|.!?]+[।|.!?]+/g) || [text];

  sentences.forEach((sentence, idx) => {
    const utt = new SpeechSynthesisUtterance(sentence.trim());
    utt.lang = LANG_TAG[lang];
    utt.rate = opts?.rate ?? 0.95;
    utt.pitch = opts?.pitch ?? 1.0;
    utt.volume = opts?.volume ?? 1.0;

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find(v => v.lang === LANG_TAG[lang]) ||
      voices.find(v => v.lang.startsWith(lang === 'hi' ? 'hi' : 'en')) ||
      null;

    if (preferredVoice) utt.voice = preferredVoice;

    if (idx === sentences.length - 1 && opts?.onEnd) {
      utt.onend = opts.onEnd;
    }

    _utteranceQueue.push(utt);
    window.speechSynthesis.speak(utt);
  });
}

/** Stop speaking immediately. */
export function stopSpeaking(): void {
  if (isTTSSupported()) {
    window.speechSynthesis.cancel();
    _utteranceQueue = [];
  }
}

/** Returns true if speech synthesis is currently active. */
export function isSpeaking(): boolean {
  return isTTSSupported() && window.speechSynthesis.speaking;
}

/** Pre-load voices — browsers load voice list async. */
export function preloadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    if (!isTTSSupported()) {
      resolve([]);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

// ─── Speech-to-Text ───────────────────────────────────────────────────────────

type STTCallbacks = {
  onInterim?: (text: string) => void;    // live partial text as user speaks
  onFinal?: (text: string, confidence: number) => void;  // final recognised text
  onError?: (error: string) => void;
  onEnd?: () => void;
};

type STTRecognition = {
  stop: () => void;
  abort: () => void;
};

export function isSTTSupported(): boolean {
  return typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

/**
 * Start live speech-to-text. Returns a handle to stop/abort.
 * Uses continuous recognition so the user can speak naturally.
 */
export function startSTT(
  lang: SpeechLang = 'hi',
  callbacks: STTCallbacks
): STTRecognition | null {
  if (!isSTTSupported()) {
    callbacks.onError?.('STT not supported in this browser. Please use Chrome or Edge.');
    return null;
  }

  const SpeechRecognitionAPI =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  const recognition = new SpeechRecognitionAPI();

  recognition.lang = LANG_TAG[lang];
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalTranscript = '';
  let bestConfidence = 0;

  recognition.onresult = (event: any) => {
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript + ' ';
        bestConfidence = Math.max(bestConfidence, result[0].confidence || 0.9);
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    if (interimTranscript) {
      callbacks.onInterim?.(finalTranscript + interimTranscript);
    }
    if (finalTranscript.trim()) {
      callbacks.onFinal?.(finalTranscript.trim(), bestConfidence || 0.9);
    }
  };

  recognition.onerror = (event: any) => {
    if (event.error === 'not-allowed' || event.error === 'permission-denied') {
      callbacks.onError?.('DENIED');
    } else if (event.error === 'no-speech') {
      callbacks.onEnd?.();
    } else {
      callbacks.onError?.(event.error);
    }
  };

  recognition.onend = () => {
    callbacks.onEnd?.();
  };

  try {
    recognition.start();
  } catch (err) {
    callbacks.onError?.('Failed to start speech recognition');
    return null;
  }

  return {
    stop: () => { try { recognition.stop(); } catch {} },
    abort: () => { try { recognition.abort(); } catch {} },
  };
}
