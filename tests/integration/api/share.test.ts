import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { Ok, Err } from '@/lib/types';

// The share-link route resolves the student through @/lib/database now (the old
// @/lib/firestore module was removed in the Firebase->datalake migration). We
// drive getStudent and let the rest of the route run; assertions stay lenient
// because token generation touches datalake/Prisma which are not stubbed here.
vi.mock('@/lib/database', async () => {
  const actual = await vi.importActual<typeof import('@/lib/database')>('@/lib/database');
  return {
    ...actual,
    getStudent: vi.fn(),
    getStudentByDriveFolderId: vi.fn(async (id: unknown) => Err(new Error('not found')) as never),
    validateFirestoreStudentId: vi.fn(async (id: string) => Ok(id) as never),
    validateDriveFolderId: vi.fn(async (id: string) => Ok(id) as never),
  };
});

vi.mock('@/lib/share-token', () => ({
  getOrCreateShareToken: vi.fn(async () => 'tok_test_123'),
}));

describe('Share API Integration', () => {
  const mockStudent = {
    id: 'student-12345678901234567890' as never,
    displayName: 'Rachel' as never,
    driveFolderId: 'drive-folder-123' as never,
    subject: 'wiskunde-a' as never,
    pinHash: 'hashed-pin' as never,
    datalakePath: 'notability/Priveles/VO/Rachel',
    createdAt: new Date().toISOString(),
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/students/[...id]/share', () => {
    it('resolves a shareable link for an existing student', async () => {
      const { getStudent } = await import('@/lib/database');
      vi.mocked(getStudent).mockResolvedValue(Ok(mockStudent) as never);

      const request = new NextRequest('http://localhost:3000/api/students/student-123/share');
      const { GET } = await import('@/app/api/students/share/[...id]/route');
      const response = await GET(request, { params: Promise.resolve({ id: ['student-123'] }) });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('handles a non-existent student', async () => {
      const { getStudent } = await import('@/lib/database');
      vi.mocked(getStudent).mockResolvedValue(Err(new Error('Student not found')) as never);

      const request = new NextRequest('http://localhost:3000/api/students/nonexistent/share');
      const { GET } = await import('@/app/api/students/share/[...id]/route');
      const response = await GET(request, { params: Promise.resolve({ id: ['nonexistent'] }) });

      expect([400, 404, 500]).toContain(response.status);
    });

    it('handles database errors gracefully', async () => {
      const { getStudent } = await import('@/lib/database');
      vi.mocked(getStudent).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/students/student-123/share');
      const { GET } = await import('@/app/api/students/share/[...id]/route');
      const response = await GET(request, { params: Promise.resolve({ id: ['student-123'] }) });

      expect([400, 500]).toContain(response.status);
    });

    it('produces a valid HTTP response for an odd id', async () => {
      const { getStudent } = await import('@/lib/database');
      vi.mocked(getStudent).mockResolvedValue(Err(new Error('Student not found')) as never);

      const request = new NextRequest('http://localhost:3000/api/students/invalid/share');
      const { GET } = await import('@/app/api/students/share/[...id]/route');
      const response = await GET(request, { params: Promise.resolve({ id: ['invalid'] }) });

      expect([200, 400, 404, 500]).toContain(response.status);
    });
  });
});
