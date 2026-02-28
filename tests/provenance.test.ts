import { describe, it, expect } from 'vitest';
import vsnLines from '../src/data/vs.lines.new.json';
import hariLines from '../src/data/hari.lines.json';
import keshavaLines from '../src/data/keshava.lines.json';
import vayuLines from '../src/data/vayu.lines.json';
import raghavendraLines from '../src/data/raghavendra.lines.json';
import yantrodharakaLines from '../src/data/yantrodharaka.lines.json';
import venkateshwaraLines from '../src/data/venkateshwara.lines.json';
import type { TextFile, QualityTier } from '../src/data/types';

const VALID_TIERS: QualityTier[] = [1, 2, 3, 4];
const VALID_SOURCE_TYPES = [
  'critical_edition',
  'published_book',
  'digital_community',
  'internet_unknown',
] as const;

const ALL_STOTRAS = [
  { key: 'vsn',           data: vsnLines as TextFile },
  { key: 'hari',          data: hariLines as TextFile },
  { key: 'keshava',       data: keshavaLines as TextFile },
  { key: 'vayu',          data: vayuLines as TextFile },
  { key: 'raghavendra',   data: raghavendraLines as TextFile },
  { key: 'yantrodharaka', data: yantrodharakaLines as TextFile },
  { key: 'venkateshwara', data: venkateshwaraLines as TextFile },
];

describe('TextProvenance — all 7 stotra JSON files', () => {
  it('every stotra has a provenance block', () => {
    for (const { key, data } of ALL_STOTRAS) {
      expect(data.provenance, `${key}: missing provenance`).toBeDefined();
    }
  });

  it('qualityTier is a valid value (1–4)', () => {
    for (const { key, data } of ALL_STOTRAS) {
      expect(VALID_TIERS, `${key}: invalid tier`).toContain(data.provenance?.qualityTier);
    }
  });

  it('all current stotras are Tier 3 — honest community-digital baseline', () => {
    for (const { key, data } of ALL_STOTRAS) {
      expect(data.provenance?.qualityTier, `${key}: expected Tier 3`).toBe(3);
    }
  });

  it('primarySource.type is a valid enum value', () => {
    for (const { key, data } of ALL_STOTRAS) {
      expect(
        VALID_SOURCE_TYPES,
        `${key}: invalid primarySource.type`,
      ).toContain(data.provenance?.primarySource.type);
    }
  });

  it('primarySource.label is non-empty', () => {
    for (const { key, data } of ALL_STOTRAS) {
      expect(
        data.provenance?.primarySource.label?.trim().length,
        `${key}: empty primarySource.label`,
      ).toBeGreaterThan(0);
    }
  });

  it('crossReferenced and scholarReviewed are booleans', () => {
    for (const { key, data } of ALL_STOTRAS) {
      expect(typeof data.provenance?.crossReferenced, `${key}: crossReferenced`).toBe('boolean');
      expect(typeof data.provenance?.scholarReviewed, `${key}: scholarReviewed`).toBe('boolean');
    }
  });

  it('no stotra is marked crossReferenced or scholarReviewed yet — honest baseline', () => {
    for (const { key, data } of ALL_STOTRAS) {
      expect(data.provenance?.crossReferenced, `${key}: crossReferenced should be false`).toBe(false);
      expect(data.provenance?.scholarReviewed, `${key}: scholarReviewed should be false`).toBe(false);
    }
  });

  it('knownVariants is an array of non-empty strings when present', () => {
    for (const { key, data } of ALL_STOTRAS) {
      const kv = data.provenance?.knownVariants;
      if (kv !== undefined) {
        expect(Array.isArray(kv), `${key}: knownVariants should be array`).toBe(true);
        for (const [i, v] of kv.entries()) {
          expect(typeof v, `${key}: knownVariants[${i}] should be string`).toBe('string');
          expect(v.trim().length, `${key}: knownVariants[${i}] should be non-empty`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('VSN lists at least one known variant', () => {
    const vsn = ALL_STOTRAS.find(s => s.key === 'vsn')!;
    expect(vsn.data.provenance?.knownVariants?.length).toBeGreaterThan(0);
  });

  it('Madhva stotras (vayu, raghavendra, yantrodharaka) have sampradayaVariant = Madhva', () => {
    const madhvaKeys = ['vayu', 'raghavendra', 'yantrodharaka'];
    for (const { key, data } of ALL_STOTRAS) {
      if (madhvaKeys.includes(key)) {
        expect(data.provenance?.sampradayaVariant, `${key}: expected Madhva sampradaya`).toBe('Madhva');
      }
    }
  });

  it('non-Madhva stotras do not claim Madhva sampradaya', () => {
    const nonMadhvaKeys = ['vsn', 'hari', 'keshava', 'venkateshwara'];
    for (const { key, data } of ALL_STOTRAS) {
      if (nonMadhvaKeys.includes(key)) {
        expect(data.provenance?.sampradayaVariant, `${key}: should not be Madhva`).not.toBe('Madhva');
      }
    }
  });

  it('Tier 3 stotras use digital_community source type', () => {
    for (const { key, data } of ALL_STOTRAS) {
      if (data.provenance?.qualityTier === 3) {
        expect(
          data.provenance.primarySource.type,
          `${key}: Tier 3 should be digital_community`,
        ).toBe('digital_community');
      }
    }
  });
});
