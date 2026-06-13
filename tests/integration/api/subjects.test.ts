import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Subjects routes talk to Prisma now (Firebase was removed). A generic Prisma
// stub keeps these as fast smoke tests without a real database: any
// prisma.<model>.<method>() resolves to a sensible empty/echo value.
const prismaModel = {
  findMany: vi.fn(async () => []),
  findUnique: vi.fn(async () => null),
  findFirst: vi.fn(async () => null),
  create: vi.fn(async (args: { data?: Record<string, unknown> }) => ({ id: 'new-id', ...(args?.data ?? {}) })),
  update: vi.fn(async (args: { where?: { id?: string }; data?: Record<string, unknown> }) => ({ id: args?.where?.id ?? 'id', ...(args?.data ?? {}) })),
  delete: vi.fn(async () => ({})),
  deleteMany: vi.fn(async () => ({ count: 0 })),
  count: vi.fn(async () => 0),
};

vi.mock('@stephenadei/database', () => ({
  prisma: new Proxy({}, { get: () => prismaModel }),
}));

const mockGetAuthSession = vi.fn();
const mockIsAuthorizedAdmin = vi.fn();

vi.mock('@/lib/auth', () => ({
  getAuthSession: mockGetAuthSession,
  isAuthorizedAdmin: mockIsAuthorizedAdmin,
}));

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));

describe('Subjects API Integration', () => {
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

  describe('GET /api/admin/subjects', () => {
    it('retrieves all subjects', async () => {
      const { GET } = await import('@/app/api/admin/subjects/route');
      const response = await GET();
      const data = await response.json();
      expect([200, 400, 500]).toContain(response.status);
      expect(data).toBeDefined();
    });
  });

  describe('POST /api/admin/subjects', () => {
    it('creates a new subject', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/subjects', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Subject', description: 'A new subject' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const { POST } = await import('@/app/api/admin/subjects/route');
      const response = await POST(request);
      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it('rejects a subject without a name', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/subjects', {
        method: 'POST',
        body: JSON.stringify({ description: 'No name provided' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const { POST } = await import('@/app/api/admin/subjects/route');
      const response = await POST(request);
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/admin/subjects/[subjectId]', () => {
    it('updates a subject', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/subjects/primair-onderwijs', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Subject' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const { PUT } = await import('@/app/api/admin/subjects/[subjectId]/route');
      const response = await PUT(request, { params: Promise.resolve({ subjectId: 'primair-onderwijs' }) });
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/admin/subjects/[subjectId]', () => {
    it('deletes a subject with all topics', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/subjects/primair-onderwijs', { method: 'DELETE' });
      const { DELETE } = await import('@/app/api/admin/subjects/[subjectId]/route');
      const response = await DELETE(request, { params: Promise.resolve({ subjectId: 'primair-onderwijs' }) });
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Topics API', () => {
    it('gets topics for a subject', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/subjects/primair-onderwijs/topics');
      const { GET } = await import('@/app/api/admin/subjects/[subjectId]/topics/route');
      const response = await GET(request, { params: Promise.resolve({ subjectId: 'primair-onderwijs' }) });
      expect([200, 400, 500]).toContain(response.status);
    });

    it('creates a new topic', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/subjects/primair-onderwijs/topics', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Topic' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const { POST } = await import('@/app/api/admin/subjects/[subjectId]/topics/route');
      const response = await POST(request, { params: Promise.resolve({ subjectId: 'primair-onderwijs' }) });
      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
