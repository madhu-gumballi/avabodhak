import { describe, it, expect } from 'vitest';
import { classifyIASTWord } from '../src/lib/pronounce';

describe('classifyIASTWord', () => {
  it('detects long vowels via macrons', () => {
    const a = classifyIASTWord('rāma');
    expect(a.hasLongVowel).toBe(true);
    expect(a.hasRetroflex).toBe(false);
    expect(a.hasAspirate).toBe(false);

    const b = classifyIASTWord('śivāya');
    expect(b.hasLongVowel).toBe(true);
  });

  it('detects retroflex consonants', () => {
    const w = classifyIASTWord('ṭaṭa');
    expect(w.hasRetroflex).toBe(true);
    expect(w.hasLongVowel).toBe(false);
  });

  it('detects aspirated stop clusters', () => {
    const kh = classifyIASTWord('kha');
    expect(kh.hasAspirate).toBe(true);

    const th = classifyIASTWord('artha');
    expect(th.hasAspirate).toBe(true);
  });

  it('returns no features for plain ASCII words', () => {
    const w = classifyIASTWord('rama');
    expect(w.hasLongVowel).toBe(false);
    expect(w.hasRetroflex).toBe(false);
    expect(w.hasAspirate).toBe(false);
  });
});
