import { useCallback, useMemo, useRef, useState } from 'react';
import type { Line, Lang } from '../data/types';
import { splitTokens } from '../lib/tokenize';

export interface FlowState {
  lineIndex: number;
  wordIndex: number;
}

export interface UseWordFlow {
  state: FlowState;
  tokens: string[]; // tokens for the active line and active language
  rows: [string | undefined, string | undefined, string | undefined]; // [prev, current, next]
  next: () => void; // next word (may advance line)
  prev: () => void; // prev word (may go to previous line)
  seekWord: (i: number) => void;
  restartLine: () => void;
  seekLine: (lineIndex: number) => void;
  totalLines: number;
}

/**
 * useWordFlow - Manages line/word navigation state for stotra viewing
 * Used for word highlighting during manual navigation
 */
export function useWordFlow(lines: Line[], lang: Lang): UseWordFlow {
  const [lineIndex, setLineIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);

  // Refs for callbacks to avoid stale closures
  const lineIndexRef = useRef(lineIndex);
  lineIndexRef.current = lineIndex;

  const line = lines[lineIndex] || ({} as Line);
  const lineText = (line as any)?.[lang] || '';
  const tokens = useMemo(() => splitTokens(lineText, lang), [lineText, lang]);
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  const rows: [string | undefined, string | undefined, string | undefined] = useMemo(() => {
    const prev = (lines[lineIndex - 1] as any)?.[lang] as string | undefined;
    const curr = (lines[lineIndex] as any)?.[lang] as string | undefined;
    const next = (lines[lineIndex + 1] as any)?.[lang] as string | undefined;
    return [prev, curr, next];
  }, [lines, lineIndex, lang]);

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
    }
  }, [wordIndex, lineIndex, lines.length]);

  const prev = useCallback(() => {
    if (wordIndex > 0) {
      setWordIndex(i => i - 1);
    } else if (lineIndex > 0) {
      setLineIndex(L => Math.max(0, L - 1));
      setWordIndex(0);
    }
  }, [wordIndex, lineIndex]);

  const seekWord = useCallback((i: number) => {
    const last = Math.max(0, tokens.length - 1);
    const clamped = Math.max(0, Math.min(i, last));
    setWordIndex(clamped);
  }, [tokens.length]);

  const restartLine = useCallback(() => {
    setWordIndex(0);
  }, []);

  const totalLines = lines.length;

  const seekLine = useCallback((L: number) => {
    const clamped = Math.max(0, Math.min(L, Math.max(0, lines.length - 1)));
    setLineIndex(clamped);
    setWordIndex(0);
  }, [lines.length]);

  return {
    state: { lineIndex, wordIndex },
    tokens,
    rows,
    next,
    prev,
    seekWord,
    restartLine,
    seekLine,
    totalLines,
  };
}
