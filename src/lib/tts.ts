const TTS_ENABLED = import.meta.env.VITE_FEATURE_TTS === 'true';

export function isTTSEnabled(): boolean {
  return TTS_ENABLED;
}

// Supported languages: deva (Hindi), knda (Kannada), tel (Telugu), tam (Tamil)
// Unsupported: iast, eng, guj, pan, mr, ben, mal
export function isTTSSupportedForLang(lang: string): boolean {
  const supported = ['deva', 'knda', 'tel', 'tam'];
  return supported.includes(lang);
}

// Default duration per word when muted or TTS unavailable (ms)
const DEFAULT_WORD_DURATION_MS = 600;

// Word-level audio cache to avoid refetching and to enable prefetching.
// Cache is keyed by `${lang}::${normalizedText}`.
// We cache both the blob URL and a ready-to-clone Audio element.
type WordAudioCacheEntry = {
  url: string;
  size: number;
  lastAccess: number;
  // Keep one Audio element that has loaded metadata for instant cloning
  readyAudio: HTMLAudioElement | null;
};

const WORD_AUDIO_CACHE = new Map<string, WordAudioCacheEntry>();
let WORD_AUDIO_CACHE_BYTES = 0;

const MAX_WORD_CACHE_ENTRIES = 400;
const MAX_WORD_CACHE_BYTES = 8 * 1024 * 1024; // ~8MB

// Network timeout to prevent hangs on slow TTS requests
const WORD_FETCH_TIMEOUT_MS = 4500; // wait up to ~4.5s for network/TTS
const WORD_METADATA_TIMEOUT_MS = 2000; // wait up to 2s for metadata on first load

// Playback start watchdog: if a word's audio never actually starts playing
// (no 'playing' event) within this window, we treat it as failed and retry.
const WORD_PLAY_START_TIMEOUT_MS = 1500;

// Maximum number of times to retry playing a single word's audio before
// falling back to muted timing for that word.
const MAX_PLAY_ATTEMPTS_PER_WORD = 2;

function makeWordKey(text: string, lang: string): string {
  return `${lang}::${text}`;
}

function isUrlInWordCache(url: string): boolean {
  for (const entry of WORD_AUDIO_CACHE.values()) {
    if (entry.url === url) return true;
  }
  return false;
}

function touchWordCacheEntry(key: string): void {
  const entry = WORD_AUDIO_CACHE.get(key);
  if (entry) {
    entry.lastAccess = Date.now();
  }
}

function evictWordCacheIfNeeded(): void {
  if (WORD_AUDIO_CACHE.size <= MAX_WORD_CACHE_ENTRIES && WORD_AUDIO_CACHE_BYTES <= MAX_WORD_CACHE_BYTES) {
    return;
  }

  // Simple LRU eviction
  const entries = Array.from(WORD_AUDIO_CACHE.entries());
  entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);

  for (const [key, entry] of entries) {
    if (WORD_AUDIO_CACHE.size <= MAX_WORD_CACHE_ENTRIES && WORD_AUDIO_CACHE_BYTES <= MAX_WORD_CACHE_BYTES) break;
    WORD_AUDIO_CACHE.delete(key);
    WORD_AUDIO_CACHE_BYTES -= entry.size;
    try {
      URL.revokeObjectURL(entry.url);
    } catch {
      // ignore
    }
  }
}

function getWordCacheEntry(text: string, lang: string): WordAudioCacheEntry | undefined {
  const normalized = (text || '').trim();
  if (!normalized) return undefined;
  const key = makeWordKey(normalized, lang);
  const entry = WORD_AUDIO_CACHE.get(key);
  if (entry) {
    touchWordCacheEntry(key);
  }
  return entry;
}

function storeWordCacheEntry(text: string, lang: string, blob: Blob): WordAudioCacheEntry {
  const normalized = (text || '').trim();
  const key = makeWordKey(normalized, lang);

  const existing = WORD_AUDIO_CACHE.get(key);
  if (existing) {
    try {
      URL.revokeObjectURL(existing.url);
    } catch {
      // ignore
    }
    WORD_AUDIO_CACHE_BYTES -= existing.size;
  }

  const url = URL.createObjectURL(blob);
  const size = blob.size || 0;
  const entry: WordAudioCacheEntry = { url, size, lastAccess: Date.now(), readyAudio: null };
  WORD_AUDIO_CACHE.set(key, entry);
  WORD_AUDIO_CACHE_BYTES += size;

  evictWordCacheIfNeeded();

  return entry;
}

