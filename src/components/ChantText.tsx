import { useEffect, useState } from 'react';
import { Phrase } from '../data/types';

type Visible = { deva: boolean; iast: boolean; knda: boolean };
const STORE_KEY = 'langVisible';

export function ChantText({ phrase, phase }: { phrase: Phrase; phase: 'listen' | 'chant' }) {
  const [visible, setVisible] = useState<Visible>(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { deva: true, iast: true, knda: false };
  });
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(visible)); } catch {}
  }, [visible]);

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
      <div className="text-center">
        {visible.deva && (
          <div className="font-dev text-2xl leading-snug">
            {phrase.deva}
          </div>
        )}
        {visible.iast && (
          <div className="mt-2 text-slate-300 text-sm">
            {phrase.iast}
          </div>
        )}
        {visible.knda && phrase.knda && (
          <div className="mt-2 text-slate-200 text-base">
            {phrase.knda}
          </div>
        )}

        <div className="mt-3 text-xs text-sky-400 uppercase tracking-wide">
          {phase === 'listen' ? 'Listen' : 'Chant'}
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs">
          <button
            className={`px-2 py-1 rounded-full border ${visible.deva ? 'bg-sky-700 border-sky-600' : 'bg-slate-800 border-slate-700'}`}
            onClick={() => setVisible(v => ({ ...v, deva: !v.deva }))}
          >देवनागरी</button>
          <button
            className={`px-2 py-1 rounded-full border ${visible.iast ? 'bg-sky-700 border-sky-600' : 'bg-slate-800 border-slate-700'}`}
            onClick={() => setVisible(v => ({ ...v, iast: !v.iast }))}
          >IAST</button>
          <button
            className={`px-2 py-1 rounded-full border ${visible.knda ? 'bg-sky-700 border-sky-600' : 'bg-slate-800 border-slate-700'}`}
            onClick={() => setVisible(v => ({ ...v, knda: !v.knda }))}
          >ಕನ್ನಡ</button>
        </div>
      </div>
    </div>
  );
}
