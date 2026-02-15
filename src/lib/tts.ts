/**
 * Text-to-Speech utilities for Avabodhak
 * Simplified to only support line-level TTS (entire line playback)
 * Uses Sarvam.ai backend with browser Cache API for offline repeat plays
 */

const TTS_ENABLED = import.meta.env.VITE_FEATURE_TTS === 'true';

export function isTTSEnabled(): boolean {
  return TTS_ENABLED;
}

// Supported languages for TTS
export function isTTSSupportedForLang(lang: string): boolean {
  const supported = ['deva', 'knda', 'tel', 'tam', 'pan', 'guj', 'mr', 'ben', 'mal', 'iast'];
  return supported.includes(lang);
}

// --------------- Cache API infrastructure ---------------

const TTS_CACHE_NAME = 'tts-sarvam-v1';

function ttsCacheKey(lang: string, text: string): string {
  return `https://tts-cache/${lang}/${encodeURIComponent(text)}`;
}

async function getCachedAudio(lang: string, text: string): Promise<Response | undefined> {
  try {
    const cache = await caches.open(TTS_CACHE_NAME);
    const match = await cache.match(ttsCacheKey(lang, text));
    return match || undefined;
  } catch {
    return undefined;
  }
}

async function putCachedAudio(lang: string, text: string, response: Response): Promise<void> {
  try {
    const cache = await caches.open(TTS_CACHE_NAME);
    await cache.put(ttsCacheKey(lang, text), response.clone());
  } catch {
    // Cache API unavailable (e.g. Firefox private browsing)
  }
}

// --------------- Client-side word-timing estimation ---------------

function estimateTimepoints(words: string[], duration: number): { word: number; time: number }[] {
  if (words.length === 0 || duration <= 0) return [];

  // Weight each word by character count
  const charCounts = words.map(w => w.length);
  const totalChars = charCounts.reduce((sum, c) => sum + c, 0);
  if (totalChars === 0) return [];

  const timepoints: { word: number; time: number }[] = [];
  let elapsed = 0;

  for (let i = 0; i < words.length; i++) {
    timepoints.push({ word: i, time: elapsed });
    elapsed += (charCounts[i] / totalChars) * duration;
  }

  return timepoints;
}

/**
 * Callbacks for LineTTSPlayer events
 */
export interface LineTTSCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onWordChange?: (wordIndex: number) => void;
}

/**
 * LineTTSPlayer - Plays audio for entire lines of text
 * Uses the /api/tts endpoint (backed by Sarvam.ai)
 * Caches audio in browser Cache API for instant repeat plays
 */
export class LineTTSPlayer {
  private currentAudio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private callbacks: LineTTSCallbacks = {};
  private disposed: boolean = false;
  private _isPlaying: boolean = false;
  private audioUnlocked: boolean = false;
  private timepoints: { word: number; time: number }[] = [];
  private currentWordIndex: number = -1;
  private timeupdateHandler: (() => void) | null = null;

  constructor() {}