async function fetchWordBlob(text: string, lang: string): Promise<Blob | null> {
  if (!TTS_ENABLED) return null;
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;

  const normalized = (text || '').trim();
  if (!normalized) return null;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, WORD_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: normalized, granularity: 'word', lang }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error('TTS word request failed', res.status);
      return null;
    }

    const blob = await res.blob();
    return blob;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn('TTS word request timed out');
    } else {
      console.error('TTS word fetch error', err);
    }
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Fetch TTS audio for a single word/text using cache.
 * If cached, clone the ready Audio element for instant playback.
 * If not cached, fetch, wait for metadata once, cache it, then return.
 */
async function fetchWordAudio(text: string, lang: string): Promise<{ audio: HTMLAudioElement; url: string } | null> {
  if (!TTS_ENABLED) return null;
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;

  const normalized = (text || '').trim();
  if (!normalized) return null;

  try {
    // Try cache first
    const cached = getWordCacheEntry(normalized, lang);
    
    if (cached) {
      // If we have a ready audio element, clone it for instant playback
      if (cached.readyAudio) {
        const cloned = cached.readyAudio.cloneNode(true) as HTMLAudioElement;
        // Reset to start
        cloned.currentTime = 0;
        return { audio: cloned, url: cached.url };
      }
      
      // Otherwise create new Audio from cached URL (shouldn't happen often)
      const audio = new Audio(cached.url);
      // Don't wait for metadata here - let it load async
      // Store this as the ready audio for future use
      audio.addEventListener('loadedmetadata', () => {
        if (cached.readyAudio === null) {
          cached.readyAudio = audio;
        }
      }, { once: true });
      return { audio, url: cached.url };
    }

    // Not cached - fetch the blob
    const blob = await fetchWordBlob(normalized, lang);
    if (!blob) return null;
    
    const entry = storeWordCacheEntry(normalized, lang, blob);
    const audio = new Audio(entry.url);

    // Wait for metadata on first load, then cache the ready audio
    await new Promise<void>((resolve) => {
      const timeoutId = window.setTimeout(() => {
        console.warn('Metadata load timeout for word:', normalized);
        resolve();
      }, WORD_METADATA_TIMEOUT_MS);

      audio.addEventListener('loadedmetadata', () => {
        window.clearTimeout(timeoutId);
        // Cache this ready audio for future instant cloning
        entry.readyAudio = audio;
        resolve();
      }, { once: true });
      
      audio.addEventListener('error', () => {
        window.clearTimeout(timeoutId);
        console.error('Audio load error for word:', normalized);
        resolve();
      }, { once: true });
    });

    return { audio, url: entry.url };
  } catch (err) {
    console.error('TTS word fetch error', err);
    return null;
  }
}

/**
 * Prefetch and cache audio for a list of words (fire-and-forget).
 * This only handles network and caching; playback will still create
 * Audio elements and load metadata when needed.
 */
export function prefetchWordAudios(words: string[], lang: string): void {
  if (!TTS_ENABLED) return;
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return;

  const seenKeys = new Set<string>();

  for (const raw of words) {
    const text = (raw || '').trim();
    if (!text) continue;
    const key = makeWordKey(text, lang);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    if (WORD_AUDIO_CACHE.has(key)) {
      touchWordCacheEntry(key);
      continue;
    }

    // Fire and forget; swallow errors inside
    void (async () => {
      const blob = await fetchWordBlob(text, lang);
      if (!blob) return;
      storeWordCacheEntry(text, lang, blob);
    })();
  }
}

export interface WordTTSCallbacks {
  onWordStart?: (wordIndex: number) => void;
  onWordEnd?: (wordIndex: number) => void;
  onLineEnd?: () => void;
  onError?: (error: Error) => void;
}

export interface LineTTSCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

/**
 * WordTTSPlayer manages word-by-word TTS playback.
 * It fetches audio for each word, plays them sequentially,
 * and fires callbacks to sync word highlighting with audio.
 */
export class WordTTSPlayer {
  private words: string[] = [];
  private lang: string = '';
  private currentWordIndex: number = 0;
  private _isPlaying: boolean = false;
  private _isMuted: boolean = false;
  private _isPaused: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private preloadedAudio: { audio: HTMLAudioElement; url: string } | null = null;
  private preloadingIndex: number = -1;
  private callbacks: WordTTSCallbacks = {};
  private mutedTimer: number | null = null;
  private disposed: boolean = false;

