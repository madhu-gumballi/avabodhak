import { describe, it, expect } from 'vitest';
import hariLines from '../src/data/hari.lines.json';
import type { TextFile } from '../src/data/types';

describe('hari.lines.json', () => {
  const data = hariLines as TextFile;

  it('includes required metadata', () => {
    expect(data.title).toContain('Hari');
    expect(data.sources?.iast).toContain('vignanam.org');
    expect(data.sources?.deva).toContain('vignanam.org');
    expect(data.sources?.knda).toContain('vignanam.org');
  });

  it('contains unique line ids and required language text', () => {
    const ids = new Set<string>();
    expect(data.lines.length).toBeGreaterThan(0);

    data.lines.forEach((line) => {
      expect(line.id).toBeTruthy();
      expect(ids.has(line.id)).toBe(false);
      ids.add(line.id);

      expect(line.deva?.trim().length).toBeGreaterThan(0);
      expect(line.iast?.trim().length).toBeGreaterThan(0);
      expect(line.knda?.trim().length).toBeGreaterThan(0);
    });
  });
});
