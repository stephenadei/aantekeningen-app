import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/firebase-admin', () => ({
  db: {
    collection: vi.fn(),
  },
}));

vi.mock('@/lib/firebase-auth', () => ({
  verifyFirebaseTokenFromCookie: vi.fn(),
  isAuthorizedAdmin: vi.fn(),
}));

describe('Admin Management API Integration', () => {
  const mockAdminUser = {
    uid: 'admin-uid',
    email: 'admin@stephensprivelessen.nl',
    customClaims: { role: 'admin' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/drive-data', () => {
    it('should get drive data statistics', async () => {
      const { db } = await import('@/lib/firebase-admin');

      const mockSnapshot = {
        docs: [],
        get: vi.fn().mockResolvedValue({
          docs: []
        })
      };

      vi.mocked(db.collection).mockReturnValue({
        get: vi.fn().mockResolvedValue(mockSnapshot)
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/drive-data');

      const { GET } = await import('@/app/api/admin/drive-data/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('POST /api/admin/clear-cache', () => {
    it('should clear cache successfully', async () => {
      const { db } = await import('@/lib/firebase-admin');

      const mockSnapshot = {
        docs: []
      };

      vi.mocked(db.collection).mockReturnValue({
        get: vi.fn().mockResolvedValue(mockSnapshot)
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/clear-cache', {
        method: 'POST',
      });

      const { POST } = await import('@/app/api/admin/clear-cache/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle cache type parameter', async () => {
      const { db } = await import('@/lib/firebase-admin');

      const mockSnapshot = {
        docs: []
      };

      vi.mocked(db.collection).mockReturnValue({
        get: vi.fn().mockResolvedValue(mockSnapshot),
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockSnapshot)
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/clear-cache?type=fileMetadata', {
        method: 'POST',
      });

      const { POST } = await import('@/app/api/admin/clear-cache/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
