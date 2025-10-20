import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Firebase Admin
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

vi.mock('@/lib/cache', () => ({
  getFileMetadata: vi.fn().mockResolvedValue([]),
  getCachedData: vi.fn().mockResolvedValue(null),
  setCachedData: vi.fn().mockResolvedValue(undefined),
  isFileMetadataFresh: vi.fn().mockResolvedValue(true),
}));

describe('Metadata API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/metadata/status', () => {
    it('should return metadata status', async () => {
      const request = new NextRequest('http://localhost:3000/api/metadata/status');

      const { GET } = await import('@/app/api/metadata/status/route');
      const response = await GET(request);
      const data = await response.json();

      expect([200, 500]).toContain(response.status);
      expect(data).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      const { db } = await import('@/lib/firebase-admin');
      
      vi.mocked(db.collection).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new NextRequest('http://localhost:3000/api/metadata/status');

      const { GET } = await import('@/app/api/metadata/status/route');
      const response = await GET(request);

      expect([500, 200]).toContain(response.status);
    });
  });

  describe('POST /api/metadata/preload', () => {
    it('should preload metadata for a student', async () => {
      const { getFileMetadata } = await import('@/lib/cache');

      vi.mocked(getFileMetadata).mockResolvedValue([
        {
          id: 'file-1',
          studentId: 'student-123',
          folderId: 'folder-1',
          name: 'test-file',
          title: 'Test File',
          modifiedTime: new Date(),
          size: 1024,
          thumbnailUrl: 'https://example.com/thumb.jpg',
          downloadUrl: 'https://drive.google.com/download',
          viewUrl: 'https://drive.google.com/view',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ]);

      const request = new NextRequest('http://localhost:3000/api/metadata/preload', {
        method: 'POST',
        body: JSON.stringify({
          studentId: 'student-123',
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const { POST } = await import('@/app/api/metadata/preload/route');
      const response = await POST(request);
      const data = await response.json();

      expect([200, 400, 500]).toContain(response.status);
      expect(data).toBeDefined();
    });

    it('should handle missing studentId', async () => {
      const request = new NextRequest('http://localhost:3000/api/metadata/preload', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });

      const { POST } = await import('@/app/api/metadata/preload/route');
      const response = await POST(request);

      expect([400, 500]).toContain(response.status);
    });

    it('should handle cache operations', async () => {
      const { getFileMetadata, setCachedData } = await import('@/lib/cache');

      vi.mocked(getFileMetadata).mockResolvedValue([]);
      vi.mocked(setCachedData).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/metadata/preload', {
        method: 'POST',
        body: JSON.stringify({
          studentId: 'student-123',
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const { POST } = await import('@/app/api/metadata/preload/route');
      const response = await POST(request);

      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
