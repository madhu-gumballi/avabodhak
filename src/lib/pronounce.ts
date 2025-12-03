export const DIACRITIC_INFO: Record<string, { name: string; devanagari?: string; hint: string }> = {
  'ā': { name: 'long a', devanagari: 'आ', hint: 'aa as in “father”' },
  'ī': { name: 'long i', devanagari: 'ई', hint: 'ii as in “machine”' },
  'ū': { name: 'long u', devanagari: 'ऊ', hint: 'uu as in “rule”' },
  'ṛ': { name: 'vocalic r', devanagari: 'ऋ', hint: 'ri (syllabic r)' },
  'ṝ': { name: 'long vocalic r', devanagari: 'ॠ', hint: 'ree (long syllabic r)' },
  'ḷ': { name: 'vocalic l', devanagari: 'ऌ', hint: 'li (syllabic l)' },
  'ḹ': { name: 'long vocalic l', devanagari: 'ॡ', hint: 'lee (long syllabic l)' },
  'ś': { name: 'palatal s', devanagari: 'श', hint: 'sh (soft, palatal)' },
  'ṣ': { name: 'retroflex s', devanagari: 'ष', hint: 'sh (retroflex)' },
  'ṅ': { name: 'velar nasal', devanagari: 'ङ', hint: 'ng as in “sing”' },
  'ñ': { name: 'palatal nasal', devanagari: 'ञ', hint: 'ny as in “canyon”' },
  'ṇ': { name: 'retroflex n', devanagari: 'ण', hint: 'n with tongue curled back' },
  'ṭ': { name: 'retroflex t', devanagari: 'ट', hint: 'hard t with tongue curled back' },
  'ḍ': { name: 'retroflex d', devanagari: 'ड', hint: 'hard d with tongue curled back' },
  'ṃ': { name: 'anusvāra', devanagari: 'ं', hint: 'nasalization (m/ng depending on following)' },
  'ḥ': { name: 'visarga', devanagari: 'ः', hint: 'breathy h after vowel' },
};

export function isIASTDiacritic(ch: string): boolean {
  return ch in DIACRITIC_INFO;
}

export function extractIASTDiacritics(text: string): string[] {
  const set = new Set<string>();
  for (const ch of Array.from(text)) {
    if (isIASTDiacritic(ch)) set.add(ch);
  }
  return Array.from(set);
}

export function simplifyIAST(input: string): string {
  let s = input;
  s = s.replace(/ā/g, 'aa').replace(/ī/g, 'ii').replace(/ū/g, 'uu');
  s = s.replace(/ṛ/g, 'ri').replace(/ṝ/g, 'ree');
  s = s.replace(/ḷ/g, 'li').replace(/ḹ/g, 'lee');
  s = s.replace(/ś/g, 'sh').replace(/ṣ/g, 'sh');
  s = s.replace(/ṅ/g, 'ng').replace(/ñ/g, 'ny').replace(/ṇ/g, 'n');
  s = s.replace(/ṭ/g, 't').replace(/ḍ/g, 'd');
  s = s.replace(/ḥ/g, 'h').replace(/ṃ/g, 'm');
  return s;
}

const LONG_VOWEL_RE = /[āīūṝḹ]/u;
const RETROFLEX_RE = /[ṭḍṇṛṣ]/u;
const ASPIRATE_CLUSTER_RE = /(kh|gh|ch|jh|ṭh|ḍh|th|dh|ph|bh)/u;

export interface IASTWordFeatures {
  hasLongVowel: boolean;
  hasRetroflex: boolean;
  hasAspirate: boolean;
}

export function classifyIASTWord(word: string): IASTWordFeatures {
  const w = word || '';
  return {
    hasLongVowel: LONG_VOWEL_RE.test(w),
    hasRetroflex: RETROFLEX_RE.test(w),
    hasAspirate: ASPIRATE_CLUSTER_RE.test(w),
  };
}
