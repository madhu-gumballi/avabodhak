import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  alt?: string;
  className?: string;
}

// Crossfades between previous and next image. If incoming src is empty,
// retain the currently displayed image.
export function FadingImage({ src, alt = 'illustration', className = '' }: Props) {
  const [baseSrc, setBaseSrc] = useState<string>('');
  const [overlaySrc, setOverlaySrc] = useState<string>('');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const overlayRef = useRef<HTMLImageElement | null>(null);

  // If incoming src is empty, retain current base image.
  // If incoming src differs, prepare overlay and fade it in.
  useEffect(() => {
    if (!src) return;
    if (!baseSrc) {
      // First paint: set immediately to avoid blank state
      setBaseSrc(src);
      return;
    }
    if (src === baseSrc) return;
    setOverlaySrc(src);
    setOverlayVisible(false);
  }, [src, baseSrc]);

  // When overlay loads, start fade-in. On transition end, commit as base.
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const onLoaded = () => {
      requestAnimationFrame(() => setOverlayVisible(true));
      // Fallback: commit after 320ms even if transitionend doesn't fire (e.g., parent hidden)
      const t = window.setTimeout(() => {
        setBaseSrc(prev => (overlaySrc ? overlaySrc : prev));
        setOverlaySrc('');
        setOverlayVisible(false);
      }, 320);
      (el as any)._fadeTimer = t;
    };
    const onTransitionEnd = () => {
      if (overlayVisible && overlaySrc) {
        setBaseSrc(overlaySrc);
        setOverlaySrc('');
        setOverlayVisible(false);
      }
    };
    el.addEventListener('load', onLoaded);
    el.addEventListener('transitionend', onTransitionEnd);
    return () => {
      el.removeEventListener('load', onLoaded);
      el.removeEventListener('transitionend', onTransitionEnd);
      const t = (el as any)._fadeTimer as number | undefined;
      if (t) window.clearTimeout(t);
    };
  }, [overlayVisible, overlaySrc]);

  return (
    <div className={`relative ${className}`}>
      {baseSrc && (
        <img
          key={`base-${baseSrc}`}
          src={baseSrc}
          alt={alt}
          className="w-full max-h-96 md:max-h-[28rem] object-contain rounded-xl border border-slate-700"
        />
      )}
      {overlaySrc && (
        <img
          key={`overlay-${overlaySrc}`}
          ref={overlayRef}
          src={overlaySrc}
          alt={alt}
          className={`absolute inset-0 w-full h-full max-h-96 md:max-h-[28rem] object-contain rounded-xl border border-slate-700 transition-opacity duration-300 ${overlayVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'transparent' }}
        />
      )}
    </div>
  );
}