  constructor() {}

  /**
   * Set callbacks for word events
   */
  setCallbacks(callbacks: WordTTSCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Load a new line of words
   */
  async loadLine(words: string[], lang: string): Promise<void> {
    this.stop();
    this.words = words;
    this.lang = lang;
    this.currentWordIndex = 0;
    this.disposed = false;

    // Preload first word
    if (words.length > 0 && !this._isMuted) {
      this.preloadWord(0);
    }
  }

  /**
   * Preload audio for a word index
   */
  private async preloadWord(index: number): Promise<void> {
    if (index < 0 || index >= this.words.length) return;
    if (this.preloadingIndex === index) return;
    if (this._isMuted) return;

    this.preloadingIndex = index;
    const word = this.words[index];
    const result = await fetchWordAudio(word, this.lang);
    
    if (this.disposed) {
      return;
    }

    // Only store if still relevant
    if (this.preloadingIndex === index) {
      this.preloadedAudio = result;
    }
  }

  /**
   * Start or resume playback from current word
   */
  async play(): Promise<void> {
    if (this._isPlaying && !this._isPaused) return;
    if (this.words.length === 0) return;

    this._isPlaying = true;
    this._isPaused = false;

    await this.playCurrentWord();
  }

  /**
   * Play the current word
   */
  private async playCurrentWord(): Promise<void> {
    if (!this._isPlaying || this._isPaused || this.disposed) return;
    if (this.currentWordIndex >= this.words.length) {
      this._isPlaying = false;
      this.callbacks.onLineEnd?.();
      return;
    }

    // Fire word start callback
    this.callbacks.onWordStart?.(this.currentWordIndex);

    if (this._isMuted) {
      // When muted, use timer-based advancement
      await this.playMutedWord();
    } else {
      // Play audio
      await this.playAudioWord();
    }
  }

  /**
   * Play word with audio
   */
  private async playAudioWord(attempt: number = 0): Promise<void> {
    const index = this.currentWordIndex;

    // Use preloaded audio if available
    let audioData = this.preloadedAudio;
    if (audioData && this.preloadingIndex === index) {
      this.preloadedAudio = null;
      this.preloadingIndex = -1;
    } else {
      // Fetch if not preloaded
      audioData = await fetchWordAudio(this.words[index], this.lang);
    }

    if (this.disposed || !this._isPlaying || this._isPaused) {
      return;
    }

    if (!audioData) {
      // Fallback to muted timing if audio fails
      await this.playMutedWord();
      return;
    }

    // Clean up previous
    this.cleanupCurrentAudio();

    this.currentAudio = audioData.audio;
    this.currentUrl = audioData.url;

    // Preload next word while this one plays
    if (index + 1 < this.words.length) {
      this.preloadWord(index + 1);
    }

    // Play and wait for end, with a start watchdog and per-word retry.
    return new Promise<void>((resolve) => {
      const audio = this.currentAudio;
      if (!audio) {
        resolve();
        return;
      }

      const wordText = this.words[index] || '';
      let finished = false;
      let started = false;

      const cleanupListeners = () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('playing', handlePlaying);
        if (startTimeoutId != null) {
          window.clearTimeout(startTimeoutId);
        }
      };

      const handleFinishedAdvance = () => {
        if (finished) return;
        finished = true;
        cleanupListeners();

        this.callbacks.onWordEnd?.(index);
        this.cleanupCurrentAudio();
        
        if (!this._isPlaying || this._isPaused || this.disposed) {
          resolve();
          return;
        }

        this.currentWordIndex++;
        this.playCurrentWord().then(resolve);
      };

      const retryOrFallback = () => {
        if (finished) return;
        finished = true;
        cleanupListeners();

        // If we've not exceeded max attempts, retry this word's audio
        if (!this.disposed && this._isPlaying && !this._isPaused && !this._isMuted && attempt < MAX_PLAY_ATTEMPTS_PER_WORD) {
          console.warn('Retrying TTS audio for word', { word: wordText, index, attempt: attempt + 1 });
          this.cleanupCurrentAudio();
          this.playAudioWord(attempt + 1).then(resolve);
        } else {
          console.warn('Falling back to muted timing for word after failed audio attempts', { word: wordText, index, attempts: attempt });
          // Fallback: advance this word using muted timing so we don't get stuck
          this.playMutedWord().then(resolve);
        }
      };

      const handleEnded = () => {
        handleFinishedAdvance();
      };

      const handleError = () => {
        console.error('TTS word playback error');
        retryOrFallback();
      };

      const handlePlaying = () => {
        started = true;
        if (startTimeoutId != null) {
          window.clearTimeout(startTimeoutId);
        }
      };

      const startTimeoutId = window.setTimeout(() => {
        // If playback never entered the playing state, treat this attempt as failed
        if (!started && !finished && !this._isPaused && this._isPlaying && !this.disposed) {
          console.warn('TTS word audio did not start playing in time, retrying', { word: wordText, index, attempt });
          retryOrFallback();
        }
      }, WORD_PLAY_START_TIMEOUT_MS);

      audio.addEventListener('ended', handleEnded, { once: true });
      audio.addEventListener('error', handleError, { once: true });
      audio.addEventListener('playing', handlePlaying, { once: true });

      audio.play().then(() => {
        // In some browsers, a fulfilled play() promise implies start; guard anyway via 'playing'.
        if (!started && !finished) {
          handlePlaying();
        }
      }).catch((err) => {
        console.error('TTS play error', err);
        retryOrFallback();
      });
    });
  }

