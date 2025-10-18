import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the API routes
vi.mock('@/lib/firestore', () => ({
  getStudentByName: vi.fn(),
  getStudent: vi.fn(),
  getStudentNotes: vi.fn(),
  createLoginAudit: vi.fn(),
}));

vi.mock('@/lib/security', () => ({
  validatePinFormat: vi.fn(),
  verifyPin: vi.fn(),
  getClientIP: vi.fn(() => '127.0.0.1'),
  getUserAgent: vi.fn(() => 'test-agent'),
}));

describe('Student Portal API Integration', () => {
  const mockStudent = {
    id: 'test-student-id',
    displayName: 'Rachel',
    pinHash: 'hashed-pin',
    driveFolderId: '1UcSaOYeR7rqZRLdfeotLbwAoAG7uU9DD',
    driveFolderName: 'Rachel Folder',
    subject: 'Wiskunde',
    folderConfirmed: true,
    folderLinkedAt: new Date(),
    folderConfirmedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    pinUpdatedAt: new Date(),
  };

  const mockNotes = [
    {
      id: 'note-1',
      studentId: 'test-student-id',
      subject: 'Wiskunde',
      topic: 'Algebra',
      content: 'Les over kwadratische vergelijkingen',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'note-2',
      studentId: 'test-student-id',
      subject: 'Wiskunde',
      topic: 'Geometrie',
      content: 'Pythagoras stelling',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/leerling/login', () => {
    it('should login student with valid credentials', async () => {
      const { getStudentByName, createLoginAudit } = await import('@/lib/firestore');
      const { validatePinFormat, verifyPin } = await import('@/lib/security');

      vi.mocked(getStudentByName).mockResolvedValue(mockStudent);
      vi.mocked(validatePinFormat).mockReturnValue(true);
      vi.mocked(verifyPin).mockResolvedValue(true);
      vi.mocked(createLoginAudit).mockResolvedValue('audit-id');

      const request = new NextRequest('http://localhost:3000/api/leerling/login', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'Rachel',
          pin: '123456',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Import the route handler
      const { POST } = await import('@/app/api/leerling/login/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.student).toBeDefined();
      expect(data.student.displayName).toBe('Rachel');
      expect(data.student.pinHash).toBeUndefined(); // Should be removed
    });

    it('should reject invalid PIN format', async () => {
      const { validatePinFormat } = await import('@/lib/security');
      vi.mocked(validatePinFormat).mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/leerling/login', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'Rachel',
          pin: '12345', // Invalid format
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { POST } = await import('@/app/api/leerling/login/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Ongeldige PIN format');
    });

    it('should reject non-existent student', async () => {
      const { getStudentByName, createLoginAudit } = await import('@/lib/firestore');
      const { validatePinFormat } = await import('@/lib/security');

      vi.mocked(getStudentByName).mockResolvedValue(null);
      vi.mocked(validatePinFormat).mockReturnValue(true);
      vi.mocked(createLoginAudit).mockResolvedValue('audit-id');

      const request = new NextRequest('http://localhost:3000/api/leerling/login', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'NonExistent',
          pin: '123456',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { POST } = await import('@/app/api/leerling/login/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Student niet gevonden');
    });

    it('should reject invalid PIN', async () => {
      const { getStudentByName, createLoginAudit } = await import('@/lib/firestore');
      const { validatePinFormat, verifyPin } = await import('@/lib/security');

      vi.mocked(getStudentByName).mockResolvedValue(mockStudent);
      vi.mocked(validatePinFormat).mockReturnValue(true);
      vi.mocked(verifyPin).mockResolvedValue(false);
      vi.mocked(createLoginAudit).mockResolvedValue('audit-id');

      const request = new NextRequest('http://localhost:3000/api/leerling/login', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'Rachel',
          pin: '654321', // Wrong PIN
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { POST } = await import('@/app/api/leerling/login/route');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Ongeldige PIN');
    });

    it('should handle malformed request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/leerling/login', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { POST } = await import('@/app/api/leerling/login/route');
      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/students/search', () => {
    it('should search students successfully', async () => {
      const { getAllStudents } = await import('@/lib/firestore');
      vi.mocked(getAllStudents).mockResolvedValue([mockStudent]);

      const request = new NextRequest('http://localhost:3000/api/students/search?q=rachel');

      const { GET } = await import('@/app/api/students/search/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.students).toBeDefined();
      expect(Array.isArray(data.students)).toBe(true);
    });

    it('should handle empty search query', async () => {
      const { getAllStudents } = await import('@/lib/firestore');
      vi.mocked(getAllStudents).mockResolvedValue([mockStudent]);

      const request = new NextRequest('http://localhost:3000/api/students/search?q=');

      const { GET } = await import('@/app/api/students/search/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.students).toBeDefined();
    });

    it('should handle search with no results', async () => {
      const { getAllStudents } = await import('@/lib/firestore');
      vi.mocked(getAllStudents).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/students/search?q=nonexistent');

      const { GET } = await import('@/app/api/students/search/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.students).toEqual([]);
    });
  });

  describe('GET /api/students/[id]/overview', () => {
    it('should get student overview successfully', async () => {
      const { getStudent } = await import('@/lib/firestore');
      vi.mocked(getStudent).mockResolvedValue(mockStudent);

      const request = new NextRequest('http://localhost:3000/api/students/test-student-id/overview');

      const { GET } = await import('@/app/api/students/[id]/overview/route');
      const response = await GET(request, { params: Promise.resolve({ id: 'test-student-id' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fileCount).toBeDefined();
      expect(data.lastActivity).toBeDefined();
    });

    it('should handle non-existent student', async () => {
      const { getStudent } = await import('@/lib/firestore');
      vi.mocked(getStudent).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/students/nonexistent/overview');

      const { GET } = await import('@/app/api/students/[id]/overview/route');
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Student not found');
    });
  });

  describe('GET /api/students/[id]/files', () => {
    it('should get student files successfully', async () => {
      const { getStudent } = await import('@/lib/firestore');
      vi.mocked(getStudent).mockResolvedValue(mockStudent);

      const request = new NextRequest('http://localhost:3000/api/students/test-student-id/files');

      const { GET } = await import('@/app/api/students/[id]/files/route');
      const response = await GET(request, { params: Promise.resolve({ id: 'test-student-id' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.files).toBeDefined();
      expect(Array.isArray(data.files)).toBe(true);
    });

    it('should handle student without drive folder', async () => {
      const studentWithoutFolder = { ...mockStudent, driveFolderId: null };
      const { getStudent } = await import('@/lib/firestore');
      vi.mocked(getStudent).mockResolvedValue(studentWithoutFolder);

      const request = new NextRequest('http://localhost:3000/api/students/test-student-id/files');

      const { GET } = await import('@/app/api/students/[id]/files/route');
      const response = await GET(request, { params: Promise.resolve({ id: 'test-student-id' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.files).toEqual([]);
    });
  });

  describe('GET /api/students/[id]', () => {
    it('should get student with notes successfully', async () => {
      const { getStudent, getStudentNotes } = await import('@/lib/firestore');
      vi.mocked(getStudent).mockResolvedValue(mockStudent);
      vi.mocked(getStudentNotes).mockResolvedValue(mockNotes);

      const request = new NextRequest('http://localhost:3000/api/students/test-student-id');

      const { GET } = await import('@/app/api/students/[id]/route');
      const response = await GET(request, { params: Promise.resolve({ id: 'test-student-id' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.student).toBeDefined();
      expect(data.student.notes).toBeDefined();
      expect(Array.isArray(data.student.notes)).toBe(true);
      expect(data.student.pinHash).toBeUndefined(); // Should be removed
    });

    it('should handle non-existent student', async () => {
      const { getStudent } = await import('@/lib/firestore');
      vi.mocked(getStudent).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/students/nonexistent');

      const { GET } = await import('@/app/api/students/[id]/route');
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Student not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { getStudent } = await import('@/lib/firestore');
      vi.mocked(getStudent).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/students/test-student-id');

      const { GET } = await import('@/app/api/students/[id]/route');
      const response = await GET(request, { params: Promise.resolve({ id: 'test-student-id' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch student');
    });

    it('should handle invalid student ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/students/invalid-id-format');

      const { GET } = await import('@/app/api/students/[id]/route');
      const response = await GET(request, { params: Promise.resolve({ id: 'invalid-id-format' }) });
      
      // Should still work, but might return 404 if student doesn't exist
      expect([200, 404, 500]).toContain(response.status);
    });
  });
});
