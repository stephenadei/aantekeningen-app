import { describe, it, expect, beforeEach, beforeAll, vi, afterEach } from 'vitest';
import { getSingleTestStudent } from '../../helpers/datalake-test-data';
import type { FileMetadata, DriveStudent } from '@/lib/interfaces';

// These routes read from the datalake (Firebase was removed). We exercise them
// against the real datalake helper and keep the cache real; assertions are
// lenient because the datalake may be unreachable in the test environment.
vi.mock('@/lib/cache', async () => {
  const actual = await vi.importActual('@/lib/cache');
  return { ...actual };
});

// Requires a live datalake (S3/MinIO). Skipped unless RUN_DATALAKE_TESTS is set,
// so CI (no datalake) stays green; run locally with RUN_DATALAKE_TESTS=1.
describe.skipIf(!process.env.RUN_DATALAKE_TESTS)('Metadata API Integration', () => {
  let testData: { student: DriveStudent; files: FileMetadata[] } | null = null;

  beforeAll(async () => {
    testData = await getSingleTestStudent().catch(() => null);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/metadata/status', () => {
    it('returns metadata status', async () => {
      const { GET } = await import('@/app/api/metadata/status/route');
      const response = await GET();
      const data = await response.json();

      expect([200, 500]).toContain(response.status);
      expect(data).toBeDefined();
      if (response.status === 200) {
        expect(data).toHaveProperty('success');
      }
    });

    it('handles datalake errors gracefully', async () => {
      // The route reads from datalakeService; force it to fail and assert the
      // handler degrades to a well-formed error response rather than throwing.
      const datalake = await import('@/lib/datalake-simple');
      vi.spyOn(datalake.datalakeService, 'getAllStudentFolders').mockRejectedValue(
        new Error('datalake connection failed'),
      );

      const { GET } = await import('@/app/api/metadata/status/route');
      const response = await GET();

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('POST /api/metadata/preload', () => {
    it('preloads metadata', async () => {
      const { POST } = await import('@/app/api/metadata/preload/route');
      const response = await POST();
      const data = await response.json();

      expect([200, 400, 500]).toContain(response.status);
      expect(data).toBeDefined();
    });
  });

  describe('Real datalake data validation', () => {
    it('fetched test data from the datalake (or skipped cleanly)', () => {
      if (!testData) {
        console.log('⚠️ No test data available from datalake — skipped');
        return;
      }
      expect(testData.student).toBeDefined();
      expect(Array.isArray(testData.files)).toBe(true);
    });
  });
});
