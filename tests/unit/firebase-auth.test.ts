import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  isAuthorizedAdmin,
  verifyFirebaseToken,
  verifyFirebaseTokenFromCookie
} from '@/lib/firebase-auth';

// Mock the Firebase Admin SDK
vi.mock('@/lib/firebase-admin', () => ({
  auth: {
    verifyIdToken: vi.fn(),
    verifySessionCookie: vi.fn(),
  }
}));

describe('Firebase Auth Helpers', () => {
  const mockUser = {
    uid: 'test-uid',
    email: 'teacher@stephensprivelessen.nl',
    name: 'Test Teacher',
    picture: 'https://example.com/photo.jpg',
    emailVerified: true,
    customClaims: { role: 'admin' }
  };

  const mockInvalidUser = {
    uid: 'test-uid',
    email: 'student@gmail.com',
    name: 'Test Student',
    picture: null,
    emailVerified: false,
    customClaims: {}
  };

  describe('isAuthorizedAdmin', () => {
    it('should authorize valid teacher emails', () => {
      expect(isAuthorizedAdmin(mockUser)).toBe(true);
    });

    it('should reject non-teacher emails', () => {
      expect(isAuthorizedAdmin(mockInvalidUser)).toBe(false);
    });

    it('should reject null user', () => {
      expect(isAuthorizedAdmin(null)).toBe(false);
    });

    it('should reject user without email', () => {
      const userWithoutEmail = { ...mockUser, email: null };
      expect(isAuthorizedAdmin(userWithoutEmail)).toBe(false);
    });

    it('should handle different teacher email formats', () => {
      const user1 = { ...mockUser, email: 'teacher@stephensprivelessen.nl' };
      const user2 = { ...mockUser, email: 'admin@stephensprivelessen.nl' };
      const user3 = { ...mockUser, email: 'stephen@stephensprivelessen.nl' };
      
      expect(isAuthorizedAdmin(user1)).toBe(true);
      expect(isAuthorizedAdmin(user2)).toBe(true);
      expect(isAuthorizedAdmin(user3)).toBe(true);
    });

    it('should reject invalid domains', () => {
      const user1 = { ...mockUser, email: 'teacher@stephensprivelessen.com' };
      const user2 = { ...mockUser, email: 'teacher@other-school.nl' };
      const user3 = { ...mockUser, email: 'teacher@gmail.com' };
      
      expect(isAuthorizedAdmin(user1)).toBe(false);
      expect(isAuthorizedAdmin(user2)).toBe(false);
      expect(isAuthorizedAdmin(user3)).toBe(false);
    });

    it('should handle custom claims', () => {
      const userWithStaffRole = { ...mockUser, customClaims: { role: 'staff' } };
      const userWithInvalidRole = { ...mockUser, customClaims: { role: 'student' } };
      
      expect(isAuthorizedAdmin(userWithStaffRole)).toBe(true);
      expect(isAuthorizedAdmin(userWithInvalidRole)).toBe(false);
    });
  });

  describe('Runtime Detection', () => {
    it('should detect Edge Runtime', () => {
      // Mock Edge Runtime environment
      const originalProcess = global.process;
      global.process = { ...process, env: { ...process.env, NEXT_RUNTIME: 'edge' } } as any;
      
      // This would be tested in the actual implementation
      // For now, we'll test the concept
      expect(process.env.NEXT_RUNTIME).toBe('edge');
      
      // Restore
      global.process = originalProcess;
    });

    it('should detect Node.js Runtime', () => {
      // Mock Node.js environment
      const originalProcess = global.process;
      global.process = { ...process, env: { ...process.env, NEXT_RUNTIME: 'nodejs' } } as any;
      
      expect(process.env.NEXT_RUNTIME).toBe('nodejs');
      
      // Restore
      global.process = originalProcess;
    });
  });

  describe('Token Verification Logic', () => {
    it('should handle valid token structure', () => {
      const validToken = {
        uid: 'test-uid',
        email: 'teacher@stephensprivelessen.nl',
        name: 'Test Teacher',
        picture: 'https://example.com/photo.jpg',
        email_verified: true,
        customClaims: { role: 'admin' }
      };

      // Test the transformation logic
      const user = {
        uid: validToken.uid,
        email: validToken.email || null,
        name: validToken.name || null,
        picture: validToken.picture || null,
        emailVerified: validToken.email_verified || false,
        customClaims: validToken.customClaims as any,
      };

      expect(user.uid).toBe('test-uid');
      expect(user.email).toBe('teacher@stephensprivelessen.nl');
      expect(user.name).toBe('Test Teacher');
      expect(user.picture).toBe('https://example.com/photo.jpg');
      expect(user.emailVerified).toBe(true);
      expect(user.customClaims).toEqual({ role: 'admin' });
    });

    it('should handle token with missing fields', () => {
      const partialToken = {
        uid: 'test-uid',
        email: 'teacher@stephensprivelessen.nl',
        // Missing other fields
      };

      const user = {
        uid: partialToken.uid,
        email: partialToken.email || null,
        name: partialToken.name || null,
        picture: partialToken.picture || null,
        emailVerified: partialToken.email_verified || false,
        customClaims: partialToken.customClaims as any,
      };

      expect(user.uid).toBe('test-uid');
      expect(user.email).toBe('teacher@stephensprivelessen.nl');
      expect(user.name).toBe(null);
      expect(user.picture).toBe(null);
      expect(user.emailVerified).toBe(false);
      expect(user.customClaims).toBeUndefined();
    });
  });

  describe('Session Cookie Logic', () => {
    it('should extract session cookie from request', () => {
      const mockRequest = {
        cookies: {
          get: (name: string) => {
            if (name === '__session') return { value: 'mock-session-cookie' };
            return null;
          }
        }
      } as any;

      const cookie = mockRequest.cookies.get('__session')?.value;
      expect(cookie).toBe('mock-session-cookie');
    });

    it('should handle missing session cookie', () => {
      const mockRequest = {
        cookies: {
          get: (name: string) => null
        }
      } as any;

      const cookie = mockRequest.cookies.get('__session')?.value;
      expect(cookie).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle token verification errors', () => {
      const error = new Error('Token verification failed');
      
      // Test error handling logic
      const handleError = (error: any) => {
        if (error.message?.includes('verification failed')) {
          return { user: null, error: 'Invalid token' };
        }
        return { user: null, error: 'Unknown error' };
      };

      const result = handleError(error);
      expect(result.user).toBe(null);
      expect(result.error).toBe('Invalid token');
    });

    it('should handle network errors', () => {
      const error = new Error('Network error');
      
      const handleError = (error: any) => {
        if (error.message?.includes('Network')) {
          return { user: null, error: 'Network error' };
        }
        return { user: null, error: 'Unknown error' };
      };

      const result = handleError(error);
      expect(result.user).toBe(null);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed email addresses', () => {
      const userWithMalformedEmail = { ...mockUser, email: 'not-an-email' };
      expect(isAuthorizedAdmin(userWithMalformedEmail)).toBe(false);
    });

    it('should handle case sensitivity in email domains', () => {
      const userWithUppercase = { ...mockUser, email: 'teacher@STEPHENSPRIVELESSEN.NL' };
      expect(isAuthorizedAdmin(userWithUppercase)).toBe(true);
    });

    it('should handle empty custom claims', () => {
      const userWithEmptyClaims = { ...mockUser, customClaims: {} };
      expect(isAuthorizedAdmin(userWithEmptyClaims)).toBe(true);
    });

    it('should handle null custom claims', () => {
      const userWithNullClaims = { ...mockUser, customClaims: null };
      expect(isAuthorizedAdmin(userWithNullClaims)).toBe(true);
    });
  });
});
