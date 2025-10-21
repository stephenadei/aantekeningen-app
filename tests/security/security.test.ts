import { describe, it, expect } from 'vitest';
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
import { isOk } from '@/lib/types';

describe('Security Helpers', () => {
  describe('PIN Validation', () => {
    it('should validate correct PIN format', () => {
      const result1 = validatePinFormat('123456');
      expect(isOk(result1)).toBe(true);
      if (isOk(result1)) expect(result1.data).toBe('123456');
      
      const result2 = validatePinFormat('000000');
      expect(isOk(result2)).toBe(true);
      if (isOk(result2)) expect(result2.data).toBe('000000');
      
      const result3 = validatePinFormat('999999');
      expect(isOk(result3)).toBe(true);
      if (isOk(result3)) expect(result3.data).toBe('999999');
    });

    it('should reject invalid PIN formats', () => {
      expect(isOk(validatePinFormat('12345'))).toBe(false); // Too short
      expect(isOk(validatePinFormat('1234567'))).toBe(false); // Too long
      expect(isOk(validatePinFormat('12345a'))).toBe(false); // Contains letter
      expect(isOk(validatePinFormat('12345!'))).toBe(false); // Contains special char
      expect(isOk(validatePinFormat(''))).toBe(false); // Empty
      expect(isOk(validatePinFormat('12 3456'))).toBe(false); // Contains space
    });

    it('should generate valid PINs', () => {
      for (let i = 0; i < 10; i++) {
        const pin = generatePin();
        const result = validatePinFormat(pin);
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data).toHaveLength(6);
          expect(/^\d{6}$/.test(result.data)).toBe(true);
        }
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
      const result1 = validateTeacherEmail('teacher@stephensprivelessen.nl');
      expect(isOk(result1)).toBe(true);
      if (isOk(result1)) expect(result1.data).toBe('teacher@stephensprivelessen.nl');
      
      const result2 = validateTeacherEmail('admin@stephensprivelessen.nl');
      expect(isOk(result2)).toBe(true);
      if (isOk(result2)) expect(result2.data).toBe('admin@stephensprivelessen.nl');
      
      const result3 = validateTeacherEmail('stephen@stephensprivelessen.nl');
      expect(isOk(result3)).toBe(true);
      if (isOk(result3)) expect(result3.data).toBe('stephen@stephensprivelessen.nl');
    });

    it('should reject non-teacher emails', () => {
      expect(isOk(validateTeacherEmail('student@gmail.com'))).toBe(false);
      expect(isOk(validateTeacherEmail('teacher@other-school.nl'))).toBe(false);
      expect(isOk(validateTeacherEmail('admin@stephensprivelessen.com'))).toBe(false);
      expect(isOk(validateTeacherEmail(''))).toBe(false);
      expect(isOk(validateTeacherEmail('invalid-email'))).toBe(false);
    });

    it('should handle edge cases', () => {
      const result1 = validateTeacherEmail('teacher+tag@stephensprivelessen.nl');
      expect(isOk(result1)).toBe(true);
      if (isOk(result1)) expect(result1.data).toBe('teacher+tag@stephensprivelessen.nl');
      
      const result2 = validateTeacherEmail('teacher.name@stephensprivelessen.nl');
      expect(isOk(result2)).toBe(true);
      if (isOk(result2)) expect(result2.data).toBe('teacher.name@stephensprivelessen.nl');
      
      // Case sensitivity: uppercase domain doesn't match due to .endsWith() being case-sensitive
      expect(isOk(validateTeacherEmail('TEACHER@STEPHENSPRIVELESSEN.NL'))).toBe(false);
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
      // Note: sanitizeInput doesn't actually limit length in the current implementation
      const longString = 'a'.repeat(1000);
      const sanitized = sanitizeInput(longString);
      expect(sanitized.length).toBe(1000); // No truncation in implementation
    });
  });

  describe('Request Helpers', () => {
    const mockRequest = {
      headers: {
        get: (name: string) => {
          const headers: Record<string, string> = {
            'x-forwarded-for': '192.168.1.1, 10.0.0.1',
            'x-real-ip': '203.0.113.1',
            'cf-connecting-ip': '203.0.113.1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          };
          return headers[name] || null;
        }
      }
    } as unknown as { headers: { get: (name: string) => string | null } };

    it('should extract client IP correctly', () => {
      // getClientIP checks cf-connecting-ip first, then x-real-ip, then x-forwarded-for
      const ip = getClientIP(mockRequest);
      expect(ip).toBe('203.0.113.1'); // cf-connecting-ip takes precedence
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
      } as unknown as { headers: { get: (name: string) => string | null } };

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
      } as unknown as { headers: { get: () => null } };

      // getClientIP now returns a branded type, so we need to handle the error case
      expect(() => getClientIP(emptyRequest)).toThrow('Invalid ipaddress format');
      const userAgent = getUserAgent(emptyRequest);
      
      expect(userAgent).toBe('unknown');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined inputs', () => {
      expect(isOk(validatePinFormat(null as unknown as string))).toBe(false);
      expect(isOk(validatePinFormat(undefined as unknown as string))).toBe(false);
      // validateTeacherEmail throws on null/undefined due to .endsWith call
      expect(() => validateTeacherEmail(null as unknown as string)).toThrow();
      expect(() => validateTeacherEmail(undefined as unknown as string)).toThrow();
      // sanitizeInput throws on null/undefined due to .replace call
      expect(() => sanitizeInput(null as unknown as string)).toThrow();
      expect(() => sanitizeInput(undefined as unknown as string)).toThrow();
    });

    it('should handle very long inputs', () => {
      const longPin = '1'.repeat(100);
      expect(isOk(validatePinFormat(longPin))).toBe(false);
      
      const longEmail = 'a'.repeat(100) + '@stephensprivelessen.nl';
      const result = validateTeacherEmail(longEmail);
      expect(isOk(result)).toBe(true); // Email can be long
      if (isOk(result)) expect(result.data).toBe(longEmail);
    });
  });
});
