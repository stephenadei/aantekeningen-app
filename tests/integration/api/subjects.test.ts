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

describe('Subjects API Integration', () => {
  const mockSubject = {
    id: 'primair-onderwijs',
    name: 'Primair Onderwijs',
    description: 'Onderwijsmateriaal voor de basisschool',
    color: '#3B82F6',
    icon: 'BookOpen',
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTopic = {
    id: 'topic-1',
    name: 'Rekenen',
    description: 'Topic in Primair Onderwijs',
    sortOrder: 1,
    createdAt: new Date(),
  };

  const mockAdminUser = {
    uid: 'admin-uid',
    email: 'admin@stephensprivelessen.nl',
    name: 'Admin User',
    customClaims: { role: 'admin' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/subjects', () => {
    it('should retrieve all subjects', async () => {
      const { db } = await import('@/lib/firebase-admin');
      
      const mockSnapshot = {
        docs: [
          { id: mockSubject.id, data: () => mockSubject }
        ]
      };

      vi.mocked(db.collection).mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockSnapshot)
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/subjects');
      const { GET } = await import('@/app/api/admin/subjects/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.subjects)).toBe(true);
    });
  });

  describe('POST /api/admin/subjects', () => {
    it('should create a new subject', async () => {
      const { db } = await import('@/lib/firebase-admin');
      
      const mockRef = {
        set: vi.fn().mockResolvedValue(undefined)
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockRef)
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/subjects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Primair Onderwijs',
          description: 'Basis onderwijs',
          color: '#3B82F6',
          icon: 'BookOpen'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const { POST } = await import('@/app/api/admin/subjects/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.subjectId).toBeDefined();
    });

    it('should reject subject without name', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/subjects', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Basis onderwijs'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const { POST } = await import('@/app/api/admin/subjects/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('PUT /api/admin/subjects/[subjectId]', () => {
    it('should update subject', async () => {
      const { db } = await import('@/lib/firebase-admin');
      
      const mockRef = {
        update: vi.fn().mockResolvedValue(undefined)
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockRef)
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/subjects/primair-onderwijs', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Subject',
          sortOrder: 2
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const { PUT } = await import('@/app/api/admin/subjects/[subjectId]/route');
      const response = await PUT(request, { params: Promise.resolve({ subjectId: 'primair-onderwijs' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('DELETE /api/admin/subjects/[subjectId]', () => {
    it('should delete subject with all topics', async () => {
      const { db } = await import('@/lib/firebase-admin');
      
      const mockTopicsSnapshot = {
        docs: [
          { ref: { delete: vi.fn().mockResolvedValue(undefined) } }
        ]
      };

      const mockSubjectRef = {
        collection: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockTopicsSnapshot)
        }),
        delete: vi.fn().mockResolvedValue(undefined)
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockSubjectRef)
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/subjects/primair-onderwijs', {
        method: 'DELETE'
      });

      const { DELETE } = await import('@/app/api/admin/subjects/[subjectId]/route');
      const response = await DELETE(request, { params: Promise.resolve({ subjectId: 'primair-onderwijs' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Topics API', () => {
    describe('GET /api/admin/subjects/[subjectId]/topics', () => {
      it('should get topics for subject', async () => {
        const { db } = await import('@/lib/firebase-admin');
        
        const mockSnapshot = {
          docs: [
            { id: mockTopic.id, data: () => mockTopic }
          ]
        };

        const mockSubjectRef = {
          collection: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(mockSnapshot)
            })
          })
        };

        vi.mocked(db.collection).mockReturnValue({
          doc: vi.fn().mockReturnValue(mockSubjectRef)
        } as any);

        const request = new NextRequest('http://localhost:3000/api/admin/subjects/primair-onderwijs/topics');

        const { GET } = await import('@/app/api/admin/subjects/[subjectId]/topics/route');
        const response = await GET(request, { params: Promise.resolve({ subjectId: 'primair-onderwijs' }) });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.topics)).toBe(true);
      });
    });

    describe('POST /api/admin/subjects/[subjectId]/topics', () => {
      it('should create new topic', async () => {
        const { db } = await import('@/lib/firebase-admin');
        
        const mockTopicRef = {
          set: vi.fn().mockResolvedValue(undefined)
        };

        const mockSubjectRef = {
          collection: vi.fn().mockReturnValue({
            doc: vi.fn().mockReturnValue(mockTopicRef)
          })
        };

        vi.mocked(db.collection).mockReturnValue({
          doc: vi.fn().mockReturnValue(mockSubjectRef)
        } as any);

        const request = new NextRequest('http://localhost:3000/api/admin/subjects/primair-onderwijs/topics', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Rekenen',
            description: 'Rekenen voor basis'
          }),
          headers: { 'Content-Type': 'application/json' }
        });

        const { POST } = await import('@/app/api/admin/subjects/[subjectId]/topics/route');
        const response = await POST(request, { params: Promise.resolve({ subjectId: 'primair-onderwijs' }) });
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.topicId).toBeDefined();
      });
    });
  });
});
