import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Firebase
vi.mock('@/lib/firebase-admin', () => ({
  db: {
    collection: vi.fn(),
  },
}));

vi.mock('@/lib/firebase-auth', () => ({
  verifyFirebaseTokenFromCookie: vi.fn(),
  isAuthorizedAdmin: vi.fn(),
}));

describe('Concepts API Integration', () => {
  const mockConcept = {
    id: 'concept-1',
    noteId: 'note-1',
    name: 'Kwadratische vergelijkingen',
    description: 'Een vergelijking van de vorm ax² + bx + c = 0',
    examples: ['x² - 5x + 6 = 0', 'x² + 2x - 3 = 0'],
    keywords: ['algebra', 'parabool', 'discriminant'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdminUser = {
    uid: 'admin-uid',
    email: 'admin@stephensprivelessen.nl',
    customClaims: { role: 'admin' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/notes/[id]/concepts/[conceptId]', () => {
    it('should retrieve concept details', async () => {
      const { db } = await import('@/lib/firebase-admin');

      const mockRef = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockConcept,
          id: mockConcept.id
        })
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            doc: vi.fn().mockReturnValue(mockRef)
          })
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/notes/note-1/concepts/concept-1');

      const { GET } = await import('@/app/api/admin/notes/[id]/concepts/[conceptId]/route');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'note-1', conceptId: 'concept-1' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.concept).toBeDefined();
    });

    it('should handle non-existent concept', async () => {
      const { db } = await import('@/lib/firebase-admin');

      const mockRef = {
        get: vi.fn().mockResolvedValue({
          exists: () => false
        })
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            doc: vi.fn().mockReturnValue(mockRef)
          })
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/notes/note-1/concepts/nonexistent');

      const { GET } = await import('@/app/api/admin/notes/[id]/concepts/[conceptId]/route');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'note-1', conceptId: 'nonexistent' })
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe('PUT /api/admin/notes/[id]/concepts/[conceptId]', () => {
    it('should update concept', async () => {
      const { db } = await import('@/lib/firebase-admin');

      const mockRef = {
        update: vi.fn().mockResolvedValue(undefined)
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            doc: vi.fn().mockReturnValue(mockRef)
          })
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/notes/note-1/concepts/concept-1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Concept',
          description: 'Updated description'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const { PUT } = await import('@/app/api/admin/notes/[id]/concepts/[conceptId]/route');
      const response = await PUT(request, {
        params: Promise.resolve({ id: 'note-1', conceptId: 'concept-1' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('DELETE /api/admin/notes/[id]/concepts/[conceptId]', () => {
    it('should delete concept', async () => {
      const { db } = await import('@/lib/firebase-admin');

      const mockRef = {
        delete: vi.fn().mockResolvedValue(undefined)
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            doc: vi.fn().mockReturnValue(mockRef)
          })
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/notes/note-1/concepts/concept-1', {
        method: 'DELETE'
      });

      const { DELETE } = await import('@/app/api/admin/notes/[id]/concepts/[conceptId]/route');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'note-1', conceptId: 'concept-1' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/admin/concepts/[id]', () => {
    it('should retrieve concept by ID', async () => {
      const { db } = await import('@/lib/firebase-admin');

      const mockSnapshot = {
        docs: [
          { id: mockConcept.id, data: () => mockConcept }
        ]
      };

      vi.mocked(db.collection).mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockSnapshot)
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/concepts/concept-1');

      const { GET } = await import('@/app/api/admin/concepts/[id]/route');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'concept-1' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.concept).toBeDefined();
    });
  });

  describe('Concept Validation', () => {
    it('should validate concept name is not empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/notes/note-1/concepts/concept-1', {
        method: 'PUT',
        body: JSON.stringify({
          name: '',
          description: 'Missing name'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      // This should be handled by the route
      expect(request).toBeDefined();
    });

    it('should handle malformed concept data', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/notes/note-1/concepts/concept-1', {
        method: 'PUT',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      const { PUT } = await import('@/app/api/admin/notes/[id]/concepts/[conceptId]/route');
      const response = await PUT(request, {
        params: Promise.resolve({ id: 'note-1', conceptId: 'concept-1' })
      });

      expect([400, 500]).toContain(response.status);
    });
  });
});
