import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, TextField, Button } from '@mui/material';
import type { Lang, Line } from '../data/types';
import { basicSplit, chunkOffsetsByWord } from '../lib/tokenize';

interface Props {
  open: boolean;
  onClose: () => void;
  lines: Line[];
  lang: Lang;
  onJump: (lineIndex: number, wordIndex?: number) => void;
  onResults?: (idxs: number[]) => void;
}

// Map folded (ASCII) IAST positions to word indices in original IAST text
function buildFoldedIndex(textIAST: string) {
  const isWord = (ch: string) => /\p{L}|\p{M}|\p{N}/u.test(ch);
  let inWord = false;
  let wordIndex = -1;
  const map: number[] = [];
  let folded = '';
  for (const ch of textIAST) {
    const foldedCh = foldIAST(ch);
    const w = isWord(ch);
    if (w && !inWord) { inWord = true; wordIndex += 1; }
    if (!w && inWord) { inWord = false; }
    folded += foldedCh;
    for (let k = 0; k < foldedCh.length; k++) map.push(Math.max(0, wordIndex));
  }
  return { folded, mapToWord: map };
}

// Fold IAST diacritics to ASCII so users can type plain English (vishnu -> viṣṇu)
function foldIAST(input: string): string {
  const map: Record<string, string> = {
    ā: 'a', ī: 'i', ū: 'u', ṛ: 'r', ṝ: 'r', ḷ: 'l', ḹ: 'l',
    ñ: 'n', ṅ: 'n', ṇ: 'n', ṭ: 't', ḍ: 'd', ś: 's', ṣ: 's', ḥ: 'h', ṃ: 'm',ṁ: 'm', ŋ: 'n',
    Ā: 'A', Ī: 'I', Ū: 'U', Ṛ: 'R', Ṝ: 'R', Ḷ: 'L', Ḹ: 'L',
    Ñ: 'N', Ṅ: 'N', Ṇ: 'N', Ṭ: 'T', Ḍ: 'D', Ś: 'S', Ṣ: 'S', Ḥ: 'H', Ṃ: 'M',
  };
  return input.replace(/[ĀĪŪṚṜḶḸÑṄṆṬḌŚṢḤṂāīūṛṝḷḹñṅṇṭḍśṣḥṃṁŋ]/g, (ch) => map[ch] || ch)
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function useSearchIndex(lines: Line[]) {
  return useMemo(() => {
    return lines.map((ln) => ({
      iast: (ln as any).iast || '',
      deva: (ln as any).deva || '',
      knda: (ln as any).knda || '',
      tel: (ln as any).tel || '',
      tam: (ln as any).tam || '',
      guj: (ln as any).guj || '',
      pan: (ln as any).pan || '',
    }));
  }, [lines]);
}

function levenshteinWithin(a: string, b: string, max: number): number {
  const n = a.length, m = b.length;
  if (Math.abs(n - m) > max) return max + 1;
  let prev = new Array(m + 1);
  let cur = new Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    const tmp = prev; prev = cur; cur = tmp;
  }
  return prev[m];
}

function findFuzzy(text: string, query: string, maxDist: number): { pos: number; len: number } | null {
  const qlen = query.length;
  if (!qlen) return null;
  const minLen = Math.max(1, qlen - 1);
  const maxLen = Math.min(text.length, qlen + 1);
  let bestPos = -1; let bestLen = 0; let best = maxDist + 1;
  for (let L = minLen; L <= maxLen; L++) {
    for (let i = 0; i + L <= text.length; i++) {
      const d = levenshteinWithin(text.slice(i, i + L), query, maxDist);
      if (d <= maxDist && d < best) { best = d; bestPos = i; bestLen = L; }
      if (best === 0) break;
    }
    if (best === 0) break;
  }
  return bestPos >= 0 ? { pos: bestPos, len: bestLen } : null;
}

