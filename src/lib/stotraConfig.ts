/**
 * Shared stotra configuration
 * Single source of truth for stotra metadata used by MyProgressCard, UserMenu, etc.
 */

import vsnLines from '../data/vs.lines.new.json';
import hariLines from '../data/hari.lines.json';
import keshavaLines from '../data/keshava.lines.json';
import vayuLines from '../data/vayu.lines.json';
import raghavendraLines from '../data/raghavendra.lines.json';
import yantrodharakaLines from '../data/yantrodharaka.lines.json';
import venkateshwaraLines from '../data/venkateshwara.lines.json';
import type { TextFile, Lang, Line } from '../data/types';

export interface StotraInfo {
  key: 'vsn' | 'hari' | 'keshava' | 'vayu' | 'raghavendra' | 'yantrodharaka' | 'venkateshwara';
  totalLines: number;
  languages: Lang[];
  data: TextFile;
  hidden?: boolean;
}

export const STOTRAS: StotraInfo[] = [
  { key: 'vsn', totalLines: (vsnLines as TextFile).lines.length, languages: ['deva', 'knda', 'tel', 'tam', 'pan', 'guj', 'mr', 'ben', 'mal', 'iast'], data: vsnLines as TextFile },
  { key: 'hari', totalLines: (hariLines as TextFile).lines.length, languages: ['deva', 'knda', 'tel', 'tam', 'pan', 'iast'], data: hariLines as TextFile },
  { key: 'keshava', totalLines: (keshavaLines as TextFile).lines.length, languages: ['deva', 'knda', 'tel', 'tam', 'pan', 'guj', 'iast'], data: keshavaLines as TextFile },
  { key: 'vayu', totalLines: (vayuLines as TextFile).lines.length, languages: ['deva', 'knda', 'tel', 'tam', 'iast'], data: vayuLines as TextFile },
  { key: 'raghavendra', totalLines: (raghavendraLines as TextFile).lines.length, languages: ['deva', 'knda', 'tel', 'tam', 'iast'], data: raghavendraLines as TextFile },
  { key: 'yantrodharaka', totalLines: (yantrodharakaLines as TextFile).lines.length, languages: ['deva', 'knda', 'tel', 'iast'], data: yantrodharakaLines as TextFile },
  { key: 'venkateshwara', totalLines: (venkateshwaraLines as TextFile).lines.length, languages: ['knda', 'iast'], data: venkateshwaraLines as TextFile },
];

/**
 * Get line text array for a stotra in a given language.
 * Results are cached so repeated calls (e.g. in loops over languages) are free.
 */
const linesCache = new Map<string, string[]>();

export function getStotraLines(data: TextFile, lang: Lang): string[] {
  const cacheKey = `${data.title}:${lang}`;
  const cached = linesCache.get(cacheKey);
  if (cached) return cached;
  const lines = data.lines.map((line) => (line as unknown as Record<string, string>)[lang] || line.deva);
  linesCache.set(cacheKey, lines);
  return lines;
}

/**
 * Get the set of line indices that are chapter/section headers.
 * PuzzleView skips these via chapterIndices; we need the same set for resume logic.
 */
const chapterCache = new Map<string, Set<number>>();

export function getStotraChapterIndices(data: TextFile): Set<number> {
  const cacheKey = data.title;
  const cached = chapterCache.get(cacheKey);
  if (cached) return cached;
  const indices = new Set<number>();
  (data.lines as Line[]).forEach((ln, i) => {
    if (ln.chapter) indices.add(i);
  });
  chapterCache.set(cacheKey, indices);
  return indices;
}
