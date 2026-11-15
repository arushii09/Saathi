export interface AudioRecorderState {
  isRecording: boolean;
  durationSeconds: number;
  audioLevel: number; // 0.0 to 1.0
  error: 'denied' | 'unsupported' | 'too_short' | null;
}

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private chunks: Blob[] = [];
  private animFrameId: number | null = null;
  private startTime: number = 0;
  private durationTimer: any = null;

  private onLevelChange?: (level: number) => void;
  private onDurationChange?: (sec: number) => void;

  constructor(callbacks?: {
    onLevelChange?: (level: number) => void;
    onDurationChange?: (sec: number) => void;
  }) {
    this.onLevelChange = callbacks?.onLevelChange;
    this.onDurationChange = callbacks?.onDurationChange;
  }

  public async start(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('UNSUPPORTED');
    }

    try {
      this.chunks = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.mediaStream = stream;

      // AudioContext & AnalyserNode for audio level meter
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
        this.trackLevel();
      }

      // Check supported mime type
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const options = selectedMime ? { mimeType: selectedMime } : undefined;
      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100);
      this.startTime = Date.now();

      // Haptic tick if supported
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(40);
      }

      this.durationTimer = setInterval(() => {
        const elapsed = (Date.now() - this.startTime) / 1000;
        this.onDurationChange?.(elapsed);
      }, 100);

      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('DENIED');
      }
      throw err;
    }
  }

  private trackLevel = () => {
    if (!this.analyser) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const avg = sum / data.length;
    const normalized = Math.min(1, avg / 128); // 0.0 to 1.0

    this.onLevelChange?.(normalized);
    this.animFrameId = requestAnimationFrame(this.trackLevel);
  };

  public stop(): Promise<{ blob: Blob; duration: number } | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanup();
        resolve(null);
        return;
      }

      const duration = (Date.now() - this.startTime) / 1000;

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, {
          type: this.mediaRecorder?.mimeType || 'audio/webm',
        });
        this.cleanup();
        if (duration < 1.0) {
          resolve(null); // Too short
        } else {
          resolve({ blob, duration });
        }
      };

      this.mediaRecorder.stop();
    });
  }

  public cancel() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
    this.chunks = [];
  }
}