export function SearchPanel({ open, onClose, lines, lang, onJump, onResults }: Props) {
  // i18n for SearchPanel UI
  const T = useMemo(() => {
    const map: Record<Lang, Record<string, string>> = {
      iast: {
        search: 'Search',
        auto: 'Auto', lang: 'Lang', iast: 'IAST',
        placeholder: 'Search current language or type English (IAST)',
        empty: 'Type to search. Enter to jump. Esc to close. ↑/↓ to navigate.',
        line: 'Line',
      },
      deva: {
        search: 'खोजें',
        auto: 'स्वतः', lang: 'भाषा', iast: 'IAST',
        placeholder: 'वर्तमान भाषा में खोजें या अंग्रेज़ी (IAST) टाइप करें',
        empty: 'खोजने के लिए टाइप करें। जाने के लिए Enter। बंद करने के लिए Esc। ऊपर/नीचे से नेविगेट करें।',
        line: 'पंक्ति',
      },
      knda: {
        search: 'ಹುಡುಕಿ',
        auto: 'ಸ್ವಯಂ', lang: 'ಭಾಷೆ', iast: 'IAST',
        placeholder: 'ಪ್ರಸ್ತುತ ಭಾಷೆಯಲ್ಲಿ ಹುಡುಕಿ ಅಥವಾ English (IAST) 타입 ಮಾಡಿ',
        empty: 'ಹುಡುಕಲು ಟೈಪ್ ಮಾಡಿ. ಜಂಪ್ ಮಾಡಲು Enter. ಮುಚ್ಚಲು Esc. ↑/↓ ನ್ಯಾವಿಗೇಟ್.',
        line: 'ಸಾಲು',
      },
      tel: {
        search: 'వెతకండి',
        auto: 'ఆటో', lang: 'భాష', iast: 'IAST',
        placeholder: 'ప్రస్తుత భాషలో వెతకండి లేదా English (IAST) టైప్ చేయండి',
        empty: 'శోధించడానికి టైప్ చేయండి. జంప్‌కు Enter. మూసేందుకు Esc. ↑/↓ నావిగేట్ చేయండి.',
        line: 'లైన్',
      },
      tam: {
        search: 'தேடு',
        auto: 'தானியங்கு', lang: 'மொழி', iast: 'IAST',
        placeholder: 'தற்போதைய மொழியில் தேடவும் அல்லது English (IAST) தட்டச்சு செய்யவும்',
        empty: 'தேடத் தட்டச்சு செய்யவும். செல்ல Enter. மூட Esc. ↑/↓ வழிசெலுத்தவும்.',
        line: 'வரி',
      },
      guj: {
        search: 'શોધો',
        auto: 'ઓટો', lang: 'ભાષા', iast: 'IAST',
        placeholder: 'વર્તમાન ભાષામાં શોધો અથવા English (IAST) ટાઈપ કરો',
        empty: 'શોધવા માટે ટાઈપ કરો. જવા Enter. બંધ કરવા Esc. ↑/↓ નેવિગેટ કરો.',
        line: 'રેખા',
      },
      pan: {
        search: 'ਖੋਜ',
        auto: 'ਆਟੋ', lang: 'ਭਾਸ਼ਾ', iast: 'IAST',
        placeholder: 'ਮੌਜੂਦਾ ਭਾਸ਼ਾ ਵਿੱਚ ਖੋਜੋ ਜਾਂ English (IAST) ਟਾਈਪ ਕਰੋ',
        empty: 'ਖੋਜ ਲਈ ਟਾਈਪ ਕਰੋ। ਜਾਣ ਲਈ Enter। ਬੰਦ ਕਰਨ ਲਈ Esc। ↑/↓ ਨਾਲ ਨੈਵੀਗੇਟ ਕਰੋ।',
        line: 'ਲਾਈਨ',
      },
      mr: {
        search: 'शोधा',
        auto: 'ऑटो', lang: 'भाषा', iast: 'IAST',
        placeholder: 'सध्याच्या भाषेत शोधा किंवा English (IAST) टाइप करा',
        empty: 'शोधण्यासाठी टाइप करा. जाण्यासाठी Enter. बंद करण्यासाठी Esc. ↑/↓ नेव्हिगेट करा.',
        line: 'ओळ',
      },
      ben: {
        search: 'খুঁজুন',
        auto: 'অটো', lang: 'ভাষা', iast: 'IAST',
        placeholder: 'বর্তমান ভাষায় খুঁজুন অথবা English (IAST) টাইপ করুন',
        empty: 'খুঁজতে টাইপ করুন। যেতে Enter। বন্ধ করতে Esc। ↑/↓ নেভিগেট করুন।',
        line: 'লাইন',
      },
      mal: {
        search: 'തിരയുക',
        auto: 'ഓട്ടോ', lang: 'ഭാഷ', iast: 'IAST',
        placeholder: 'നിലവിലുള്ള ഭാഷയിൽ തിരയുക അല്ലെങ്കിൽ English (IAST) ടൈപ്പ് ചെയ്യുക',
        empty: 'തിരയാൻ ടൈപ്പ് ചെയ്യുക. പോകാൻ Enter. അടയ്ക്കാൻ Esc. ↑/↓ ഉപയോഗിച്ച് നാവിഗേറ്റ് ചെയ്യുക.',
        line: 'വരി',
      },
    };
    return (k: string) => (map[lang] || map.iast)[k] || k;
  }, [lang]);
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'auto' | 'iast' | 'lang'>('auto');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const entries = useSearchIndex(lines);
  const EMPTY_RESULTS = useMemo(() => [] as Array<{ index: number; snippet: string; wordIndex?: number }>, []);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, Math.max(0, results.length - 1))); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
      if (e.key === 'Enter') { e.preventDefault(); const r = results[active]; if (r) { onJump(r.index, r.wordIndex ?? 0); onClose(); } }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, active]);

  const results = useMemo(() => {
    if (!open) return EMPTY_RESULTS;
    if (!q.trim()) { return EMPTY_RESULTS; }

    const queryIsLatin = /[A-Za-z]/.test(q);
    const resolvedMode: 'iast' | 'lang' = mode === 'auto' ? (queryIsLatin ? 'iast' : 'lang') : mode;

    const hits: Array<{ index: number; snippet: string; wordIndex?: number }> = [];
    const esc = (s: string) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    const mark = (text: string, start: number, len: number) => {
      const left = text.slice(Math.max(0, start - 14), start);
      const mid = text.substr(start, len);
      const right = text.slice(start + len, Math.min(text.length, start + len + 14));
      return esc(left) + '<mark class="bg-amber-300/60 text-black px-0.5 rounded">' + esc(mid) + '</mark>' + esc(right);
    };

    entries.forEach((row, idx) => {
      const textLang = (row as any)[lang] as string || '';
      const textIAST = row.iast || '';

      if (resolvedMode === 'lang') {
        const t = textLang;
        const pos = t.indexOf(q);
        if (pos >= 0) {
          // try to compute approximate word index
          const offsets = chunkOffsetsByWord(t, lang);
          const before = t.slice(0, pos);
          const wordIndex = Math.max(0, basicSplit(before).length);
          const chunkIndex = Math.max(0, Math.min(offsets.length - 2, wordIndex));
          hits.push({ index: idx, snippet: mark(t, pos, q.length), wordIndex: offsets[chunkIndex] });
        } else {
          const fuzzy = findFuzzy(t.toLowerCase(), q.toLowerCase(), q.length >= 5 ? 2 : 1);
          if (fuzzy) {
            const { pos: p, len: L } = fuzzy;
            const offsets = chunkOffsetsByWord(t, lang);
            const before = t.slice(0, p);
            const wordIndex = Math.max(0, basicSplit(before).length);
            const chunkIndex = Math.max(0, Math.min(offsets.length - 2, wordIndex));
            hits.push({ index: idx, snippet: mark(t, p, L), wordIndex: offsets[chunkIndex] });
          }
        }
      } else {
        const { folded: foldedText, mapToWord } = buildFoldedIndex(textIAST.toLowerCase());
        const foldedQuery = foldIAST(q.toLowerCase());
        const pos = foldedText.indexOf(foldedQuery);
        if (pos >= 0) {
          // Map folded position to original IAST word index, then to script chunk index
          let wi = mapToWord[pos];
          if (typeof wi !== 'number') {
            // fallback: search backwards for nearest mapped position
            let p = pos;
            while (p >= 0 && typeof wi !== 'number') { wi = mapToWord[p--]; }
            if (typeof wi !== 'number') wi = 0;
          }
          const offsets = chunkOffsetsByWord(textLang, lang);
          const chunkIndex = Math.max(0, Math.min(offsets.length - 2, wi));
          hits.push({ index: idx, snippet: mark(textIAST, pos, q.length), wordIndex: offsets[chunkIndex] });
        } else {
          const fuzzy = findFuzzy(foldedText, foldedQuery, foldedQuery.length >= 5 ? 2 : 1);
          if (fuzzy) {
            const p = fuzzy.pos; const L = fuzzy.len;
            let wi = mapToWord[p];
            if (typeof wi !== 'number') {
              let pp = p;
              while (pp >= 0 && typeof wi !== 'number') { wi = mapToWord[pp--]; }
              if (typeof wi !== 'number') wi = 0;
            }
            const offsets = chunkOffsetsByWord(textLang, lang);
            const chunkIndex = Math.max(0, Math.min(offsets.length - 2, wi));
            hits.push({ index: idx, snippet: mark(textIAST, p, L), wordIndex: offsets[chunkIndex] });
          }
        }
      }
    });

    return hits.slice(0, 50);
  }, [open, q, entries, lang, mode, EMPTY_RESULTS]);

  // Report results to parent after render to avoid setState during render warnings
  useEffect(() => {
    if (!open) return;
    if (!q.trim()) return;
    onResults?.(results.map(h => h.index));
  }, [open, q, results, onResults]);

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{T('search')}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1, mb: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField
            inputRef={inputRef}
            value={q}
            onChange={(e) => { setActive(0); setQ(e.target.value); }}
            placeholder={T('placeholder')}
            fullWidth
            size="small"
            variant="outlined"
          />
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: { xs: 'space-between', sm: 'flex-start' } }}>
            <Button size="small" variant={mode==='auto'?'contained':'outlined'} onClick={() => setMode('auto')}>{T('auto')}</Button>
            <Button size="small" variant={mode==='lang'?'contained':'outlined'} onClick={() => setMode('lang')}>{T('lang')}</Button>
            <Button size="small" variant={mode==='iast'?'contained':'outlined'} onClick={() => setMode('iast')}>{T('iast')}</Button>
          </Box>
        </Box>
        <div className="max-h-80 overflow-auto divide-y divide-slate-800">
          {results.length === 0 ? (
            <div className="p-2 text-sm text-slate-400">{T('empty')}</div>
          ) : results.map((r, i) => (
            <button
              key={`r-${r.index}`}
              className={`w-full text-left p-3 hover:bg-slate-800 ${i===active?'bg-slate-800':''}`}
              onClick={() => { onJump(r.index, r.wordIndex ?? 0); onClose(); }}
            >
              <div className="text-[10px] text-slate-400 mb-1">{T('line')} {r.index + 1}</div>
              <div className="text-slate-200 text-sm" dangerouslySetInnerHTML={{ __html: r.snippet }} />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
