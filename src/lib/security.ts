import bcrypt from 'bcryptjs';
import { 
  Pin, 
  PinHash, 
  TeacherEmail, 
  IPAddress, 
  UserAgent, 
  StudentName,
  createPin,
  createPinHash,
  createTeacherEmail,
  createIPAddress,
  createUserAgent,
  createStudentName,
  isPin,
  isTeacherEmail,
  isIPAddress,
  isUserAgent,
  isStudentName,
  Result,
  Ok,
  Err
} from './types';

/**
 * Generate a cryptographically secure 6-digit PIN
 */
export function generatePin(): Pin {
  // Use crypto.getRandomValues for Edge Runtime compatibility
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  const pinString = Array.from(array, b => (b % 10).toString()).join('');
  return createPin(pinString);
}

/**
 * Hash a PIN using bcrypt
 */
export async function hashPin(pin: Pin): Promise<PinHash> {
  const saltRounds = 12;
  const hash = await bcrypt.hash(pin, saltRounds);
  return createPinHash(hash);
}

/**
 * Verify a PIN against its hash
 */
export async function verifyPin(pin: Pin, hash: PinHash): Promise<boolean> {
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
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
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
export function getClientIP(request: Request): IPAddress {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  let ip = 'unknown';
  if (cfConnectingIP) ip = cfConnectingIP;
  else if (realIP) ip = realIP;
  else if (forwarded) ip = forwarded.split(',')[0].trim();
  
  return createIPAddress(ip);
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: Request): UserAgent {
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return createUserAgent(userAgent);
}

/**
 * Validate email domain for teacher access
 */
export function validateTeacherEmail(email: string): Result<TeacherEmail> {
  const allowedDomain = process.env.ALLOWED_TEACHER_DOMAIN || 'stephensprivelessen.nl';
  const primaryEmail = process.env.TEACHER_EMAIL || 'lessons@stephensprivelessen.nl';
  
  if (email === primaryEmail || email.endsWith(`@${allowedDomain}`)) {
    return Ok(createTeacherEmail(email));
  }
  
  return Err(new Error(`Invalid teacher email domain. Must be @${allowedDomain} or ${primaryEmail}`));
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
export function validatePinFormat(pin: string): Result<Pin> {
  if (isPin(pin)) {
    return Ok(createPin(pin));
  }
  return Err(new Error('Invalid PIN format. Must be 6 digits.'));
}

/**
 * Validate student display name
 */
export function validateStudentName(name: string): Result<StudentName> {
  const sanitized = sanitizeInput(name);
  if (sanitized.length >= 2 && sanitized.length <= 50) {
    return Ok(createStudentName(sanitized));
  }
  return Err(new Error('Invalid student name. Must be 2-50 characters long.'));
}
