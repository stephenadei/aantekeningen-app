import { describe, it, expect } from 'vitest';
import {
  parsePageParams,
  hasMorePages,
  paginateArray,
  sliceByOffset,
} from '@/lib/pagination';

const params = (q: Record<string, string>) => new URLSearchParams(q);

describe('parsePageParams', () => {
  it('parses valid page + limit and derives skip', () => {
    expect(parsePageParams(params({ page: '3', limit: '20' }))).toEqual({
      page: 3,
      limit: 20,
      skip: 40,
    });
  });

  it('falls back to defaults when params are absent', () => {
    expect(parsePageParams(params({}))).toEqual({ page: 1, limit: 25, skip: 0 });
    expect(parsePageParams(params({}), { defaultLimit: 50 })).toEqual({
      page: 1,
      limit: 50,
      skip: 0,
    });
  });

  it('hardens NaN input to safe defaults (old routes produced NaN skip)', () => {
    expect(parsePageParams(params({ page: 'abc', limit: 'xyz' }), { defaultLimit: 20 })).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
    });
  });

  it('clamps page and limit to their minimums', () => {
    const r = parsePageParams(params({ page: '0', limit: '-5' }));
    expect(r.page).toBe(1);
    expect(r.limit).toBe(1);
    expect(r.skip).toBe(0);
  });

  it('applies maxLimit only when provided', () => {
    expect(parsePageParams(params({ limit: '1000' })).limit).toBe(1000);
    expect(parsePageParams(params({ limit: '1000' }), { maxLimit: 100 }).limit).toBe(100);
  });
});

describe('hasMorePages', () => {
  it('is true when more rows remain past the current page', () => {
    expect(hasMorePages(1, 20, 50)).toBe(true);
    expect(hasMorePages(2, 20, 50)).toBe(true);
  });

  it('is false on the last/only page', () => {
    expect(hasMorePages(3, 20, 50)).toBe(false);
    expect(hasMorePages(1, 20, 20)).toBe(false);
    expect(hasMorePages(1, 20, 0)).toBe(false);
  });
});

describe('paginateArray', () => {
  const items = Array.from({ length: 7 }, (_, i) => i); // [0..6]

  it('slices the requested page', () => {
    expect(paginateArray(items, 1, 3)).toEqual([0, 1, 2]);
    expect(paginateArray(items, 2, 3)).toEqual([3, 4, 5]);
    expect(paginateArray(items, 3, 3)).toEqual([6]);
  });

  it('returns empty past the end', () => {
    expect(paginateArray(items, 4, 3)).toEqual([]);
  });
});

describe('sliceByOffset', () => {
  const items = Array.from({ length: 10 }, (_, i) => i); // [0..9]

  it('returns everything with hasMore=false when no limit is given', () => {
    expect(sliceByOffset(items, null, null)).toEqual({ items, hasMore: false });
    // offset without limit is ignored, same as the original route
    expect(sliceByOffset(items, null, '5')).toEqual({ items, hasMore: false });
  });

  it('slices [offset, offset+limit) and reports remaining', () => {
    expect(sliceByOffset(items, '3', '0')).toEqual({ items: [0, 1, 2], hasMore: true });
    expect(sliceByOffset(items, '4', '2')).toEqual({ items: [2, 3, 4, 5], hasMore: true });
  });

  it('hasMore is false when the window reaches the end', () => {
    expect(sliceByOffset(items, '10', '0')).toEqual({ items, hasMore: false });
    expect(sliceByOffset(items, '5', '5')).toEqual({ items: [5, 6, 7, 8, 9], hasMore: false });
  });

  it('defaults offset to 0 when absent', () => {
    expect(sliceByOffset(items, '2', null)).toEqual({ items: [0, 1], hasMore: true });
  });
});