  setCallbacks(callbacks: LineTTSCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Unlock audio on Safari by playing silent audio
   */
  private unlockAudio(): void {
    if (this.audioUnlocked) return;
    try {
      const silent = new Audio(
        'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4T/hv+EAAAAAAAAAAAAAAAAAAAAAP/7kGQAD/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kGQAD/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ=='
      );
      silent.play().catch(() => {});
      this.audioUnlocked = true;
    } catch {}
  }

  /**
   * Play audio for entire line text with optional word-level synchronization
   * @param text - The text to speak
   * @param lang - Language code
   * @param words - Optional array of words for word-level sync (enables highlighting)
   */
  async playLine(text: string, lang: string, words?: string[]): Promise<void> {
    // Unlock audio on first play (Safari requirement)
    this.unlockAudio();

    // Stop any current playback
    this.cleanup();

    if (!TTS_ENABLED || !text.trim()) {
      return;
    }

    this.callbacks.onStart?.();

    try {
      // Clean text for TTS: remove dandas, verse numbers, and punctuation marks
      // that cause unintended audio rendering
      let ttsText = text.trim()
        // Remove double danda with numbers: ॥ १ ॥, ॥ 1 ॥, ॥ ೧ ॥, ॥ ౧ ॥, ॥ ௧ ॥
        .replace(/॥\s*[०-९೦-೯౦-౯௦-௯\d]+\s*॥/g, '')
        // Remove ASCII double-pipe with numbers: || 1 ||, || 12 ||
        .replace(/\|\|\s*\d+\s*\|\|/g, '')
        // Remove remaining double dandas: ॥ or ||
        .replace(/॥/g, '')
        .replace(/\|\|/g, '')
        // Remove remaining single dandas: । or | (pada separators)
        .replace(/[।|]/g, '')
        // Remove trailing verse/line numbers (standalone digits at end)
        .replace(/\s+\d+\s*$/, '')
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .trim();

      const useWordTiming = Array.isArray(words) && words.length > 0 && this.callbacks.onWordChange;

      console.log('LineTTS: playLine start', { lang, length: ttsText.length, wordSync: useWordTiming });

      // Check cache before fetching from network
      let blob: Blob;

      const cached = await getCachedAudio(lang, ttsText);
      if (cached) {
        console.log('LineTTS: cache hit');
        blob = await cached.blob();
      } else {
        console.log('LineTTS: cache miss');

        // Fetch line audio from TTS API
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 15000); // 15s timeout

        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: ttsText, lang }),
          signal: controller.signal,
        });

        window.clearTimeout(timeoutId);

        if (!res.ok) {
          console.error('LineTTS: TTS request failed', res.status, res.statusText);
          throw new Error(`TTS request failed: ${res.status}`);
        }

        console.log('LineTTS: response OK', { status: res.status });

        // Store in cache before consuming the response body
        await putCachedAudio(lang, ttsText, res);
        blob = await res.blob();
      }

      console.log('LineTTS: got blob', { size: blob.size });

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      // Set audio properties
      audio.volume = 1;
      audio.muted = false;
      audio.playbackRate = 1;

      // Expose for manual debugging in dev tools
      try {
        if (typeof window !== 'undefined' && (import.meta as any)?.env?.DEV) {
          (window as any).__stotraLastLineTTS = audio;
        }
      } catch {}

      if (this.disposed) {
        console.warn('LineTTS: disposed during fetch, dropping audio');
        URL.revokeObjectURL(url);
        return;
      }

      console.log('LineTTS: starting playback');
      this._isPlaying = true;
      this.currentAudio = audio;
      this.currentUrl = url;
      this.currentWordIndex = -1;

      // Wait for loadedmetadata to get duration, then estimate word timepoints
      if (useWordTiming && words) {
        await new Promise<void>((resolve) => {
          audio.addEventListener('loadedmetadata', () => {
            console.log('LineTTS: loadedmetadata', { duration: audio.duration });
            this.timepoints = estimateTimepoints(words, audio.duration);
            console.log('LineTTS: estimated timepoints', { count: this.timepoints.length });
            resolve();
          }, { once: true });
          // Also resolve on error to avoid hanging
          audio.addEventListener('error', () => resolve(), { once: true });
        });
      }

      // Set up word tracking if we have timepoints
      if (this.timepoints.length > 0 && this.callbacks.onWordChange) {
        this.timeupdateHandler = () => {
          if (!this.currentAudio) return;
          const currentTime = this.currentAudio.currentTime;

          // Find the current word based on timepoints
          let newWordIndex = 0;
          for (let i = 0; i < this.timepoints.length; i++) {
            if (currentTime >= this.timepoints[i].time) {
              newWordIndex = this.timepoints[i].word;
            } else {
              break;
            }
          }

          if (newWordIndex !== this.currentWordIndex) {
            this.currentWordIndex = newWordIndex;
            this.callbacks.onWordChange?.(newWordIndex);
          }
        };
        audio.addEventListener('timeupdate', this.timeupdateHandler);

        // Trigger first word immediately
        this.callbacks.onWordChange(0);
        this.currentWordIndex = 0;
      }

      // Play and wait for end
      await new Promise<void>((resolve, reject) => {
        if (!this.currentAudio) {
          console.warn('LineTTS: currentAudio missing at playback time');
          resolve();
          return;
        }

        const handleEnded = () => {
          console.log('LineTTS: ended');
          this.callbacks.onEnd?.();
          this.cleanup();
          resolve();
        };

        const handleError = (err: any) => {
          console.error('TTS line playback error', err);
          this.callbacks.onError?.(err);
          this.cleanup();
          reject(err);
        };

        this.currentAudio.addEventListener('ended', handleEnded, { once: true });
        this.currentAudio.addEventListener('error', handleError, { once: true });

        this.currentAudio.play()
          .then(() => {
            console.log('LineTTS: play() promise resolved');
          })
          .catch((err) => {
            console.error('LineTTS: play() rejected', err);
            handleError(err);
          });
      });
    } catch (err: any) {
      console.error('TTS line fetch error', err);
      this.callbacks.onError?.(err);
      this.cleanup();
    } finally {
      this._isPlaying = false;
    }
  }

  /**
   * Stop current playback
   */
  stop(): void {
    this._isPlaying = false;
    this.cleanup();
    this.callbacks.onEnd?.();
  }

  /**
   * Check if currently playing
   */
  isPlaying(): boolean {
    return this._isPlaying;
  }

  /**
   * Clean up audio resources
   */
  private cleanup(): void {
    // Remove timeupdate listener
    if (this.currentAudio && this.timeupdateHandler) {
      this.currentAudio.removeEventListener('timeupdate', this.timeupdateHandler);
      this.timeupdateHandler = null;
    }
    this.timepoints = [];
    this.currentWordIndex = -1;

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (this.currentUrl) {
      // Revoke after a small delay to avoid races
      const urlToRevoke = this.currentUrl;
      this.currentUrl = null;
      window.setTimeout(() => {
        try {
          URL.revokeObjectURL(urlToRevoke);
        } catch {}
      }, 100);
    }
  }

  /**
   * Dispose and clean up all resources
   */
  dispose(): void {
    this.disposed = true;
    this.stop();
    this.callbacks = {};
  }
}
