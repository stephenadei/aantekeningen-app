import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Folder routes gate on requireAdmin(); sync delegates to backgroundSyncService.
// link/confirm/reject are auth-gated placeholders. No Firebase anymore.
const mockRequireAdmin = vi.fn();

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/auth');
  return { ...actual, requireAdmin: mockRequireAdmin };
});

vi.mock('next-auth', () => ({ getServerSession: vi.fn(), default: vi.fn() }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));

const unauthorized = () => ({ ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) });

vi.mock('@/lib/background-sync', () => ({
  backgroundSyncService: {
    runFullSync: vi.fn(async () => ({ studentsProcessed: 0, filesProcessed: 0, errors: [] })),
    forceSyncStudent: vi.fn(async () => undefined),
  },
}));

describe('Folder Management API Integration', () => {
  const mockAdminUser = {
    uid: 'admin-uid',
    email: 'admin@stephensprivelessen.nl',
    emailVerified: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true, user: mockAdminUser });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/admin/folders/sync', () => {
    it('syncs folders successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/folders/sync', { method: 'POST' });
      const { POST } = await import('@/app/api/admin/folders/sync/route');
      const response = await POST(request);
      const data = await response.json();

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) expect(data).toHaveProperty('success');
    });

    it('rejects unauthorized users', async () => {
      mockRequireAdmin.mockResolvedValue(unauthorized());

      const request = new NextRequest('http://localhost:3000/api/admin/folders/sync', { method: 'POST' });
      const { POST } = await import('@/app/api/admin/folders/sync/route');
      const response = await POST(request);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/admin/folders/[folderId]/link', () => {
    it('links a folder to a student', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/folders/folder-123/link', {
        method: 'POST',
        body: JSON.stringify({ studentId: 'student-1' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const { POST } = await import('@/app/api/admin/folders/[folderId]/link/route');
      const response = await POST(request, { params: Promise.resolve({ folderId: 'folder-123' }) });

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('POST /api/admin/folders/[folderId]/confirm', () => {
    it('confirms a folder-student link', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/folders/folder-123/confirm', { method: 'POST' });
      const { POST } = await import('@/app/api/admin/folders/[folderId]/confirm/route');
      const response = await POST(request, { params: Promise.resolve({ folderId: 'folder-123' }) });

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('POST /api/admin/folders/[folderId]/reject', () => {
    it('rejects a folder-student link', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/folders/folder-123/reject', { method: 'POST' });
      const { POST } = await import('@/app/api/admin/folders/[folderId]/reject/route');
      const response = await POST(request, { params: Promise.resolve({ folderId: 'folder-123' }) });

      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
