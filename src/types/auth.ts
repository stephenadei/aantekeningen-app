/**
 * Authentication related types
 */

export interface SessionUser {
  uid: string;
  email?: string;
  name?: string;
  displayName?: string;
  picture?: string;
  photoURL?: string;
  emailVerified: boolean;
  customClaims?: Record<string, unknown>;
}

export interface AuthResult {
  success: boolean;
  user?: SessionUser;
  error?: string;
  token?: string;
}

export interface SecurityContext {
  ip: string;
  userAgent: string;
  timestamp: Date;
}

export interface LoginAttempt {
  email: string;
  pin?: string;
  success: boolean;
  reason?: string;
  context: SecurityContext;
}

export interface RateLimitOptions {
  windowMs: number;
  maxAttempts: number;
  keyGenerator?: (req: unknown) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

