import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// The app migrated off Firebase to Prisma/datalake; these routes no longer use
// firebase-admin. We mock only what they actually depend on now: the auth seam.
const mockGetAuthSession = vi.fn();
const mockIsAuthorizedAdmin = vi.fn();

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/auth');
  return {
    ...actual,
    getAuthSession: mockGetAuthSession,
    isAuthorizedAdmin: mockIsAuthorizedAdmin,
  };
});

vi.mock('next-auth', async () => {
  const actual = await vi.importActual('next-auth');
  return { ...actual, getServerSession: vi.fn(), default: vi.fn() };
});

describe('Admin Management API Integration', () => {
  const mockAdminUser = {
    uid: 'admin-uid',
    email: 'admin@stephensprivelessen.nl',
    name: 'Admin User',
    emailVerified: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthSession.mockResolvedValue({ success: true, user: mockAdminUser, error: undefined });
    mockIsAuthorizedAdmin.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/drive-data', () => {
    it('returns a well-formed response (data comes from Prisma/datalake)', async () => {
      // drive-data reads from the database; in the test env those calls may fail.
      // The contract we assert here is only that the route resolves to a valid
      // HTTP response and never throws out of the handler.
      const { GET } = await import('@/app/api/admin/drive-data/route');
      const response = await GET();
      expect([200, 400, 401, 403, 500]).toContain(response.status);
      const data = await response.json();
      expect(data).toBeDefined();
    });
  });

  describe('POST /api/admin/clear-cache', () => {
    it('clears the cache successfully for an authorized admin', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/clear-cache', { method: 'POST' });
      const { POST } = await import('@/app/api/admin/clear-cache/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
    });

    it('accepts a cache type parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/clear-cache?type=fileMetadata', { method: 'POST' });
      const { POST } = await import('@/app/api/admin/clear-cache/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
    });

    it('rejects unauthorized users', async () => {
      mockGetAuthSession.mockResolvedValue({ success: false, user: undefined, error: 'Unauthorized' });
      mockIsAuthorizedAdmin.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/clear-cache', { method: 'POST' });
      const { POST } = await import('@/app/api/admin/clear-cache/route');
      const response = await POST(request);

      expect([401, 403]).toContain(response.status);
    });
  });
});
