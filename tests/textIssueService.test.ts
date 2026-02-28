import { describe, it, expect } from 'vitest';
import { ageLabel, emptyCounts } from '../src/lib/textIssueService';
import type { IssueStatus, PublicIssueView } from '../src/lib/textIssueService';

// ---------------------------------------------------------------------------
// Minimal Timestamp stub — mirrors the Firestore Timestamp API used by ageLabel
// ---------------------------------------------------------------------------
function makeTimestamp(ms: number) {
  return { toMillis: () => ms } as import('firebase/firestore').Timestamp;
}

// ---------------------------------------------------------------------------
// The sort comparator extracted from getPublicIssues — tested independently
// ---------------------------------------------------------------------------
const STATUS_ORDER: Record<IssueStatus, number> = {
  open: 0,
  acknowledged: 1,
  resolved: 2,
  wontfix: 3,
};

function sortIssues<T extends Pick<PublicIssueView, 'status' | 'reportCount'>>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    }
    return b.reportCount - a.reportCount;
  });
}

// ---------------------------------------------------------------------------

describe('ageLabel', () => {
  const MINUTE = 60 * 1000;
  const HOUR   = 60 * MINUTE;
  const DAY    = 24 * HOUR;
  const WEEK   = 7  * DAY;
  const MONTH  = 30 * DAY;

  function label(ageMs: number) {
    const now = Date.now();
    return ageLabel(makeTimestamp(now - ageMs), now);
  }

  it('returns "just now" for very recent timestamps', () => {
    expect(label(30 * 1000)).toBe('just now');
    expect(label(59 * 1000)).toBe('just now');
  });

  it('returns singular "1 minute ago"', () => {
    expect(label(MINUTE + 5000)).toBe('1 minute ago');
  });

  it('returns plural minutes', () => {
    expect(label(45 * MINUTE)).toBe('45 minutes ago');
  });

  it('returns singular "1 hour ago"', () => {
    expect(label(HOUR + MINUTE)).toBe('1 hour ago');
  });

  it('returns plural hours', () => {
    expect(label(5 * HOUR)).toBe('5 hours ago');
  });

  it('returns singular "1 day ago"', () => {
    expect(label(DAY + HOUR)).toBe('1 day ago');
  });

  it('returns plural days', () => {
    expect(label(3 * DAY)).toBe('3 days ago');
  });

  it('returns singular "1 week ago"', () => {
    expect(label(WEEK + DAY)).toBe('1 week ago');
  });

  it('returns plural weeks', () => {
    expect(label(3 * WEEK)).toBe('3 weeks ago');
  });

  it('returns singular "1 month ago"', () => {
    expect(label(MONTH + DAY)).toBe('1 month ago');
  });

  it('returns plural months', () => {
    expect(label(4 * MONTH)).toBe('4 months ago');
  });

  it('months take precedence over weeks once >= 30 days', () => {
    // 30 days = 1 month, not "4 weeks"
    expect(label(30 * DAY + HOUR)).toBe('1 month ago');
  });
});

// ---------------------------------------------------------------------------

describe('emptyCounts', () => {
  it('returns an object with all three issue types', () => {
    const c = emptyCounts();
    expect(c).toHaveProperty('doubt');
    expect(c).toHaveProperty('variant');
    expect(c).toHaveProperty('error');
  });

  it('each type has open, resolved and wontfix counters initialised to zero', () => {
    const c = emptyCounts();
    for (const type of ['doubt', 'variant', 'error'] as const) {
      expect(c[type].open).toBe(0);
      expect(c[type].resolved).toBe(0);
      expect(c[type].wontfix).toBe(0);
    }
  });

  it('returns a fresh object on every call', () => {
    const a = emptyCounts();
    const b = emptyCounts();
    expect(a).not.toBe(b);
    a.doubt.open = 5;
    expect(b.doubt.open).toBe(0); // mutation of one does not affect another
  });
});

// ---------------------------------------------------------------------------

describe('issue sort order', () => {
  it('open issues sort before acknowledged, resolved and wontfix', () => {
    const input = [
      { status: 'resolved'    as IssueStatus, reportCount: 10 },
      { status: 'open'        as IssueStatus, reportCount: 1  },
      { status: 'wontfix'     as IssueStatus, reportCount: 5  },
      { status: 'acknowledged'as IssueStatus, reportCount: 3  },
    ];
    const [first] = sortIssues(input);
    expect(first.status).toBe('open');
  });

  it('full status ordering: open → acknowledged → resolved → wontfix', () => {
    const input = [
      { status: 'wontfix'     as IssueStatus, reportCount: 1 },
      { status: 'resolved'    as IssueStatus, reportCount: 1 },
      { status: 'acknowledged'as IssueStatus, reportCount: 1 },
      { status: 'open'        as IssueStatus, reportCount: 1 },
    ];
    const sorted = sortIssues(input).map(i => i.status);
    expect(sorted).toEqual(['open', 'acknowledged', 'resolved', 'wontfix']);
  });

  it('within the same status, higher reportCount sorts first', () => {
    const input = [
      { status: 'open' as IssueStatus, reportCount: 1  },
      { status: 'open' as IssueStatus, reportCount: 7  },
      { status: 'open' as IssueStatus, reportCount: 3  },
    ];
    const sorted = sortIssues(input).map(i => i.reportCount);
    expect(sorted).toEqual([7, 3, 1]);
  });

  it('status ordering dominates reportCount — a 1-report open issue beats a 100-report resolved issue', () => {
    const input = [
      { status: 'resolved' as IssueStatus, reportCount: 100 },
      { status: 'open'     as IssueStatus, reportCount: 1   },
    ];
    const [first, second] = sortIssues(input);
    expect(first.status).toBe('open');
    expect(second.status).toBe('resolved');
  });

  it('is stable for equal status and equal reportCount (order preserved)', () => {
    const a = { status: 'open' as IssueStatus, reportCount: 5, id: 'a' };
    const b = { status: 'open' as IssueStatus, reportCount: 5, id: 'b' };
    const sorted = sortIssues([a, b]);
    // Both have equal keys — original relative order preserved
    expect(sorted[0].id).toBe('a');
    expect(sorted[1].id).toBe('b');
  });
});
