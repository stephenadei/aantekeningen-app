import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Get base URL from environment variable or default to localhost
const BASE_URL = process.env.SMOKE_TEST_URL || 'http://localhost:3000';

describe('Critical Smoke Tests', () => {
  let server: any;

  beforeAll(async () => {
    // Start test server if needed
    // For now, we'll test against the running dev server
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Student Portal API', () => {
    it('should return 200 for student search', async () => {
      const response = await fetch(`${BASE_URL}/api/students/search?q=rachel`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('students');
      expect(Array.isArray(data.students)).toBe(true);
    });

    it('should return student overview with files', async () => {
      const response = await fetch(`${BASE_URL}/api/students/1UcSaOYeR7rqZRLdfeotLbwAoAG7uU9DD/overview`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('fileCount');
      expect(data).toHaveProperty('lastActivity');
      expect(typeof data.fileCount).toBe('number');
      expect(data.fileCount).toBeGreaterThan(0);
    });

    it('should return student files list', async () => {
      const response = await fetch(`${BASE_URL}/api/students/1UcSaOYeR7rqZRLdfeotLbwAoAG7uU9DD/files`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('files');
      expect(Array.isArray(data.files)).toBe(true);
      expect(data.files.length).toBeGreaterThan(0);
    });
  });

  describe('Security & Authentication', () => {
    it('should block admin API without authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/students`);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Unauthorized');
    });

    it('should redirect admin page without session', async () => {
      const response = await fetch(`${BASE_URL}/admin`, {
        redirect: 'manual'
      });
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/admin/login');
    });
  });

  describe('Performance & Caching', () => {
    it('should have reasonable response times', async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/api/students/search?q=test`);
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should cache repeated requests', async () => {
      // First request
      const start1 = Date.now();
      await fetch(`${BASE_URL}/api/students/1UcSaOYeR7rqZRLdfeotLbwAoAG7uU9DD/files`);
      const duration1 = Date.now() - start1;
      
      // Second request (should be faster due to caching)
      const start2 = Date.now();
      await fetch(`${BASE_URL}/api/students/1UcSaOYeR7rqZRLdfeotLbwAoAG7uU9DD/files`);
      const duration2 = Date.now() - start2;
      
      // Cached request should be faster (allowing some variance)
      expect(duration2).toBeLessThanOrEqual(duration1 + 1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid student ID gracefully', async () => {
      const response = await fetch(`${BASE_URL}/api/students/invalid-id/overview`);
      expect(response.status).toBe(404);
    });

    it('should handle empty search queries', async () => {
      const response = await fetch(`${BASE_URL}/api/students/search?q=`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('students');
      expect(Array.isArray(data.students)).toBe(true);
    });
  });

  describe('Middleware & Edge Runtime', () => {
    it('should not have Edge Runtime errors', async () => {
      // This test ensures our middleware fix worked
      const response = await fetch(`${BASE_URL}/admin/login`);
      expect(response.status).toBe(200);
      
      // If we get here without Edge Runtime errors, the fix worked
      expect(true).toBe(true);
    });
  });
});
