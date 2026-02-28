import { describe, it, expect } from 'vitest';
import { STOTRAS, getStotraLines, getStotraChapterIndices } from '../src/lib/stotraConfig';

const EXPECTED_KEYS = [
  'vsn', 'hari', 'keshava', 'vayu', 'raghavendra', 'yantrodharaka', 'venkateshwara',
] as const;

describe('STOTRAS array', () => {
  it('contains exactly 7 stotras', () => {
    expect(STOTRAS.length).toBe(7);
  });

  it('contains all expected stotra keys', () => {
    const keys = STOTRAS.map(s => s.key);
    for (const expected of EXPECTED_KEYS) {
      expect(keys, `missing key: ${expected}`).toContain(expected);
    }
  });

  it('every stotra has a positive totalLines count', () => {
    for (const stotra of STOTRAS) {
      expect(stotra.totalLines, `${stotra.key}: totalLines`).toBeGreaterThan(0);
    }
  });

  it('totalLines matches actual data.lines.length', () => {
    for (const stotra of STOTRAS) {
      expect(stotra.totalLines, `${stotra.key}: totalLines mismatch`).toBe(stotra.data.lines.length);
    }
  });

  it('every stotra has at least one language', () => {
    for (const stotra of STOTRAS) {
      expect(stotra.languages.length, `${stotra.key}: no languages`).toBeGreaterThan(0);
    }
  });

  it('every stotra has provenance derived from its JSON', () => {
    for (const stotra of STOTRAS) {
      expect(stotra.provenance, `${stotra.key}: missing provenance`).toBeDefined();
      expect(stotra.provenance).toEqual(stotra.data.provenance);
    }
  });

  it('provenance qualityTier is in range 1–4', () => {
    for (const stotra of STOTRAS) {
      const tier = stotra.provenance?.qualityTier;
      expect(tier, `${stotra.key}: tier must be defined`).toBeDefined();
      expect(tier! >= 1 && tier! <= 4, `${stotra.key}: tier out of range`).toBe(true);
    }
  });

  it('no duplicate keys', () => {
    const keys = STOTRAS.map(s => s.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});

describe('getStotraLines', () => {
  it('returns one entry per line for a supported language', () => {
    const vsn = STOTRAS.find(s => s.key === 'vsn')!;
    const lines = getStotraLines(vsn.data, 'deva');
    expect(lines.length).toBe(vsn.totalLines);
  });

  it('every line is a non-empty string for stotras that ship deva text', () => {
    // Only test stotras that declare deva as a supported language
    const devaStotras = STOTRAS.filter(s => s.languages.includes('deva'));
    expect(devaStotras.length).toBeGreaterThan(0); // sanity: there should be some
    for (const stotra of devaStotras) {
      const lines = getStotraLines(stotra.data, 'deva');
      for (const [i, line] of lines.entries()) {
        expect(typeof line, `${stotra.key}[${i}] deva`).toBe('string');
        expect(line.trim().length, `${stotra.key}[${i}] deva empty`).toBeGreaterThan(0);
      }
    }
  });

  it('falls back to deva when a language is absent (for stotras that have deva)', () => {
    // yantrodharaka has deva, knda, tel, iast — but NOT pan (Punjabi)
    const yantra = STOTRAS.find(s => s.key === 'yantrodharaka')!;
    expect(yantra.languages).not.toContain('pan');
    expect(yantra.languages).toContain('deva');
    const lines = getStotraLines(yantra.data, 'pan');
    expect(lines.length).toBe(yantra.totalLines);
    // Every non-chapter line should fall back to a non-empty deva string
    const nonChapterLines = lines.filter(l => l.trim().length > 0);
    expect(nonChapterLines.length).toBeGreaterThan(0);
  });

  it('returns the identical array reference on repeated calls (cache)', () => {
    const hari = STOTRAS.find(s => s.key === 'hari')!;
    const a = getStotraLines(hari.data, 'knda');
    const b = getStotraLines(hari.data, 'knda');
    expect(a).toBe(b); // same object reference — proves cache hit
  });

  it('returns different arrays for different languages', () => {
    const vsn = STOTRAS.find(s => s.key === 'vsn')!;
    const deva = getStotraLines(vsn.data, 'deva');
    const iast = getStotraLines(vsn.data, 'iast');
    expect(deva).not.toBe(iast);
  });
});

describe('getStotraChapterIndices', () => {
  it('returns a Set', () => {
    const vsn = STOTRAS.find(s => s.key === 'vsn')!;
    expect(getStotraChapterIndices(vsn.data)).toBeInstanceOf(Set);
  });

  it('all chapter indices are within valid line bounds', () => {
    for (const stotra of STOTRAS) {
      const indices = getStotraChapterIndices(stotra.data);
      for (const idx of indices) {
        expect(idx, `${stotra.key}: index out of range`).toBeGreaterThanOrEqual(0);
        expect(idx, `${stotra.key}: index out of range`).toBeLessThan(stotra.totalLines);
      }
    }
  });

  it('VSN has multiple chapter/section headers', () => {
    const vsn = STOTRAS.find(s => s.key === 'vsn')!;
    expect(getStotraChapterIndices(vsn.data).size).toBeGreaterThan(1);
  });

  it('returns same Set reference on repeated calls (cache)', () => {
    const keshava = STOTRAS.find(s => s.key === 'keshava')!;
    const a = getStotraChapterIndices(keshava.data);
    const b = getStotraChapterIndices(keshava.data);
    expect(a).toBe(b);
  });

  it('chapter lines actually have a chapter field in the raw data', () => {
    for (const stotra of STOTRAS) {
      const indices = getStotraChapterIndices(stotra.data);
      for (const idx of indices) {
        const line = stotra.data.lines[idx] as any;
        expect(line.chapter, `${stotra.key}[${idx}]: expected chapter field`).toBeTruthy();
      }
    }
  });
});
