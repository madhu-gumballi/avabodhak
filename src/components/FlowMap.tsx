import { useMemo, useRef } from 'react';
import type React from 'react';
import type { Lang } from '../data/types';

interface Props {
  current: number;
  total: number;
  windowSize?: number;
  onSeek: (lineIndex: number) => void;
  height?: number; // pixel height for the map
  marks?: number[]; // optional absolute line indices to indicate (e.g., search hits)
  sectionMarks?: number[]; // double-danda positions
  chapterMarks?: number[]; // chapter header positions
  lang?: Lang; // localized tooltips
}

export function FlowMap({ current, total, windowSize = 3, onSeek, height = 320, marks = [], sectionMarks = [], chapterMarks = [], lang = 'iast' }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const T = (k: string): string => {
    const m: Record<string, Record<string, string>> = {
      iast: { line: 'Line', verse_end: 'Verse end' },
      deva: { line: 'पंक्ति', verse_end: 'श्लोक समाप्त' },
      knda: { line: 'ಸಾಲು', verse_end: 'ಶ್ಲೋಕ ಅಂತ್ಯ' },
      tel: { line: 'లైన్', verse_end: 'శ్లోక ముగింపు' },
      tam: { line: 'வரி', verse_end: 'ச்லோகம் முடிவு' },
      guj: { line: 'રેખા', verse_end: 'શ્લોક સમાપ્તિ' },
      pan: { line: 'ਲਾਈਨ', verse_end: 'ਸ਼ਲੋਕ ਸਮਾਪਤੀ' },
    };
    return (m[lang] || m.iast)[k] || k;
  };
  const { topPct, heightPct } = useMemo(() => {
    const safeTotal = Math.max(1, total);
    const top = (current / safeTotal) * 100;
    const h = (windowSize / safeTotal) * 100;
    return {
      topPct: Math.min(100, Math.max(0, top)),
      heightPct: Math.max(0.5, Math.min(100, h)),
    };
  }, [current, total, windowSize]);

  const onClick = (e: React.MouseEvent) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = y / rect.height;
    const index = Math.round(ratio * (Math.max(1, total) - 1));
    onSeek(index);
  };

  return (
    <div className="select-none" style={{ height }}>
      <div
        ref={trackRef}
        onClick={onClick}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, total - 1)}
        aria-valuenow={current}
        tabIndex={0}
        className="relative h-full w-12 rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden cursor-pointer"
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') onSeek(Math.max(0, current - 1));
          if (e.key === 'ArrowDown') onSeek(Math.min(total - 1, current + 1));
          if (e.key === 'Home') onSeek(0);
          if (e.key === 'End') onSeek(Math.max(0, total - 1));
        }}
      >
        <div className="absolute inset-x-0 h-full bg-gradient-to-b from-slate-800/40 via-slate-800/10 to-slate-800/40" />
        {/* search/result marks */}
        {marks.slice(0, 200).map((i, idx) => {
          const max = Math.max(1, total - 1);
          const pct = (Math.min(Math.max(i, 0), max) / Math.max(1, total)) * 100;
          return (
            <div
              key={`m-${idx}`}
              title={`${T('line')} ${i + 1}`}
              className="absolute left-0 right-0 h-[2px] bg-amber-400/70 hover:bg-amber-300/90 cursor-pointer"
              style={{ top: `${pct}%` }}
              onClick={(e) => { e.stopPropagation(); onSeek(Math.min(Math.max(i, 0), max)); }}
            />
          );
        })}
        {/* chapter header marks */}
        {chapterMarks.slice(0, 200).map((i, idx) => {
          const max = Math.max(1, total - 1);
          const pct = (Math.min(Math.max(i, 0), max) / Math.max(1, total)) * 100;
          return (
            <div
              key={`c-${idx}`}
              title={`Chapter · ${T('line')} ${i + 1}`}
              className="absolute left-[3px] right-[3px] h-[2px] bg-violet-400/80 hover:bg-violet-300/95 cursor-pointer rounded-sm"
              style={{ top: `${pct}%` }}
              onClick={(e) => { e.stopPropagation(); onSeek(Math.min(Math.max(i, 0), max)); }}
            />
          );
        })}
        {/* section (double danda) marks */}
        {sectionMarks.slice(0, 500).map((i, idx) => {
          const max = Math.max(1, total - 1);
          const pct = (Math.min(Math.max(i, 0), max) / Math.max(1, total)) * 100;
          return (
            <div
              key={`s-${idx}`}
              title={`${T('verse_end')} · ${T('line')} ${i + 1}`}
              className="absolute left-[2px] right-[2px] h-[3px] bg-sky-400/70 hover:bg-sky-300/90 cursor-pointer rounded"
              style={{ top: `${pct}%` }}
              onClick={(e) => { e.stopPropagation(); onSeek(Math.min(Math.max(i, 0), max)); }}
            />
          );
        })}
        <div
          className="absolute left-0 right-0 bg-yellow-400/80 border border-yellow-300/80 rounded"
          style={{ top: `${topPct}%`, height: `${heightPct}%` }}
        />
      </div>
      <div className="mt-2 text-center text-[10px] text-slate-400">
        {current + 1} / {total}
      </div>
    </div>
  );
}
