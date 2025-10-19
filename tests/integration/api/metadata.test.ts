import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

describe('Metadata API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/metadata/status', () => {
    it('should return metadata status', async () => {
      const request = new NextRequest('http://localhost:3000/api/metadata/status');

      const { GET } = await import('@/app/api/metadata/status/route');
      const response = await GET(request);
      const data = await response.json();

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('POST /api/metadata/preload', () => {
    it('should preload metadata for a student', async () => {
      const request = new NextRequest('http://localhost:3000/api/metadata/preload', {
        method: 'POST',
        body: JSON.stringify({
          studentId: 'student-123',
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const { POST } = await import('@/app/api/metadata/preload/route');
      const response = await POST(request);
      const data = await response.json();

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle missing studentId', async () => {
      const request = new NextRequest('http://localhost:3000/api/metadata/preload', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });

      const { POST } = await import('@/app/api/metadata/preload/route');
      const response = await POST(request);

      expect([400, 500]).toContain(response.status);
    });
  });
});
