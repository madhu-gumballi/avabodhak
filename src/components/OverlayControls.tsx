import { useEffect, useRef } from 'react';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import StopIcon from '@mui/icons-material/Stop';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface Props {
  visible: boolean;
  onVisibleChange: (v: boolean) => void;
  ttsPlaying: boolean;
  onTTSToggle: () => void;
  onPrevLine: () => void;
  onNextLine: () => void;
  onNudged?: (dir: 'prev' | 'next') => void;
  indicator?: { dir: 'prev' | 'next'; count: number; show: boolean };
  atEnd?: boolean;
  onReplay?: () => void;
  navLineNumber?: number | null;
  totalLines?: number;
  ttsSupported?: boolean;
}

export function OverlayControls({ visible, onVisibleChange, ttsPlaying, onTTSToggle, onPrevLine, onNextLine, onNudged, indicator, atEnd, onReplay, navLineNumber, totalLines, ttsSupported }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ t: number; x: number } | null>(null);
  const clickTimerRef = useRef<number | null>(null);
  const centerBtnRef = useRef<HTMLButtonElement>(null);
  const lastTouchTimeRef = useRef<number>(0);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const dblWindow = 300;
    const tapDist = 64; // px within which taps count as same spot

    const getRelX = (clientX: number) => {
      const rect = el.getBoundingClientRect();
      return (clientX - rect.left) / Math.max(1, rect.width);
    };

    const handleSingleTap = (xRatio: number) => {
      const left = xRatio < 0.33;
      const right = xRatio > 0.67;
      const center = !left && !right;
      // Single taps anywhere merely reveal the overlay. TTS playback is
      // triggered explicitly via the center button or keyboard (Space).
      if (center) {
        onVisibleChange(true);
        return;
      }
      if (left || right) {
        onVisibleChange(true);
      }
    };

    const handleDoubleTap = (xRatio: number) => {
      const left = xRatio < 0.33;
      const right = xRatio > 0.67;
      if (left) {
        onPrevLine();
        onNudged && onNudged('prev');
        onVisibleChange(true);
      } else if (right) {
        onNextLine();
        onNudged && onNudged('next');
        onVisibleChange(true);
      }
    };

    const onClick = (e: MouseEvent) => {
      // Prevent click events that fire after touch events (mobile ghost clicks)
      if (Date.now() - lastTouchTimeRef.current < 500) {
        return;
      }
      const xr = getRelX(e.clientX);
      const left = xr < 0.33;
      const right = xr > 0.67;
      const center = !left && !right;
      if (center) {
        handleSingleTap(xr);
        return;
      }
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = window.setTimeout(() => {
        handleSingleTap(xr);
        clickTimerRef.current = null;
      }, dblWindow) as unknown as number;
    };

    const onDblClick = (e: MouseEvent) => {
      const x = getRelX(e.clientX);
      if (clickTimerRef.current) { window.clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
      handleDoubleTap(x);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 0) return;
      const touch = e.changedTouches[0];
      const now = Date.now();
      lastTouchTimeRef.current = now; // Record touch time to prevent ghost clicks
      const prev = lastTapRef.current;
      const x = touch.clientX;
      const xr = getRelX(x);
      const left = xr < 0.33;
      const right = xr > 0.67;
      const center = !left && !right;
      if (center) {
        lastTapRef.current = null; // center never double-taps
        handleSingleTap(xr);
        return;
      }
      if (prev && now - prev.t < dblWindow && Math.abs(prev.x - x) < tapDist) {
        lastTapRef.current = null;
        handleDoubleTap(xr);
      } else {
        lastTapRef.current = { t: now, x };
        if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
        clickTimerRef.current = window.setTimeout(() => {
          handleSingleTap(xr);
          clickTimerRef.current = null;
        }, dblWindow) as unknown as number;
      }
    };

    el.addEventListener('click', onClick);
    el.addEventListener('dblclick', onDblClick);
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('dblclick', onDblClick);
      el.removeEventListener('touchend', onTouchEnd);
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    };
  }, [onTTSToggle, onPrevLine, onNextLine, onVisibleChange, ttsSupported]);

  // When overlay becomes visible, focus the center TTS button
  useEffect(() => {
    if (visible && ttsSupported) {
      setTimeout(() => centerBtnRef.current?.focus(), 0);
    }
  }, [visible, ttsSupported]);

  return (
    <div ref={rootRef} className="absolute inset-0 z-20 select-none">
      <div className={`w-full h-full`}>
        {visible && (
          <div className="absolute inset-0 flex items-end justify-center pb-12">
            <div className="absolute inset-0 bg-black/10" />
            <div className="flex items-center justify-between w-full px-3">
              <button aria-label="Prev Line" onClick={(e) => { e.stopPropagation(); onPrevLine(); onNudged && onNudged('prev'); }} className="rounded-full bg-slate-900/50 border border-slate-700/60 text-slate-200 p-3">
                <ChevronLeftIcon fontSize="large" />
              </button>
              {ttsSupported && (
                <button ref={centerBtnRef} aria-label={ttsPlaying ? 'Stop TTS' : 'Play TTS'} onClick={(e) => { e.stopPropagation(); onTTSToggle(); }} className={`rounded-full border p-4 ${ttsPlaying ? 'bg-amber-300 text-black border-amber-200' : 'bg-slate-900/50 text-slate-200 border-slate-700/70'}`}>
                  {ttsPlaying ? <StopIcon fontSize="large" /> : <RecordVoiceOverIcon fontSize="large" style={{ opacity: 0.7 }} />}
                </button>
              )}
              {!ttsSupported && (
                <div className="rounded-full border p-4 bg-slate-900/30 text-slate-500 border-slate-700/40 opacity-50">
                  <RecordVoiceOverIcon fontSize="large" />
                </div>
              )}
              <button aria-label="Next Line" onClick={(e) => { e.stopPropagation(); onNextLine(); onNudged && onNudged('next'); }} className="rounded-full bg-slate-900/50 border border-slate-700/60 text-slate-200 p-3">
                <ChevronRightIcon fontSize="large" />
              </button>
            </div>
            {atEnd && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                <button onClick={(e) => { e.stopPropagation(); onReplay && onReplay(); }} className="px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/70 text-slate-100 shadow">
                  Replay from start
                </button>
              </div>
            )}
          </div>
        )}
        {indicator?.show && indicator.dir === 'prev' && (
          <div className="absolute z-30 px-3 py-1.5 rounded-full border border-sky-500/40 bg-slate-900/80 text-sky-300 text-2xl font-black shadow-[0_0_18px_rgba(14,165,233,0.4)]"
               style={{ left: 56, top: '50%', transform: 'translateY(-50%)', transition: 'transform 120ms' }}>
            -{indicator.count}
          </div>
        )}
        {indicator?.show && indicator.dir === 'next' && (
          <div className="absolute z-30 px-3 py-1.5 rounded-full border border-emerald-400/40 bg-slate-900/80 text-emerald-300 text-2xl font-black shadow-[0_0_18px_rgba(52,211,153,0.4)]"
               style={{ right: 56, top: '50%', transform: 'translateY(-50%)', transition: 'transform 120ms' }}>
            +{indicator.count}
          </div>
        )}
      </div>
    </div>
  );
}