  /**
   * Play word with timer (muted mode)
   */
  private playMutedWord(): Promise<void> {
    return new Promise<void>((resolve) => {
      const index = this.currentWordIndex;
      const word = this.words[index] || '';
      
      // Calculate duration based on word complexity
      const duration = this.calculateWordDuration(word);

      this.mutedTimer = window.setTimeout(() => {
        this.mutedTimer = null;
        this.callbacks.onWordEnd?.(index);
        
        if (!this._isPlaying || this._isPaused || this.disposed) {
          resolve();
          return;
        }

        this.currentWordIndex++;
        this.playCurrentWord().then(resolve);
      }, duration);
    });
  }

  /**
   * Calculate word duration based on complexity (for muted mode)
   */
  private calculateWordDuration(word: string): number {
    const len = [...word].length;
    const base = DEFAULT_WORD_DURATION_MS;
    
    // Add time for longer words
    const lengthBonus = Math.min(len * 40, 400);
    
    // Add time for diacritics/complex characters
    const complexChars = (word.match(/[ँंःऽ़ा-ूृॄॅॆे-ॉॊो-्।॥]/g) || []).length;
    const complexBonus = Math.min(complexChars * 30, 200);
    
    return base + lengthBonus + complexBonus;
  }

  /**
   * Pause playback
   */
  pause(): void {
    this._isPaused = true;
    
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    
    if (this.mutedTimer) {
      clearTimeout(this.mutedTimer);
      this.mutedTimer = null;
    }
  }

  /**
   * Resume from pause
   */
  resume(): void {
    if (!this._isPaused) return;
    this._isPaused = false;

    if (this._isMuted || !this.currentAudio) {
      // Continue from current word
      this.playCurrentWord();
    } else {
      // Resume current audio
      this.currentAudio.play().catch(() => {
        // If resume fails, move to next word
        this.currentWordIndex++;
        this.playCurrentWord();
      });
    }
  }

  /**
   * Toggle play/pause
   */
  toggle(): void {
    if (this._isPaused) {
      this.resume();
    } else if (this._isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Stop playback and reset
   */
  stop(): void {
    this._isPlaying = false;
    this._isPaused = false;
    this.currentWordIndex = 0;
    
    this.cleanupCurrentAudio();
    
    if (this.mutedTimer) {
      clearTimeout(this.mutedTimer);
      this.mutedTimer = null;
    }
    
    if (this.preloadedAudio) {
      // Only revoke if this URL is not part of the shared cache
      if (!isUrlInWordCache(this.preloadedAudio.url)) {
        URL.revokeObjectURL(this.preloadedAudio.url);
      }
      this.preloadedAudio = null;
    }
    this.preloadingIndex = -1;
  }

  /**
   * Clean up current audio resources
   */
  private cleanupCurrentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (this.currentUrl) {
      // Only revoke if this URL is not part of the shared cache
      if (!isUrlInWordCache(this.currentUrl)) {
        URL.revokeObjectURL(this.currentUrl);
      }
      this.currentUrl = null;
    }
  }

  /**
   * Set muted state
   */
  setMuted(muted: boolean): void {
    const wasMuted = this._isMuted;
    this._isMuted = muted;

    if (!wasMuted && muted) {
      // Switching to muted: stop audio, continue with timer
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.cleanupCurrentAudio();
      }
      if (this._isPlaying && !this._isPaused) {
        this.playCurrentWord();
      }
    } else if (wasMuted && !muted) {
      // Switching to unmuted: preload current word
      if (this._isPlaying && !this._isPaused) {
        if (this.mutedTimer) {
          clearTimeout(this.mutedTimer);
          this.mutedTimer = null;
        }
        this.preloadWord(this.currentWordIndex);
        this.playCurrentWord();
      }
    }
  }

