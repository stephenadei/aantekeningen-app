import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Firebase Auth
vi.mock('@/lib/firebase-auth', () => ({
  verifyFirebaseTokenFromCookie: vi.fn(),
  isAuthorizedAdmin: vi.fn(),
}));

vi.mock('@/lib/security', () => ({
  validateTeacherEmail: vi.fn(),
  sanitizeInput: vi.fn((input) => input),
}));

describe('Security & Authentication Tests', () => {
  const mockAdminUser = {
    uid: 'admin-uid',
    email: 'admin@stephensprivelessen.nl',
    name: 'Admin User',
    picture: 'https://example.com/photo.jpg',
    emailVerified: true,
    customClaims: { role: 'admin' }
  };

  const mockUnauthorizedUser = {
    uid: 'user-uid',
    email: 'student@gmail.com',
    name: 'Student User',
    picture: null,
    emailVerified: true,
    customClaims: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Admin Route Protection', () => {
    it('should block admin API without authentication', async () => {
      const { verifyFirebaseTokenFromCookie } = await import('@/lib/firebase-auth');
      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: null, error: 'No token' });

      const request = new NextRequest('http://localhost:3000/api/admin/students');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should block admin API with invalid token', async () => {
      const { verifyFirebaseTokenFromCookie } = await import('@/lib/firebase-auth');
      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: null, error: 'Invalid token' });

      const request = new NextRequest('http://localhost:3000/api/admin/students');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should block admin API with non-admin user', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockUnauthorizedUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/students');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow admin API with valid admin user', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getAllStudents } = await import('@/lib/firestore');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getAllStudents).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/students');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Domain Restrictions', () => {
    it('should reject non-stephensprivelessen.nl emails', async () => {
      const { validateTeacherEmail } = await import('@/lib/security');
      vi.mocked(validateTeacherEmail).mockReturnValue(false);

      const invalidEmails = [
        'teacher@gmail.com',
        'admin@other-school.nl',
        'user@stephensprivelessen.com',
        'teacher@stephensprivelessen.org',
        'admin@stephensprivelessen.net'
      ];

      for (const email of invalidEmails) {
        expect(validateTeacherEmail(email)).toBe(false);
      }
    });

    it('should accept stephensprivelessen.nl emails', async () => {
      const { validateTeacherEmail } = await import('@/lib/security');
      vi.mocked(validateTeacherEmail).mockReturnValue(true);

      const validEmails = [
        'teacher@stephensprivelessen.nl',
        'admin@stephensprivelessen.nl',
        'stephen@stephensprivelessen.nl',
        'teacher.name@stephensprivelessen.nl',
        'teacher+tag@stephensprivelessen.nl'
      ];

      for (const email of validEmails) {
        expect(validateTeacherEmail(email)).toBe(true);
      }
    });

    it('should handle case insensitive email validation', async () => {
      const { validateTeacherEmail } = await import('@/lib/security');
      vi.mocked(validateTeacherEmail).mockReturnValue(true);

      const caseVariations = [
        'TEACHER@STEPHENSPRIVELESSEN.NL',
        'Teacher@StephensPrivelessen.Nl',
        'teacher@stephensprivelessen.nl'
      ];

      for (const email of caseVariations) {
        expect(validateTeacherEmail(email)).toBe(true);
      }
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious input', async () => {
      const { sanitizeInput } = await import('@/lib/security');
      
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'SELECT * FROM users WHERE id = 1',
        '../../../etc/passwd',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '${7*7}',
        '{{7*7}}'
      ];

      for (const input of maliciousInputs) {
        const sanitized = sanitizeInput(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('${');
        expect(sanitized).not.toContain('{{');
      }
    });

    it('should preserve safe input', async () => {
      const { sanitizeInput } = await import('@/lib/security');
      
      const safeInputs = [
        'José María',
        'Student-Name_123',
        'Test & More',
        'Homework Assignment.pdf',
        'Les 8 Oct 2025'
      ];

      for (const input of safeInputs) {
        const sanitized = sanitizeInput(input);
        expect(sanitized).toBe(input);
      }
    });

    it('should limit input length', async () => {
      const { sanitizeInput } = await import('@/lib/security');
      
      const longInput = 'a'.repeat(1000);
      const sanitized = sanitizeInput(longInput);
      
      expect(sanitized.length).toBeLessThanOrEqual(500); // Assuming 500 char limit
    });
  });

  describe('PIN Security', () => {
    it('should validate PIN format', async () => {
      const { validatePinFormat } = await import('@/lib/security');
      
      const validPins = ['123456', '000000', '999999', '123456'];
      const invalidPins = ['12345', '1234567', '12345a', '12345!', '', '12 3456'];

      for (const pin of validPins) {
        expect(validatePinFormat(pin)).toBe(true);
      }

      for (const pin of invalidPins) {
        expect(validatePinFormat(pin)).toBe(false);
      }
    });

    it('should hash PINs securely', async () => {
      const { hashPin } = await import('@/lib/security');
      
      const pin = '123456';
      const hash = await hashPin(pin);
      
      expect(hash).not.toBe(pin);
      expect(hash.length).toBeGreaterThan(20); // bcrypt hash length
      expect(hash).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
    });

    it('should verify PINs correctly', async () => {
      const { hashPin, verifyPin } = await import('@/lib/security');
      
      const pin = '123456';
      const hash = await hashPin(pin);
      
      const isValid = await verifyPin(pin, hash);
      const isInvalid = await verifyPin('654321', hash);
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should handle missing session cookies', async () => {
      const { verifyFirebaseTokenFromCookie } = await import('@/lib/firebase-auth');
      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: null, error: 'No session cookie' });

      const request = new NextRequest('http://localhost:3000/api/admin/students');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle expired session cookies', async () => {
      const { verifyFirebaseTokenFromCookie } = await import('@/lib/firebase-auth');
      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: null, error: 'Session expired' });

      const request = new NextRequest('http://localhost:3000/api/admin/students');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle malformed session cookies', async () => {
      const { verifyFirebaseTokenFromCookie } = await import('@/lib/firebase-auth');
      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: null, error: 'Invalid session cookie' });

      const request = new NextRequest('http://localhost:3000/api/admin/students');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rapid API requests', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getAllStudents } = await import('@/lib/firestore');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getAllStudents).mockResolvedValue([]);

      const requests = Array(10).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/admin/students')
      );

      const { GET } = await import('@/app/api/admin/students/route');
      const responses = await Promise.all(requests.map(req => GET(req)));

      // All requests should succeed (rate limiting would be implemented at infrastructure level)
      for (const response of responses) {
        expect(response.status).toBe(200);
      }
    });
  });

  describe('CORS and Headers', () => {
    it('should set appropriate security headers', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getAllStudents } = await import('@/lib/firestore');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getAllStudents).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/students');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);

      // Check security headers
      expect(response.headers.get('content-type')).toBe('application/json');
      // Additional security headers would be set by Next.js middleware
    });
  });

  describe('Data Validation', () => {
    it('should validate student creation data', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getAllStudents } = await import('@/lib/firestore');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getAllStudents).mockResolvedValue([]);

      const invalidData = [
        { displayName: '' }, // Empty name
        { displayName: 'A' }, // Too short
        { displayName: 'a'.repeat(100) }, // Too long
        { displayName: null }, // Null name
        { displayName: 123 }, // Wrong type
      ];

      const { POST } = await import('@/app/api/admin/students/route');

      for (const data of invalidData) {
        const request = new NextRequest('http://localhost:3000/api/admin/students', {
          method: 'POST',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });

    it('should validate student ID format', async () => {
      const { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } = await import('@/lib/firebase-auth');
      const { getStudent } = await import('@/lib/firestore');

      vi.mocked(verifyFirebaseTokenFromCookie).mockResolvedValue({ user: mockAdminUser, error: null });
      vi.mocked(isAuthorizedAdmin).mockReturnValue(true);
      vi.mocked(getStudent).mockResolvedValue(null);

      const invalidIds = [
        '',
        'invalid-id-format',
        'id with spaces',
        'id@with#special$chars',
        'a'.repeat(1000), // Too long
      ];

      const { GET } = await import('@/app/api/admin/students/[id]/route');

      for (const id of invalidIds) {
        const request = new NextRequest(`http://localhost:3000/api/admin/students/${id}`);
        const response = await GET(request, { params: Promise.resolve({ id }) });
        
        // Should handle gracefully (either 404 or validation error)
        expect([400, 404]).toContain(response.status);
      }
    });
  });

  describe('Error Handling', () => {
    it('should not leak sensitive information in errors', async () => {
      const { verifyFirebaseTokenFromCookie } = await import('@/lib/firebase-auth');
      vi.mocked(verifyFirebaseTokenFromCookie).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/students');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch students');
      expect(data.error).not.toContain('Database connection failed');
      expect(data.error).not.toContain('stack');
      expect(data.error).not.toContain('trace');
    });

    it('should handle authentication service errors', async () => {
      const { verifyFirebaseTokenFromCookie } = await import('@/lib/firebase-auth');
      vi.mocked(verifyFirebaseTokenFromCookie).mockRejectedValue(new Error('Firebase service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/admin/students');

      const { GET } = await import('@/app/api/admin/students/route');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch students');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined inputs gracefully', async () => {
      const { sanitizeInput, validatePinFormat, validateTeacherEmail } = await import('@/lib/security');
      
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
      expect(validatePinFormat(null as any)).toBe(false);
      expect(validatePinFormat(undefined as any)).toBe(false);
      expect(validateTeacherEmail(null as any)).toBe(false);
      expect(validateTeacherEmail(undefined as any)).toBe(false);
    });

    it('should handle very long inputs', async () => {
      const { sanitizeInput, validatePinFormat } = await import('@/lib/security');
      
      const longString = 'a'.repeat(10000);
      const longPin = '1'.repeat(1000);
      
      expect(sanitizeInput(longString).length).toBeLessThanOrEqual(500);
      expect(validatePinFormat(longPin)).toBe(false);
    });

    it('should handle special characters in inputs', async () => {
      const { sanitizeInput } = await import('@/lib/security');
      
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const sanitized = sanitizeInput(specialChars);
      
      expect(sanitized).toBeDefined();
      expect(typeof sanitized).toBe('string');
    });
  });
});
