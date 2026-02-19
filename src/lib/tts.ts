/**
 * Text-to-Speech utilities for Avabodhak
 * Simplified to only support line-level TTS (entire line playback)
 * Uses Sarvam.ai backend with browser Cache API for offline repeat plays
 */

const TTS_ENABLED = import.meta.env.VITE_FEATURE_TTS === 'true';

export function isTTSEnabled(): boolean {
  return TTS_ENABLED;
}

// Supported languages for TTS (English/IAST excluded due to poor quality)
export function isTTSSupportedForLang(lang: string): boolean {
  const supported = ['deva', 'knda', 'tel', 'tam', 'pan', 'guj', 'mr', 'ben', 'mal'];
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

// --------------- Cache management ---------------

/** Delete a specific entry from the browser TTS cache */
export async function clearTTSCacheEntry(lang: string, text: string): Promise<boolean> {
  try {
    const cache = await caches.open(TTS_CACHE_NAME);
    return await cache.delete(ttsCacheKey(lang, text));
  } catch {
    return false;
  }
}

/** Delete all entries from the browser TTS cache */
export async function clearAllTTSCache(): Promise<boolean> {
  try {
    return await caches.delete(TTS_CACHE_NAME);
  } catch {
    return false;
  }
}

// --------------- Text cleaning for TTS ---------------

/** Clean text for TTS: remove dandas, verse numbers, and punctuation marks */
function cleanTextForTTS(text: string): string {
  return text.trim()
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
 *
 * Uses a generation counter to prevent stale async operations from
 * starting playback after a newer playLine() call has taken over.
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
  private activeAbort: AbortController | null = null;
  private playGeneration: number = 0;

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

    // Stop any current playback and abort in-flight fetches
    this.cleanup();

    // Capture this call's generation — if cleanup() is called again (by a newer
    // playLine or stop), generation increments and we bail at every async boundary.
    const myGen = this.playGeneration;

    if (!TTS_ENABLED || !text.trim()) {
      return;
    }

    this.callbacks.onStart?.();

    try {
      const ttsText = cleanTextForTTS(text);
      const useWordTiming = Array.isArray(words) && words.length > 0 && this.callbacks.onWordChange;

      console.log('LineTTS: playLine start', { lang, length: ttsText.length, wordSync: useWordTiming });

      // Check cache before fetching from network
      let blob: Blob;

      const cached = await getCachedAudio(lang, ttsText);

      // Bail if superseded during cache lookup
      if (this.playGeneration !== myGen) return;

      if (cached) {
        console.log('LineTTS: cache hit');
        blob = await cached.blob();
      } else {
        console.log('LineTTS: cache miss');

        // Create AbortController for this fetch — stored on instance so cleanup() can abort it
        const controller = new AbortController();
        this.activeAbort = controller;
        const timeoutId = window.setTimeout(() => controller.abort(), 15000); // 15s timeout

        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: ttsText, lang }),
          signal: controller.signal,
        });

        window.clearTimeout(timeoutId);

        // Bail if superseded during fetch
        if (this.playGeneration !== myGen) return;

        if (!res.ok) {
          console.error('LineTTS: TTS request failed', res.status, res.statusText);
          throw new Error(`TTS request failed: ${res.status}`);
        }

        console.log('LineTTS: response OK', { status: res.status });

        // Store in cache before consuming the response body
        await putCachedAudio(lang, ttsText, res);
        blob = await res.blob();
      }

      // Bail if superseded during blob conversion
      if (this.playGeneration !== myGen || this.disposed) {
        return;
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

      // Bail if superseded during metadata loading
      if (this.playGeneration !== myGen) {
        audio.pause();
        URL.revokeObjectURL(url);
        return;
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
        if (!this.currentAudio || this.playGeneration !== myGen) {
          console.warn('LineTTS: superseded before playback');
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
            // If superseded, resolve silently instead of error
            if (this.playGeneration !== myGen) {
              resolve();
              return;
            }
            console.error('LineTTS: play() rejected', err);
            handleError(err);
          });
      });
    } catch (err: any) {
      // Silently ignore AbortError from cancelled fetches
      if (err?.name === 'AbortError' || this.playGeneration !== myGen) return;
      console.error('TTS line fetch error', err);
      this.callbacks.onError?.(err);
      this.cleanup();
    } finally {
      if (this.playGeneration === myGen) {
        this._isPlaying = false;
      }
    }
  }

  /**
   * Prefetch audio for a line of text into the cache without playing it.
   * Best-effort — errors are silently ignored.
   */
  async prefetch(text: string, lang: string): Promise<void> {
    if (!TTS_ENABLED || !text.trim()) return;

    const ttsText = cleanTextForTTS(text);

    // Already cached — nothing to do
    const cached = await getCachedAudio(lang, ttsText);
    if (cached) return;

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText, lang }),
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      if (res.ok) {
        await putCachedAudio(lang, ttsText, res);
        console.log('LineTTS: prefetch cached', { lang, length: ttsText.length });
      }
    } catch {
      // Prefetch is best-effort — silently ignore errors
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
   * Clean up audio resources and invalidate any in-flight playLine calls
   */
  private cleanup(): void {
    // Increment generation to invalidate any in-flight async playLine operations
    this.playGeneration++;

    // Abort any in-flight fetch
    if (this.activeAbort) {
      this.activeAbort.abort();
      this.activeAbort = null;
    }

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
