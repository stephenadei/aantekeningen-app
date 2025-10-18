import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the API routes
vi.mock('@/lib/firebase-auth', () => ({
  verifyFirebaseTokenFromCookie: vi.fn(),
  isAuthorizedAdmin: vi.fn(),
}));

vi.mock('@/lib/firestore', () => ({
  getAllStudents: vi.fn(),
  createStudent: vi.fn(),
  getStudent: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  getLoginAudits: vi.fn(),
  createLoginAudit: vi.fn(),
}));

vi.mock('@/lib/security', () => ({
  validateTeacherEmail: vi.fn(),
  sanitizeInput: vi.fn((input) => input),
  generatePin: vi.fn(() => '123456'),
  hashPin: vi.fn(() => Promise.resolve('hashed-pin')),
}));

describe('Admin Portal API Integration', () => {
  const mockAdminUser = {
    uid: 'admin-uid',
    email: 'admin@stephensprivelessen.nl',
    name: 'Admin User',
    picture: 'https://example.com/photo.jpg',
    emailVerified: true,
    customClaims: { role: 'admin' }
  };

  const mockStudent = {
    id: 'test-student-id',
    displayName: 'Test Student',
    pinHash: 'hashed-pin',
    driveFolderId: null,
    driveFolderName: null,
    subject: null,
    folderConfirmed: false,
    folderLinkedAt: null,
    folderConfirmedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    pinUpdatedAt: new Date(),
  };

  const mockLoginAudits = [
    {
      id: 'audit-1',
      who: 'student:Rachel',
      action: 'login_ok',
      ip: '127.0.0.1',
      userAgent: 'test-agent',
      studentId: 'student-id',
      createdAt: new Date(),
      metadata: { studentId: 'student-id' }
    },
    {
      id: 'audit-2',
      who: 'teacher:admin@stephensprivelessen.nl',
      action: 'student_created',
      ip: '127.0.0.1',
      userAgent: 'test-agent',
      createdAt: new Date(),
      metadata: { studentId: 'new-student-id' }
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/students', () => {
    it('should get students list for authorized admin', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getAllStudents } = await import('@/lib/firestore');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getAllStudents).mockResolvedValue([mockStudent]);

      const request = new NextRequest('http://localhost:3000/api/admin/students');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.students).toBeDefined();
      expect(Array.isArray(data.students)).toBe(true);
      expect(data.pagination).toBeDefined();
    });

    it('should reject unauthorized requests', async () => {
      const { verifyFirebaseTokenFromCookie } = await import('@/lib/firebase-auth');
      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: null, error: 'No token' });

      const request = new NextRequest('http://localhost:3000/api/admin/students');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject non-admin users', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const nonAdminUser = { ...mockAdminUser, email: 'student@gmail.com' };

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: nonAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/students');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle search query', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getAllStudents } = await import('@/lib/firestore');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getAllStudents).mockResolvedValue([mockStudent]);

      const request = new NextRequest('http://localhost:3000/api/admin/students?search=test');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle pagination', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getAllStudents } = await import('@/lib/firestore');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getAllStudents).mockResolvedValue([mockStudent]);

      const request = new NextRequest('http://localhost:3000/api/admin/students?page=2&limit=10');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
    });
  });

  describe('POST /api/admin/students', () => {
    it('should create student successfully', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getAllStudents, createStudent, createLoginAudit } = await import('@/lib/firestore');
      const { sanitizeInput, generatePin, hashPin } = await import('@/lib/security');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getAllStudents).mockResolvedValue([]);
      vi.mocked(createStudent).mockResolvedValue('new-student-id');
      vi.mocked(createLoginAudit).mockResolvedValue('audit-id');
      vi.mocked(sanitizeInput).mockReturnValue('New Student');
      vi.mocked(generatePin).mockReturnValue('123456');
      vi.mocked(hashPin).mockResolvedValue('hashed-pin');

      const request = new NextRequest('http://localhost:3000/api/admin/students', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'New Student',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { POST } = await import('@/app/api/admin/students/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.student).toBeDefined();
      expect(data.pin).toBe('123456');
    });

    it('should reject duplicate student names', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getAllStudents } = await import('@/lib/firestore');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getAllStudents).mockResolvedValue([mockStudent]);

      const request = new NextRequest('http://localhost:3000/api/admin/students', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'Test Student', // Duplicate name
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { POST } = await import('@/app/api/admin/students/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Student met deze naam bestaat al');
    });

    it('should validate input data', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/admin/students', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'A', // Too short
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { POST } = await import('@/app/api/admin/students/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input data');
    });
  });

  describe('GET /api/admin/audit', () => {
    it('should get audit logs for authorized admin', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getLoginAudits } = await import('@/lib/firestore');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getLoginAudits).mockResolvedValue(mockLoginAudits);

      const request = new NextRequest('http://localhost:3000/api/admin/audit');

      const { GET } = await import('@/app/api/admin/audit/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.audits).toBeDefined();
      expect(Array.isArray(data.audits)).toBe(true);
    });

    it('should handle audit log filters', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getLoginAudits } = await import('@/lib/firestore');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getLoginAudits).mockResolvedValue(mockLoginAudits);

      const request = new NextRequest('http://localhost:3000/api/admin/audit?action=login_ok&page=1&limit=10');

      const { GET } = await import('@/app/api/admin/audit/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject unauthorized audit access', async () => {
      const { verifyFirebaseTokenFromCookie } = await import('@/lib/firebase-auth');
      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: null, error: 'No token' });

      const request = new NextRequest('http://localhost:3000/api/admin/audit');

      const { GET } = await import('@/app/api/admin/audit/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('PUT /api/admin/students/[id]', () => {
    it('should update student successfully', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getStudent, updateStudent, createLoginAudit } = await import('@/lib/firestore');
      const { sanitizeInput } = await import('@/lib/security');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getStudent).mockResolvedValue(mockStudent);
      vi.mocked(updateStudent).mockResolvedValue('updated-student-id');
      vi.mocked(createLoginAudit).mockResolvedValue('audit-id');
      vi.mocked(sanitizeInput).mockReturnValue('Updated Student');

      const request = new NextRequest('http://localhost:3000/api/admin/students/test-student-id', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: 'Updated Student',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { PUT } = await import('@/app/api/admin/students/[id]/route');
      const response = await PUT(request, { params: Promise.resolve({ id: 'test-student-id' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.student).toBeDefined();
    });

    it('should handle non-existent student update', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getStudent } = await import('@/lib/firestore');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getStudent).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/students/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: 'Updated Student',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { PUT } = await import('@/app/api/admin/students/[id]/route');
      const response = await PUT(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Student not found');
    });
  });

  describe('POST /api/admin/students/[id]/pin-reset', () => {
    it('should reset student PIN successfully', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getStudent, updateStudent, createLoginAudit } = await import('@/lib/firestore');
      const { generatePin, hashPin } = await import('@/lib/security');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getStudent).mockResolvedValue(mockStudent);
      vi.mocked(updateStudent).mockResolvedValue('updated-student-id');
      vi.mocked(createLoginAudit).mockResolvedValue('audit-id');
      vi.mocked(generatePin).mockReturnValue('654321');
      vi.mocked(hashPin).mockResolvedValue('new-hashed-pin');

      const request = new NextRequest('http://localhost:3000/api/admin/students/test-student-id/pin-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { POST } = await import('@/app/api/admin/students/[id]/pin-reset/route');
      const response = await POST(request, { params: Promise.resolve({ id: 'test-student-id' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pin).toBe('654321');
    });

    it('should handle non-existent student PIN reset', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getStudent } = await import('@/lib/firestore');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getStudent).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/students/nonexistent/pin-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { POST } = await import('@/app/api/admin/students/[id]/pin-reset/route');
      const response = await POST(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Student not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getAllStudents } = await import('@/lib/firestore');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getAllStudents).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/students');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch students');
    });

    it('should handle malformed request bodies', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/admin/students', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { POST } = await import('@/app/api/admin/students/route');
      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });
});
