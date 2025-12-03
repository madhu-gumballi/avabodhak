import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Line, Lang } from '../data/types';
import { splitTokens } from '../lib/tokenize';
import type { WordTTSPlayer } from '../lib/tts';
import { prefetchWordAudios } from '../lib/tts';

export interface FlowState {
  playing: boolean;
  lineIndex: number;
  wordIndex: number;
  muted: boolean;
}

export interface UseWordFlow {
  state: FlowState;
  tokens: string[]; // tokens for the active line and active language
  rows: [string | undefined, string | undefined, string | undefined]; // [prev, current, next]
  start: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void; // next word (may advance line)
  prev: () => void; // prev word (may go to previous line)
  seekWord: (i: number) => void;
  restartLine: () => void;
  seekLine: (lineIndex: number) => void;
  totalLines: number;
  restart: () => void; // pause + reset current line to start
  setHold: (v: boolean) => void; // prevent auto-advancement without flipping playing state
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
}

// tokenization moved to lib/tokenize for shared usage

export function useWordFlow(lines: Line[], lang: Lang, ttsPlayer?: WordTTSPlayer): UseWordFlow {
  const [playing, setPlaying] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [muted, setMutedState] = useState(false);
  const [hold, setHoldState] = useState<boolean>(false);
  
  // Refs for callbacks to avoid stale closures
  const lineIndexRef = useRef(lineIndex);
  const linesRef = useRef(lines);
  lineIndexRef.current = lineIndex;
  linesRef.current = lines;

  const line = lines[lineIndex] || ({} as Line);
  const lineText = (line as any)?.[lang] || '';
  const tokens = useMemo(() => splitTokens(lineText, lang), [lineText, lang]);
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  // Prefetch word audio for a window of lines around the current line
  // to avoid stalls when we encounter long/complex words.
  useEffect(() => {
    if (!ttsPlayer) return;

    const windowRadius = 2; // lines before/after
    const startLine = Math.max(0, lineIndex - windowRadius);
    const endLine = Math.min(lines.length - 1, lineIndex + windowRadius);

    const wordsToPrefetch: string[] = [];

    for (let i = startLine; i <= endLine; i++) {
      const l = lines[i] as any;
      const text = (l?.[lang] as string | undefined) || '';
      if (!text) continue;
      const lineTokens = splitTokens(text, lang);
      for (const tok of lineTokens) {
        wordsToPrefetch.push(tok);
      }
    }

    if (wordsToPrefetch.length) {
      prefetchWordAudios(wordsToPrefetch, lang);
    }
  }, [ttsPlayer, lineIndex, lines, lang]);

  // Set up TTS callbacks when player is available
  useEffect(() => {
    if (!ttsPlayer) return;

    ttsPlayer.setCallbacks({
      onWordStart: (index: number) => {
        setWordIndex(index);
      },
      onWordEnd: (_index: number) => {
        // Word ended, TTS player handles advancement internally
      },
      onLineEnd: () => {
        // Line finished, advance to next line
        const currentLineIndex = lineIndexRef.current;
        const totalLines = linesRef.current.length;
        
        if (currentLineIndex >= totalLines - 1) {
          // End of text
          setPlaying(false);
        } else {
          // Move to next line
          setLineIndex(currentLineIndex + 1);
          setWordIndex(0);
        }
      },
      onError: (error: Error) => {
        console.error('TTS error:', error);
      },
    });

    return () => {
      ttsPlayer.setCallbacks({});
    };
  }, [ttsPlayer]);

  // Load words into TTS player when line changes
  useEffect(() => {
    if (!ttsPlayer) return;
    
    void ttsPlayer.loadLine(tokens, lang).then(() => {
      // If we're playing, start the new line
      if (playing) {
        ttsPlayer.play();
      }
    });
  }, [tokens, lang, ttsPlayer, lineIndex]);

  // Sync muted state with TTS player
  useEffect(() => {
    if (ttsPlayer) {
      ttsPlayer.setMuted(muted);
    }
  }, [muted, ttsPlayer]);

  const rows: [string | undefined, string | undefined, string | undefined] = useMemo(() => {
    const prev = (lines[lineIndex - 1] as any)?.[lang] as string | undefined;
    const curr = (lines[lineIndex] as any)?.[lang] as string | undefined;
    const next = (lines[lineIndex + 1] as any)?.[lang] as string | undefined;
    return [prev, curr, next];
  }, [lines, lineIndex, lang]);

  const start = useCallback(() => {
    setPlaying(true);
    ttsPlayer?.play();
  }, [ttsPlayer]);

  const pause = useCallback(() => {
    setPlaying(false);
    ttsPlayer?.pause();
  }, [ttsPlayer]);

  const toggle = useCallback(() => {
    setPlaying(p => {
      if (!p) {
        ttsPlayer?.play();
      } else {
        ttsPlayer?.pause();
      }
      return !p;
    });
  }, [ttsPlayer]);

  const next = useCallback(() => {
    const currentTokens = tokensRef.current;
    const last = Math.max(0, currentTokens.length - 1);
    
    if (wordIndex >= last) {
      // Move to next line
      const nextLine = Math.min(lineIndex + 1, lines.length - 1);
      if (nextLine !== lineIndex) {
        setLineIndex(nextLine);
        setWordIndex(0);
      }
    } else {
      setWordIndex(i => Math.min(i + 1, last));
      ttsPlayer?.seekWord(wordIndex + 1);
    }
  }, [wordIndex, lineIndex, lines.length, ttsPlayer]);

  const prev = useCallback(() => {
    if (wordIndex > 0) {
      setWordIndex(i => i - 1);
      ttsPlayer?.seekWord(wordIndex - 1);
    } else if (lineIndex > 0) {
      setLineIndex(L => Math.max(0, L - 1));
      setWordIndex(0);
    }
  }, [wordIndex, lineIndex, ttsPlayer]);

  const seekWord = useCallback((i: number) => {
    const last = Math.max(0, tokens.length - 1);
    const clamped = Math.max(0, Math.min(i, last));
    setWordIndex(clamped);
    ttsPlayer?.seekWord(clamped);
  }, [tokens.length, ttsPlayer]);

  const restartLine = useCallback(() => {
    setWordIndex(0);
    ttsPlayer?.seekWord(0);
  }, [ttsPlayer]);

  const restart = useCallback(() => {
    setPlaying(false);
    setWordIndex(0);
    ttsPlayer?.stop();
  }, [ttsPlayer]);

  const setHold = useCallback((v: boolean) => {
    setHoldState(v);
    if (v) {
      ttsPlayer?.pause();
    }
  }, [ttsPlayer]);

  const totalLines = lines.length;

  const seekLine = useCallback((L: number) => {
    const clamped = Math.max(0, Math.min(L, Math.max(0, lines.length - 1)));
    setLineIndex(clamped);
    setWordIndex(0);
    ttsPlayer?.stop();
  }, [lines.length, ttsPlayer]);

  const toggleMute = useCallback(() => {
    setMutedState(m => !m);
  }, []);

  const setMuted = useCallback((m: boolean) => {
    setMutedState(m);
  }, []);

  return {
    state: { playing, lineIndex, wordIndex, muted },
    tokens,
    rows,
    start,
    pause,
    toggle,
    next,
    prev,
    seekWord,
    restartLine,
    seekLine,
    totalLines,
    restart,
    setHold,
    toggleMute,
    setMuted,
  };
}
