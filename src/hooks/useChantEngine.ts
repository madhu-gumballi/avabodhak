import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Phrase } from '../data/types';

interface Options {
  phrases: Phrase[];
  bpm: number; // beats per minute
  mode: 'learn' | 'flow';
}

export function useChantEngine({ phrases, bpm: bpmIn, mode }: Options) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState<'listen' | 'chant'>('listen');
  const [bpm, setBpm] = useState(bpmIn);

  useEffect(() => setBpm(bpmIn), [bpmIn]);

  const intervalMs = useMemo(() => 60000 / bpm, [bpm]);
  const timer = useRef<number | null>(null);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % phrases.length);
    setPhase((p) => (mode === 'learn' ? (p === 'listen' ? 'chant' : 'listen') : 'chant'));
    pulse();
  }, [phrases.length, mode]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + phrases.length) % phrases.length);
    setPhase('listen');
    pulse();
  }, [phrases.length]);

  const seek = useCallback((to: number) => {
    setIndex(((to % phrases.length) + phrases.length) % phrases.length);
    setPhase('listen');
  }, [phrases.length]);

  const toggle = useCallback(() => setPlaying((p) => !p), []);

  useEffect(() => {
    if (!playing) {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
      return;
    }
    timer.current = window.setInterval(() => {
      next();
    }, intervalMs) as unknown as number;
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [playing, intervalMs, next]);

  function pulse() {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(phase === 'listen' ? 20 : [10, 40, 10]);
      }
    } catch {}
  }

  return {
    index,
    playing,
    phase,
    bpm,
    setBpm,
    toggle,
    next,
    prev,
    seek,
    pulse
  };
}
