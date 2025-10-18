import { describe, it, expect, beforeEach } from 'vitest';
import { 
  validatePinFormat, 
  generatePin, 
  hashPin, 
  verifyPin, 
  validateTeacherEmail, 
  sanitizeInput,
  getClientIP,
  getUserAgent
} from '@/lib/security';

describe('Security Helpers', () => {
  describe('PIN Validation', () => {
    it('should validate correct PIN format', () => {
      expect(validatePinFormat('123456')).toBe(true);
      expect(validatePinFormat('000000')).toBe(true);
      expect(validatePinFormat('999999')).toBe(true);
    });

    it('should reject invalid PIN formats', () => {
      expect(validatePinFormat('12345')).toBe(false); // Too short
      expect(validatePinFormat('1234567')).toBe(false); // Too long
      expect(validatePinFormat('12345a')).toBe(false); // Contains letter
      expect(validatePinFormat('12345!')).toBe(false); // Contains special char
      expect(validatePinFormat('')).toBe(false); // Empty
      expect(validatePinFormat('12 3456')).toBe(false); // Contains space
    });

    it('should generate valid PINs', () => {
      for (let i = 0; i < 10; i++) {
        const pin = generatePin();
        expect(validatePinFormat(pin)).toBe(true);
        expect(pin).toHaveLength(6);
        expect(/^\d{6}$/.test(pin)).toBe(true);
      }
    });

    it('should hash and verify PINs correctly', async () => {
      const pin = '123456';
      const hash = await hashPin(pin);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(pin);
      expect(hash.length).toBeGreaterThan(20); // bcrypt hash length
      
      const isValid = await verifyPin(pin, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await verifyPin('654321', hash);
      expect(isInvalid).toBe(false);
    });

    it('should handle empty PIN verification', async () => {
      const hash = await hashPin('123456');
      const isValid = await verifyPin('', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Email Validation', () => {
    it('should validate teacher emails', () => {
      expect(validateTeacherEmail('teacher@stephensprivelessen.nl')).toBe(true);
      expect(validateTeacherEmail('admin@stephensprivelessen.nl')).toBe(true);
      expect(validateTeacherEmail('stephen@stephensprivelessen.nl')).toBe(true);
    });

    it('should reject non-teacher emails', () => {
      expect(validateTeacherEmail('student@gmail.com')).toBe(false);
      expect(validateTeacherEmail('teacher@other-school.nl')).toBe(false);
      expect(validateTeacherEmail('admin@stephensprivelessen.com')).toBe(false);
      expect(validateTeacherEmail('')).toBe(false);
      expect(validateTeacherEmail('invalid-email')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateTeacherEmail('teacher+tag@stephensprivelessen.nl')).toBe(true);
      expect(validateTeacherEmail('teacher.name@stephensprivelessen.nl')).toBe(true);
      expect(validateTeacherEmail('TEACHER@STEPHENSPRIVELESSEN.NL')).toBe(true);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize basic input', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World');
      expect(sanitizeInput('  spaced  ')).toBe('spaced');
      expect(sanitizeInput('')).toBe('');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('SELECT * FROM users')).toBe('SELECT * FROM users');
      expect(sanitizeInput('../../../etc/passwd')).toBe('../../../etc/passwd');
    });

    it('should handle special characters', () => {
      expect(sanitizeInput('José María')).toBe('José María');
      expect(sanitizeInput('Student-Name_123')).toBe('Student-Name_123');
      expect(sanitizeInput('Test & More')).toBe('Test & More');
    });

    it('should limit length', () => {
      const longString = 'a'.repeat(1000);
      const sanitized = sanitizeInput(longString);
      expect(sanitized.length).toBeLessThanOrEqual(500); // Assuming 500 char limit
    });
  });

  describe('Request Helpers', () => {
    const mockRequest = {
      headers: {
        get: (name: string) => {
          const headers: Record<string, string> = {
            'x-forwarded-for': '192.168.1.1, 10.0.0.1',
            'x-real-ip': '203.0.113.1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          };
          return headers[name] || null;
        }
      }
    } as any;

    it('should extract client IP correctly', () => {
      const ip = getClientIP(mockRequest);
      expect(ip).toBe('192.168.1.1'); // First IP from x-forwarded-for
    });

    it('should fallback to x-real-ip', () => {
      const requestWithoutForwarded = {
        headers: {
          get: (name: string) => {
            if (name === 'x-real-ip') return '203.0.113.1';
            if (name === 'user-agent') return 'Mozilla/5.0';
            return null;
          }
        }
      } as any;

      const ip = getClientIP(requestWithoutForwarded);
      expect(ip).toBe('203.0.113.1');
    });

    it('should extract user agent correctly', () => {
      const userAgent = getUserAgent(mockRequest);
      expect(userAgent).toContain('Mozilla/5.0');
      expect(userAgent).toContain('Windows NT 10.0');
    });

    it('should handle missing headers', () => {
      const emptyRequest = {
        headers: {
          get: () => null
        }
      } as any;

      const ip = getClientIP(emptyRequest);
      const userAgent = getUserAgent(emptyRequest);
      
      expect(ip).toBe('unknown');
      expect(userAgent).toBe('unknown');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined inputs', () => {
      expect(validatePinFormat(null as any)).toBe(false);
      expect(validatePinFormat(undefined as any)).toBe(false);
      expect(validateTeacherEmail(null as any)).toBe(false);
      expect(validateTeacherEmail(undefined as any)).toBe(false);
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });

    it('should handle very long inputs', () => {
      const longPin = '1'.repeat(100);
      expect(validatePinFormat(longPin)).toBe(false);
      
      const longEmail = 'a'.repeat(100) + '@stephensprivelessen.nl';
      expect(validateTeacherEmail(longEmail)).toBe(true); // Email can be long
    });
  });
});
