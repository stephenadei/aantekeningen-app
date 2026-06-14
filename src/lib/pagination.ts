/**
 * Pagination helpers — one seam for the two pagination models the API uses:
 *
 *  - page-based   (?page=&limit=)    → admin/audit, admin/students, admin/notes
 *  - offset-based (?limit=&offset=)  → students/files
 *
 * The logic was previously copy-pasted into each route (skip/take math,
 * hasMore comparisons, in-memory slices — duplicated four times inside
 * students/files alone). These are pure functions so the math is unit-tested
 * in one place.
 *
 * Behaviour note: the page-based parser hardens invalid input (NaN/negative)
 * to safe defaults. The old routes did a bare `parseInt(get('page') || '1')`,
 * so a request like `?page=abc` produced a NaN skip/take. The offset-based
 * helper preserves students/files' exact existing semantics.
 */

export interface PageParams {
  /** 1-based page number (>= 1) */
  page: number;
  /** items per page (>= 1) */
  limit: number;
  /** rows to skip — feed to Prisma `skip` or an Array slice start */
  skip: number;
}

/**
 * Parse `?page=&limit=` into clamped, NaN-safe values plus the derived `skip`.
 */
export function parsePageParams(
  searchParams: URLSearchParams,
  opts: { defaultLimit?: number; maxLimit?: number } = {}
): PageParams {
  const { defaultLimit = 25, maxLimit } = opts;
  const page = clampInt(searchParams.get('page'), { fallback: 1, min: 1 });
  const limit = clampInt(searchParams.get('limit'), { fallback: defaultLimit, min: 1, max: maxLimit });
  return { page, limit, skip: (page - 1) * limit };
}

/** Whether a further page exists after the current one. */
export function hasMorePages(page: number, limit: number, total: number): boolean {
  return page * limit < total;
}

/** In-memory page slice for routes that fetch-all-then-paginate. */
export function paginateArray<T>(items: T[], page: number, limit: number): T[] {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

/**
 * Offset-based slice for students/files. Preserves the route's existing
 * semantics exactly: a missing `limit` returns everything with
 * `hasMore: false`; otherwise slice `[offset, offset + limit)` and report
 * whether more items remain past that window.
 */
export function sliceByOffset<T>(
  items: T[],
  rawLimit: string | null,
  rawOffset: string | null
): { items: T[]; hasMore: boolean } {
  if (rawLimit == null) {
    return { items, hasMore: false };
  }
  const limit = parseInt(rawLimit, 10);
  const offset = rawOffset ? parseInt(rawOffset, 10) : 0;
  return {
    items: items.slice(offset, offset + limit),
    hasMore: items.length > limit + offset,
  };
}

function clampInt(
  raw: string | null,
  { fallback, min, max }: { fallback: number; min: number; max?: number }
): number {
  const n = raw == null ? NaN : parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  let v = Math.max(min, n);
  if (max != null) v = Math.min(max, v);
  return v;
}
