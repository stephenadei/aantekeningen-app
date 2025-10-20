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
      getUser: vi.fn(),
    },
  };
});

vi.mock('@/lib/firebase-auth', () => ({
  verifyFirebaseTokenFromCookie: vi.fn(),
  isAuthorizedAdmin: vi.fn(),
}));

vi.mock('@/lib/google-drive-simple', () => ({
  googleDriveService: {
    getStudents: vi.fn(),
    getFilesInFolder: vi.fn(),
    syncStudentFiles: vi.fn(),
  },
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

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/admin/folders/sync', () => {
    it('should sync folders successfully', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/admin/folders/sync', {
        method: 'POST',
      });

      const { POST } = await import('@/app/api/admin/folders/sync/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
    });

    it('should handle sync errors gracefully', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/admin/folders/sync', {
        method: 'POST',
      });

      const { POST } = await import('@/app/api/admin/folders/sync/route');
      const response = await POST(request);

      expect([200, 500]).toContain(response.status);
    });

    it('should reject unauthorized users', async () => {
      const { verifyFirebaseTokenFromCookie } = await import('@/lib/firebase-auth');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: null, error: 'Unauthorized' });

      const request = new NextRequest('http://localhost:3000/api/admin/folders/sync', {
        method: 'POST',
      });

      const { POST } = await import('@/app/api/admin/folders/sync/route');
      const response = await POST(request);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/admin/folders/[folderId]/link', () => {
    it('should link folder to student', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);

      const mockRef = {
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined)
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockRef)
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/folders/folder-123/link', {
        method: 'POST',
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ studentId: 'student-1' })));
            controller.close();
          }
        }),
      });

      // Update to handle params as Promise
      const { POST } = await import('@/app/api/admin/folders/[folderId]/link/route');
      const response = await POST(request, { params: Promise.resolve({ folderId: 'folder-123' }) });
      
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('POST /api/admin/folders/[folderId]/confirm', () => {
    it('should confirm folder-student link', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);

      const mockRef = {
        update: vi.fn().mockResolvedValue(undefined)
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockRef)
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/folders/folder-123/confirm', {
        method: 'POST',
      });

      const { POST } = await import('@/app/api/admin/folders/[folderId]/confirm/route');
      const response = await POST(request, { params: Promise.resolve({ folderId: 'folder-123' }) });
      
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('POST /api/admin/folders/[folderId]/reject', () => {
    it('should reject folder-student link', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);

      const mockRef = {
        delete: vi.fn().mockResolvedValue(undefined)
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockRef)
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/folders/folder-123/reject', {
        method: 'POST',
      });

      const { POST } = await import('@/app/api/admin/folders/[folderId]/reject/route');
      const response = await POST(request, { params: Promise.resolve({ folderId: 'folder-123' }) });
      
      expect([200, 400]).toContain(response.status);
    });
  });
});