  /**
   * Get muted state
   */
  isMuted(): boolean {
    return this._isMuted;
  }

  /**
   * Toggle muted state
   */
  toggleMute(): boolean {
    this.setMuted(!this._isMuted);
    return this._isMuted;
  }

  /**
   * Check if currently playing
   */
  isPlaying(): boolean {
    return this._isPlaying && !this._isPaused;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this._isPaused;
  }

  /**
   * Get current word index
   */
  getCurrentWordIndex(): number {
    return this.currentWordIndex;
  }

  /**
   * Seek to specific word
   */
  seekWord(index: number): void {
    if (index < 0 || index >= this.words.length) return;
    
    const wasPlaying = this._isPlaying && !this._isPaused;
    this.stop();
    this.currentWordIndex = index;
    
    if (!this._isMuted) {
      this.preloadWord(index);
    }
    
    if (wasPlaying) {
      this._isPlaying = true;
      this.playCurrentWord();
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

/**
 * LineTTSPlayer manages line-level TTS playback.
 * Simpler than WordTTSPlayer - just plays entire line audio.
 */
export class LineTTSPlayer {
  private currentAudio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private callbacks: LineTTSCallbacks = {};
  private disposed: boolean = false;
  private _isPlaying: boolean = false;
  private audioUnlocked: boolean = false;

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
      const silent = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4T/hv+EAAAAAAAAAAAAAAAAAAAAAP/7kGQAD/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kGQAD/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==');
      silent.play().catch(() => {});
      this.audioUnlocked = true;
    } catch {}
  }

  /**
   * Play audio for entire line text
   */
  async playLine(text: string, lang: string): Promise<void> {
    // Unlock audio on first play (Safari requirement)
    this.unlockAudio();
    
    // Stop any current playback
    this.cleanup();

    if (!TTS_ENABLED || !text.trim()) {
      return;
    }

    this.callbacks.onStart?.();

    try {
      console.log('LineTTS: playLine start', { lang, length: text.length });
      // Fetch line audio
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 10000);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), granularity: 'line', lang }),
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      if (!res.ok) {
        console.error('LineTTS: TTS request failed', res.status, res.statusText);
        throw new Error(`TTS request failed: ${res.status}`);
      }

      const contentType = res.headers.get('Content-Type');
      console.log('LineTTS: response OK', { status: res.status, contentType });

      const blob = await res.blob();
      console.log('LineTTS: got blob', { size: blob.size });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      // Ensure sane defaults
      audio.volume = 1;
      audio.muted = false;
      audio.playbackRate = 1;

      // Expose for manual debugging in dev tools
      try {
        if (typeof window !== 'undefined' && (import.meta as any)?.env?.DEV) {
          (window as any).__stotraLastLineTTS = audio;
        }
      } catch {
        // ignore
      }

      if (this.disposed) {
        console.warn('LineTTS: disposed during fetch, dropping audio');
        return;
      }

      console.log('LineTTS: about to set currentAudio and start playback');
      this._isPlaying = true;
      this.currentAudio = audio;
      this.currentUrl = url;

      // Play and wait for end
      console.log('LineTTS: entering playback promise');
      await new Promise<void>((resolve, reject) => {
        console.log('LineTTS: in playback promise', { hasAudio: !!this.currentAudio, url: this.currentUrl });
        if (!this.currentAudio) {
          console.warn('LineTTS: currentAudio missing at playback time');
          resolve();
          return;
        }

        console.log('LineTTS: starting playback for line', { lang, length: text.length, url: this.currentUrl });

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

        this.currentAudio.addEventListener('play', () => {
          console.log('LineTTS: play event');
        });

        this.currentAudio.addEventListener('playing', () => {
          console.log('LineTTS: playing event');
        });

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
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (this.currentUrl) {
      // Let the browser reclaim this object URL naturally. Revoking too
      // aggressively can cause net::ERR_FILE_NOT_FOUND races in some
      // browsers when the media element is still resolving the blob.
      this.currentUrl = null;
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
