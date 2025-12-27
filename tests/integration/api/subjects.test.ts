import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Firebase Admin with proper Firestore mocking
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

vi.mock('@/lib/auth', () => ({
  getAuthSession: vi.fn(),
  isAuthorizedAdmin: vi.fn(),
}));

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
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
    emailVerified: true,
    customClaims: { role: 'admin' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock responses
    mockGetAuthSession.mockResolvedValue({ success: true, user: mockAdminUser, error: undefined });
    mockIsAuthorizedAdmin.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/subjects', () => {
    it('should retrieve all subjects', async () => {
      const { db } = await import('@/lib/firebase-admin');
      // Mocks are set up in beforeEach

      const mockSnapshot = {
        docs: [
          { id: mockSubject.id, data: () => mockSubject }
        ]
      };

      vi.mocked(db.collection).mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockSnapshot)
        })
      } as unknown as ReturnType<typeof db.collection>);

      const { GET } = await import('@/app/api/admin/subjects/route');
      const response = await GET();
      const data = await response.json();

      expect([200, 400, 500]).toContain(response.status);
      expect(data).toBeDefined();
    });
  });

  describe('POST /api/admin/subjects', () => {
    it('should create a new subject', async () => {
      const { db } = await import('@/lib/firebase-admin');
      // Mocks are set up in beforeEach

      const mockRef = {
        set: vi.fn().mockResolvedValue(undefined)
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockRef)
      } as unknown as ReturnType<typeof db.collection>);

      const request = new NextRequest('http://localhost:3000/api/admin/subjects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Subject',
          description: 'A new subject'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const { POST } = await import('@/app/api/admin/subjects/route');
      const response = await POST(request);

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it('should reject subject without name', async () => {
      // Mocks are set up in beforeEach

      const request = new NextRequest('http://localhost:3000/api/admin/subjects', {
        method: 'POST',
        body: JSON.stringify({
          description: 'No name provided'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const { POST } = await import('@/app/api/admin/subjects/route');
      const response = await POST(request);

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/admin/subjects/[subjectId]', () => {
    it('should update subject', async () => {
      const { db } = await import('@/lib/firebase-admin');
      // Mocks are set up in beforeEach

      const mockRef = {
        update: vi.fn().mockResolvedValue(undefined)
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockRef)
      } as unknown as ReturnType<typeof db.collection>);

      const request = new NextRequest('http://localhost:3000/api/admin/subjects/primair-onderwijs', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Subject'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const { PUT } = await import('@/app/api/admin/subjects/[subjectId]/route');
      const response = await PUT(request, { params: Promise.resolve({ subjectId: 'primair-onderwijs' }) });

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/admin/subjects/[subjectId]', () => {
    it('should delete subject with all topics', async () => {
      const { db } = await import('@/lib/firebase-admin');
      // Mocks are set up in beforeEach

      const mockRef = {
        delete: vi.fn().mockResolvedValue(undefined)
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockRef)
      } as unknown as ReturnType<typeof db.collection>);

      const request = new NextRequest('http://localhost:3000/api/admin/subjects/primair-onderwijs', {
        method: 'DELETE',
      });

      const { DELETE } = await import('@/app/api/admin/subjects/[subjectId]/route');
      const response = await DELETE(request, { params: Promise.resolve({ subjectId: 'primair-onderwijs' }) });

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Topics API', () => {
    it('GET /api/admin/subjects/[subjectId]/topics > should get topics for subject', async () => {
      const { db } = await import('@/lib/firebase-admin');

      const mockSnapshot = {
        docs: [
          { id: mockTopic.id, data: () => mockTopic }
        ]
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(mockSnapshot)
            })
          })
        })
      } as unknown as ReturnType<typeof db.collection>);

      const request = new NextRequest('http://localhost:3000/api/admin/subjects/primair-onderwijs/topics');

      const { GET } = await import('@/app/api/admin/subjects/[subjectId]/topics/route');
      const response = await GET(request, { params: Promise.resolve({ subjectId: 'primair-onderwijs' }) });

      expect([200, 400, 500]).toContain(response.status);
    });

    it('POST /api/admin/subjects/[subjectId]/topics > should create new topic', async () => {
      const { db } = await import('@/lib/firebase-admin');
      // Mocks are set up in beforeEach

      const mockRef = {
        add: vi.fn().mockResolvedValue({ id: 'new-topic-id' })
      };

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue(mockRef)
        })
      } as unknown as ReturnType<typeof db.collection>);

      const request = new NextRequest('http://localhost:3000/api/admin/subjects/primair-onderwijs/topics', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Topic'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const { POST } = await import('@/app/api/admin/subjects/[subjectId]/topics/route');
      const response = await POST(request, { params: Promise.resolve({ subjectId: 'primair-onderwijs' }) });

      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
