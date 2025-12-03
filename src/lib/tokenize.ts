import type { Lang } from '../data/types';

// Basic word split from whitespace/punctuation
export function basicSplit(s: string): string[] {
  return s
    .replace(/\u0964|\u0965/gu, ' ') // danda
    .replace(/[|।.,;:!?\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

export const localeByLang: Record<Lang, string> = {
  deva: 'hi',
  knda: 'kn',
  iast: 'en',
  tel: 'te',
  tam: 'ta',
  guj: 'gu',
  pan: 'pa',
  mr: 'mr',
  ben: 'bn',
  mal: 'ml',
};

export const vowelMarkReByLang: Record<Lang, RegExp> = {
  deva: /[\u093e\u093f\u0940\u0941\u0942\u0947\u0948\u094b\u094c\u0943\u0944\u0962\u0963]/u,
  knda: /[\u0cbe\u0cbf\u0cc0\u0cc1\u0cc2\u0cc6\u0cc7\u0cc8\u0cca\u0ccb\u0ccc\u0cc3\u0cc4\u0ce2\u0ce3]/u,
  tel: /[\u0c3e\u0c3f\u0c40\u0c41\u0c42\u0c46\u0c47\u0c48\u0c4a\u0c4b\u0c4c\u0c43\u0c44\u0c62\u0c63]/u,
  tam: /[\u0bbe\u0bbf\u0bc0\u0bc1\u0bc2\u0bc6\u0bc7\u0bc8\u0bca\u0bcb\u0bcc]/u,
  guj: /[\u0abe\u0abf\u0ac0\u0ac1\u0ac2\u0ac7\u0ac8\u0acb\u0acc\u0ac3\u0ac4\u0ae2\u0ae3]/u,
  pan: /[\u0A3E\u0A3F\u0A40\u0A41\u0A42\u0A47\u0A48\u0A4B\u0A4C]/u,
  iast: /[aeiouāīūṛṝḷḹAEIOU]/u,
  mr: /[\u093e\u093f\u0940\u0941\u0942\u0947\u0948\u094b\u094c\u0943\u0944\u0962\u0963]/u, // Devanagari
  ben: /[\u09BE\u09BF\u09C0\u09C1\u09C2\u09C7\u09C8\u09CB\u09CC\u09C3\u09C4\u09E2\u09E3]/u,
  mal: /[\u0D3E\u0D3F\u0D40\u0D41\u0D42\u0D46\u0D47\u0D48\u0D4A\u0D4B\u0D4C]/u,
};

// Tunable per-script chunk thresholds (graphemes)
export const chunkRules: Record<Lang, { min: number; max: number; longWordMin: number }> = {
  // Devanagari compounds are dense; keep chunks ~3–6
  deva: { min: 3, max: 6, longWordMin: 10 },
  // Kannada clusters tend to be visually wider; 3–5 reads well
  knda: { min: 3, max: 5, longWordMin: 10 },
  // IAST (Latin) can tolerate slightly longer chunks
  iast: { min: 3, max: 7, longWordMin: 12 },
  // Telugu similar to Kannada in visual width
  tel: { min: 3, max: 6, longWordMin: 10 },
  // Tamil often has shorter akshara; allow smaller chunks
  tam: { min: 2, max: 5, longWordMin: 10 },
  // Gujarati close to Devanagari
  guj: { min: 3, max: 6, longWordMin: 10 },
  // Punjabi (Gurmukhi) clusters and matras similar visual density
  pan: { min: 3, max: 6, longWordMin: 10 },
  // Marathi (Devanagari)
  mr: { min: 3, max: 6, longWordMin: 10 },
  // Bengali
  ben: { min: 3, max: 6, longWordMin: 10 },
  // Malayalam
  mal: { min: 3, max: 6, longWordMin: 10 },
};

export function segmentGraphemes(word: string, lang: Lang): string[] {
  try {
    // @ts-ignore
    const seg = typeof Intl !== 'undefined' && (Intl as any).Segmenter ? new (Intl as any).Segmenter(localeByLang[lang] || 'en', { granularity: 'grapheme' }) : null;
    if (!seg) return Array.from(word);
    const parts: string[] = [];
    // @ts-ignore
    for (const item of seg.segment(word)) parts.push(item.segment);
    return parts.length ? parts : Array.from(word);
  } catch {
    return Array.from(word);
  }
}

export function segmentLongWord(word: string, lang: Lang): string[] {
  const units = segmentGraphemes(word, lang);
  const rules = chunkRules[lang] || chunkRules.iast;
  if (units.length <= rules.longWordMin) return [word];
  const re = vowelMarkReByLang[lang] || vowelMarkReByLang.iast;
  const chunks: string[] = [];
  let start = 0;
  let since = 0;
  for (let i = 0; i < units.length - 1; i++) {
    since++;
    const u = units[i];
    const hasVowel = re.test(u);
    const hard = since >= rules.max; // hard limit
    const soft = hasVowel && since >= rules.min; // prefer breaks after vowel and minimum size
    if (hard || soft) {
      chunks.push(units.slice(start, i + 1).join(''));
      start = i + 1;
      since = 0;
    }
  }
  if (start < units.length) chunks.push(units.slice(start).join(''));
  return chunks;
}

export function splitTokens(s: string, lang: Lang): string[] {
  const words = basicSplit(s);
  const out: string[] = [];
  for (const w of words) {
    const units = segmentGraphemes(w, lang);
    const rules = chunkRules[lang] || chunkRules.iast;
    if (units.length >= rules.longWordMin) {
      out.push(...segmentLongWord(w, lang));
    } else {
      out.push(w);
    }
  }
  return out;
}

// Build per-word chunk counts to allow mapping from word index to chunk index
export function chunkOffsetsByWord(s: string, lang: Lang): number[] {
  const words = basicSplit(s);
  const offsets: number[] = [0];
  let acc = 0;
  for (const w of words) {
    const parts = segmentGraphemes(w, lang);
    const rules = chunkRules[lang] || chunkRules.iast;
    const n = parts.length >= rules.longWordMin ? segmentLongWord(w, lang).length : 1;
    acc += n;
    offsets.push(acc);
  }
  return offsets; // length = words + 1; offsets[i] is chunk count up to i-1
}
