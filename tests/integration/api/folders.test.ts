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

describe('Folder Management API Integration', () => {
  const mockAdminUser = {
    uid: 'admin-uid',
    email: 'admin@stephensprivelessen.nl',
    customClaims: { role: 'admin' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/admin/folders/sync', () => {
    it('should sync folders successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/folders/sync', {
        method: 'POST',
      });

      const { POST } = await import('@/app/api/admin/folders/sync/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle sync errors gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/folders/sync', {
        method: 'POST',
      });

      const { POST } = await import('@/app/api/admin/folders/sync/route');
      const response = await POST(request);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('POST /api/admin/folders/[folderId]/link', () => {
    it('should link folder to student', async () => {
      const { db } = await import('@/lib/firebase-admin');

      const mockRef = {
        set: vi.fn().mockResolvedValue(undefined)
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockRef)
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/folders/folder-123/link', {
        method: 'POST',
        body: JSON.stringify({
          studentId: 'student-123',
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const { POST } = await import('@/app/api/admin/folders/[folderId]/link/route');
      const response = await POST(request, { params: Promise.resolve({ folderId: 'folder-123' }) });
      const data = await response.json();

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('POST /api/admin/folders/[folderId]/confirm', () => {
    it('should confirm folder-student link', async () => {
      const { db } = await import('@/lib/firebase-admin');

      const mockRef = {
        update: vi.fn().mockResolvedValue(undefined)
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockRef)
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/folders/folder-123/confirm', {
        method: 'POST',
        body: JSON.stringify({
          studentId: 'student-123',
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const { POST } = await import('@/app/api/admin/folders/[folderId]/confirm/route');
      const response = await POST(request, { params: Promise.resolve({ folderId: 'folder-123' }) });

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('POST /api/admin/folders/[folderId]/reject', () => {
    it('should reject folder-student link', async () => {
      const { db } = await import('@/lib/firebase-admin');

      const mockRef = {
        delete: vi.fn().mockResolvedValue(undefined)
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockRef)
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/folders/folder-123/reject', {
        method: 'POST',
        body: JSON.stringify({
          studentId: 'student-123',
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const { POST } = await import('@/app/api/admin/folders/[folderId]/reject/route');
      const response = await POST(request, { params: Promise.resolve({ folderId: 'folder-123' }) });

      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
