import { useEffect, useMemo, useState } from 'react';

export interface CaptionSeg {
  start: number; // seconds
  end: number;   // seconds
  text: string;
}

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function parseJson3(json: any): CaptionSeg[] {
  const events = Array.isArray(json?.events) ? json.events : [];
  const segs: CaptionSeg[] = [];
  for (const ev of events) {
    const tStartMs = ev?.tStartMs ?? 0;
    const dDurationMs = ev?.dDurationMs ?? 0;
    const start = tStartMs / 1000;
    const end = (tStartMs + dDurationMs) / 1000;
    const t = Array.isArray(ev?.segs) ? ev.segs.map((s: any) => s?.utf8 ?? '').join('') : '';
    const text = (t || '').replace(/\s+/g, ' ').trim();
    if (text && Number.isFinite(start) && Number.isFinite(end) && end > start) {
      segs.push({ start, end, text });
    }
  }
  // ensure sorted by time
  segs.sort((a, b) => a.start - b.start);
  return segs;
}

export function useCaptions(videoId: string, lang = 'en') {
  const [segments, setSegments] = useState<CaptionSeg[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        // Try human captions first
        const u1 = `/yt-tt?fmt=json3&v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}`;
        try {
          const j1 = await fetchJson(u1);
          const s1 = parseJson3(j1);
          if (!cancelled && s1.length) { setSegments(s1); setLoading(false); return; }
        } catch {
          // fallthrough
        }
        // Fallback to auto captions (ASR)
        const u2 = `/yt-tt?fmt=json3&v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}&kind=asr`;
        const j2 = await fetchJson(u2);
        const s2 = parseJson3(j2);
        if (!cancelled && s2.length) { setSegments(s2); setLoading(false); return; }
        throw new Error('No captions found');
      } catch (e: any) {
        if (!cancelled) { setError(e?.message || 'Failed to load captions'); setSegments([]); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [videoId, lang]);

  const indexAt = useMemo(() => {
    return (t: number) => {
      const arr = segments || [];
      let lo = 0, hi = arr.length - 1, ans = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const s = arr[mid];
        if (t < s.start) { hi = mid - 1; }
        else if (t > s.end) { lo = mid + 1; }
        else { ans = mid; break; }
      }
      return ans;
    };
  }, [segments]);

  return { segments, loading, error, indexAt };
}
