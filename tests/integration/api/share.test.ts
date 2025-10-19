import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Firebase and security modules
vi.mock('@/lib/firestore', () => ({
  getStudent: vi.fn(),
}));

vi.mock('@/lib/security', () => ({
  sanitizeInput: vi.fn((input) => input),
}));

describe('Share API Integration', () => {
  const mockStudent = {
    id: 'student-123',
    displayName: 'Rachel',
    driveFolderId: 'drive-folder-123',
    subject: 'Wiskunde',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/students/[id]/share', () => {
    it('should generate shareable link for student', async () => {
      const { getStudent } = await import('@/lib/firestore');
      vi.mocked(getStudent).mockResolvedValue(mockStudent);

      const request = new NextRequest('http://localhost:3000/api/students/student-123/share');

      const { GET } = await import('@/app/api/students/[id]/share/route');
      const response = await GET(request, { params: Promise.resolve({ id: 'student-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.shareLink).toBeDefined();
      expect(data.shareLink).toContain('student-123');
    });

    it('should include student details in response', async () => {
      const { getStudent } = await import('@/lib/firestore');
      vi.mocked(getStudent).mockResolvedValue(mockStudent);

      const request = new NextRequest('http://localhost:3000/api/students/student-123/share');

      const { GET } = await import('@/app/api/students/[id]/share/route');
      const response = await GET(request, { params: Promise.resolve({ id: 'student-123' }) });
      const data = await response.json();

      expect(data.displayName).toBe('Rachel');
      expect(data.driveFolderId).toBe('drive-folder-123');
    });

    it('should handle non-existent student', async () => {
      const { getStudent } = await import('@/lib/firestore');
      vi.mocked(getStudent).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/students/nonexistent/share');

      const { GET } = await import('@/app/api/students/[id]/share/route');
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      const { getStudent } = await import('@/lib/firestore');
      vi.mocked(getStudent).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/students/student-123/share');

      const { GET } = await import('@/app/api/students/[id]/share/route');
      const response = await GET(request, { params: Promise.resolve({ id: 'student-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should validate student ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/students/invalid/share');

      const { GET } = await import('@/app/api/students/[id]/share/route');
      const response = await GET(request, { params: Promise.resolve({ id: 'invalid' }) });

      // Should return 404 or 500 depending on validation
      expect([404, 500]).toContain(response.status);
    });
  });
});
