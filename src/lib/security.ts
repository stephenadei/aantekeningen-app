import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generate a cryptographically secure 6-digit PIN
 */
export function generatePin(): string {
  const bytes = randomBytes(6);
  return Array.from(bytes, b => (b % 10).toString()).join('');
}

/**
 * Hash a PIN using bcrypt
 */
export async function hashPin(pin: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(pin, saltRounds);
}

/**
 * Verify a PIN against its hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/**
 * Rate limiting helper - simple in-memory store
 * In production, consider using Redis
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Maximum attempts per window
}

export function checkRateLimit(
  key: string, 
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  
  const current = rateLimitStore.get(key);
  
  if (!current || current.resetTime < now) {
    // No current limit or window expired
    rateLimitStore.set(key, { count: 1, resetTime: now + options.windowMs });
    return {
      allowed: true,
      remaining: options.maxAttempts - 1,
      resetTime: now + options.windowMs
    };
  }
  
  if (current.count >= options.maxAttempts) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime
    };
  }
  
  // Increment counter
  current.count++;
  rateLimitStore.set(key, current);
  
  return {
    allowed: true,
    remaining: options.maxAttempts - current.count,
    resetTime: current.resetTime
  };
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken) return false;
  return token === expectedToken;
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Validate email domain for teacher access
 */
export function validateTeacherEmail(email: string): boolean {
  const allowedDomain = process.env.ALLOWED_TEACHER_DOMAIN || 'stephensprivelessen.nl';
  const primaryEmail = process.env.TEACHER_EMAIL || 'lessons@stephensprivelessen.nl';
  
  return email === primaryEmail || email.endsWith(`@${allowedDomain}`);
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate PIN format (6 digits)
 */
export function validatePinFormat(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/**
 * Validate student display name
 */
export function validateStudentName(name: string): boolean {
  const sanitized = sanitizeInput(name);
  return sanitized.length >= 2 && sanitized.length <= 50;
}
