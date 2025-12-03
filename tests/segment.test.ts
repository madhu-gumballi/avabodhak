import { describe, expect, it } from 'vitest';

function nextIndex(i: number, n: number) {
  return (i + 1) % n;
}

function prevIndex(i: number, n: number) {
  return (i - 1 + n) % n;
}

describe('index wraparound', () => {
  it('wraps next', () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
  });
  it('wraps prev', () => {
    expect(prevIndex(0, 3)).toBe(2);
    expect(prevIndex(1, 3)).toBe(0);
  });
});
