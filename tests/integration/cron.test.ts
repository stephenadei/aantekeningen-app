import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock background sync service
vi.mock('@/lib/background-sync', () => ({
  backgroundSyncService: {
    syncAllStudents: vi.fn().mockResolvedValue({ processed: 10 }),
  },
}));

describe('Cron Jobs Integration', () => {
  const cronSecret = 'test-cron-secret-123';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = cronSecret;
  });

  describe('GET /api/cron/sync-cache', () => {
    it('should sync cache with valid cron secret', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/sync-cache', {
        headers: {
          'Authorization': `Bearer ${cronSecret}`
        }
      });

      const { GET } = await import('@/app/api/cron/sync-cache/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject requests without cron secret', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/sync-cache');

      const { GET } = await import('@/app/api/cron/sync-cache/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid cron secret', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/sync-cache', {
        headers: {
          'Authorization': 'Bearer invalid-secret'
        }
      });

      const { GET } = await import('@/app/api/cron/sync-cache/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return sync statistics', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/sync-cache', {
        headers: {
          'Authorization': `Bearer ${cronSecret}`
        }
      });

      const { GET } = await import('@/app/api/cron/sync-cache/route');
      const response = await GET(request);
      const data = await response.json();

      expect(data.processed).toBeDefined();
      expect(typeof data.processed).toBe('number');
    });

    it('should include timestamp in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/sync-cache', {
        headers: {
          'Authorization': `Bearer ${cronSecret}`
        }
      });

      const { GET } = await import('@/app/api/cron/sync-cache/route');
      const response = await GET(request);
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe('string');
    });
  });

  describe('GET /api/cron/sync-folders', () => {
    it('should sync folders with valid cron secret', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/sync-folders', {
        headers: {
          'Authorization': `Bearer ${cronSecret}`
        }
      });

      const { GET } = await import('@/app/api/cron/sync-folders/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject unauthorized folder sync', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/sync-folders');

      const { GET } = await import('@/app/api/cron/sync-folders/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should handle missing CRON_SECRET configuration', async () => {
      delete process.env.CRON_SECRET;

      const request = new NextRequest('http://localhost:3000/api/cron/sync-folders', {
        headers: {
          'Authorization': 'Bearer any-secret'
        }
      });

      const { GET } = await import('@/app/api/cron/sync-folders/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle sync errors gracefully', async () => {
      const { backgroundSyncService } = await import('@/lib/background-sync');
      vi.mocked(backgroundSyncService.syncAllStudents).mockRejectedValueOnce(
        new Error('Sync failed')
      );

      const request = new NextRequest('http://localhost:3000/api/cron/sync-folders', {
        headers: {
          'Authorization': `Bearer ${cronSecret}`
        }
      });

      const { GET } = await import('@/app/api/cron/sync-folders/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('Cron Security', () => {
    it('should only accept Bearer token format', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/sync-cache', {
        headers: {
          'Authorization': `Basic ${cronSecret}`
        }
      });

      const { GET } = await import('@/app/api/cron/sync-cache/route');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should be case-sensitive for cron secret', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/sync-cache', {
        headers: {
          'Authorization': `Bearer ${cronSecret.toUpperCase()}`
        }
      });

      const { GET } = await import('@/app/api/cron/sync-cache/route');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should handle missing Authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/sync-cache');

      const { GET } = await import('@/app/api/cron/sync-cache/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});
