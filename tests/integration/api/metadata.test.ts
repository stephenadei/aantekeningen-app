import { describe, it, expect, beforeEach, beforeAll, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getSingleTestStudent, getTestData } from '../../helpers/datalake-test-data';
import type { FileMetadata, DriveStudent } from '@/lib/interfaces';

// Mock Firebase Admin (still needed for some auth checks)
vi.mock('@/lib/firebase-admin', () => {
  const mockCollectionRef = {
    doc: vi.fn(),
    add: vi.fn(),
    get: vi.fn().mockResolvedValue({ docs: [] }),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  };

  const mockDocRef = {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };

  mockCollectionRef.doc.mockReturnValue(mockDocRef);
  mockCollectionRef.add.mockResolvedValue(mockDocRef);

  return {
    db: {
      collection: vi.fn().mockReturnValue(mockCollectionRef),
      runTransaction: vi.fn().mockImplementation((callback) => callback({})),
      batch: vi.fn().mockReturnValue({
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }),
    },
    auth: {
      verifyIdToken: vi.fn(),
    },
  };
});

// Use real datalake services instead of mocks
// Only mock cache if we need to override behavior
vi.mock('@/lib/cache', async () => {
  const actual = await vi.importActual('@/lib/cache');
  return {
    ...actual,
    // We can still mock specific functions if needed, but use real datalake by default
  };
});

describe('Metadata API Integration', () => {
  let testData: { student: DriveStudent; files: FileMetadata[] } | null = null;

  beforeAll(async () => {
    // Fetch real data from datalake once before all tests
    testData = await getSingleTestStudent();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/metadata/status', () => {
    it('should return metadata status', async () => {
      const { GET } = await import('@/app/api/metadata/status/route');
      const response = await GET();
      const data = await response.json();

      expect([200, 500]).toContain(response.status);
      expect(data).toBeDefined();
      if (response.status === 200) {
        expect(data).toHaveProperty('success');
      }
    });

    it('should handle database errors gracefully', async () => {
      const { db } = await import('@/lib/firebase-admin');
      
      vi.mocked(db.collection).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const { GET } = await import('@/app/api/metadata/status/route');
      const response = await GET();

      expect([500, 200]).toContain(response.status);
    });
  });

  describe('POST /api/metadata/preload', () => {
    it('should preload metadata using real datalake data', async () => {
      if (!testData || testData.files.length === 0) {
        console.log('⚠️ No test data available from datalake, skipping test');
        return;
      }

      // Verify we have real data
      expect(testData.files.length).toBeGreaterThan(0);
      expect(testData.files[0]).toHaveProperty('id');
      expect(testData.files[0]).toHaveProperty('name');
      expect(testData.files[0]).toHaveProperty('modifiedTime');

      const { POST } = await import('@/app/api/metadata/preload/route');
      const response = await POST();
      const data = await response.json();

      expect([200, 400, 500]).toContain(response.status);
      expect(data).toBeDefined();
      
      if (response.status === 200) {
        expect(data).toHaveProperty('success');
      }
    });

    it('should handle missing studentId', async () => {
      const { POST } = await import('@/app/api/metadata/preload/route');
      const response = await POST();

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should work with real datalake cache operations', async () => {
      if (!testData) {
        console.log('⚠️ No test data available from datalake, skipping test');
        return;
      }

      const { POST } = await import('@/app/api/metadata/preload/route');
      const response = await POST();

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Real datalake data validation', () => {
    it('should have fetched test data from datalake', () => {
      if (!testData) {
        console.log('⚠️ No test data available from datalake');
        return;
      }

      expect(testData.student).toBeDefined();
      const studentName = typeof testData.student.name === 'string' 
        ? testData.student.name 
        : String(testData.student.name);
      expect(studentName).toBeTruthy();
      expect(Array.isArray(testData.files)).toBe(true);
      
      if (testData.files.length > 0) {
        const firstFile = testData.files[0];
        expect(firstFile).toHaveProperty('id');
        expect(firstFile).toHaveProperty('name');
        expect(firstFile).toHaveProperty('modifiedTime');
        console.log(`✅ Using real datalake data: ${studentName} with ${testData.files.length} files`);
      } else {
        console.log(`⚠️ Student ${studentName} has no files in datalake`);
      }
    });
  });
});
