/**
 * Text-to-Speech utilities for Avabodhak
 * Simplified to only support line-level TTS (entire line playback)
 */

const TTS_ENABLED = import.meta.env.VITE_FEATURE_TTS === 'true';

export function isTTSEnabled(): boolean {
  return TTS_ENABLED;
}

// Supported languages for TTS
// Note: Support depends on the backend TTS service (Google Cloud TTS)
export function isTTSSupportedForLang(lang: string): boolean {
  // All languages supported by Google Cloud TTS, including IAST (English-India)
  const supported = ['deva', 'knda', 'tel', 'tam', 'pan', 'guj', 'mr', 'ben', 'mal', 'iast'];
  return supported.includes(lang);
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
 * Uses the /api/tts endpoint (backed by Google Cloud TTS)
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
      // Clean text for TTS: remove verse numbers like "॥ १ ॥", "॥ 1 ॥", "|| 1 ||"
      // Also handles Kannada (೧), Telugu (౧), Tamil (௧) numerals
      let ttsText = text.trim()
        // Remove Devanagari double danda with numbers: ॥ १ ॥, ॥ १२ ॥, etc.
        .replace(/॥\s*[०-९]+\s*॥/g, '')
        // Remove with regular numbers: ॥ 1 ॥, ॥ 12 ॥
        .replace(/॥\s*\d+\s*॥/g, '')
        // Remove ASCII version: || 1 ||, || 12 ||
        .replace(/\|\|\s*\d+\s*\|\|/g, '')
        // Remove Kannada numerals: ॥ ೧ ॥
        .replace(/॥\s*[೦-೯]+\s*॥/g, '')
        // Remove Telugu numerals: ॥ ౧ ॥
        .replace(/॥\s*[౦-౯]+\s*॥/g, '')
        // Remove Tamil numerals: ॥ ௧ ॥
        .replace(/॥\s*[௦-௯]+\s*॥/g, '')
        // Remove single danda at end: । or |
        .replace(/[।|]\s*$/, '')
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .trim();

      // Determine if we should use word-level timing
      const useWordTiming = Array.isArray(words) && words.length > 0 && this.callbacks.onWordChange;

      console.log('LineTTS: playLine start', { lang, length: ttsText.length, wordSync: useWordTiming });

      // Fetch line audio from TTS API
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000); // 15s timeout

      const requestBody: any = { text: ttsText, lang };
      if (useWordTiming) {
        requestBody.words = words;
      }

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      if (!res.ok) {
        console.error('LineTTS: TTS request failed', res.status, res.statusText);
        throw new Error(`TTS request failed: ${res.status}`);
      }

      const contentType = res.headers.get('Content-Type');
      console.log('LineTTS: response OK', { status: res.status, contentType });

      let blob: Blob;

      // Handle JSON response (with word timing) vs binary audio
      if (contentType?.includes('application/json')) {
        const data = await res.json();
        this.timepoints = data.timepoints || [];
        console.log('LineTTS: got timepoints', { count: this.timepoints.length });

        // Convert base64 audio to blob
        const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
        blob = new Blob([audioBytes], { type: 'audio/mpeg' });
      } else {
        blob = await res.blob();
        this.timepoints = [];
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

        this.currentAudio.addEventListener('loadedmetadata', () => {
          console.log('LineTTS: loadedmetadata', { duration: this.currentAudio?.duration });
        }, { once: true });

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
