import { NextRequest } from 'next/server';
import { validateTeacherEmail } from './security';

// Runtime detection to prevent Edge Runtime usage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isEdgeRuntime = typeof (globalThis as any).EdgeRuntime !== 'undefined' || 
  (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge');

// Only import Firebase Admin SDK in Node.js runtime
let auth: { 
  verifyIdToken?: (token: string) => Promise<Record<string, unknown>>; 
  verifySessionCookie?: (cookie: string, checkRevoked: boolean) => Promise<Record<string, unknown>>; 
  setCustomUserClaims?: (uid: string, customClaims: Record<string, unknown>) => Promise<void>;
  getUser?: (uid: string) => Promise<{ uid: string; email?: string; displayName?: string; photoURL?: string; emailVerified: boolean; customClaims?: Record<string, unknown> }>;
  createCustomToken?: (uid: string, additionalClaims?: Record<string, unknown>) => Promise<string>;
  currentUser?: unknown 
} | null = null;
if (!isEdgeRuntime) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const firebaseAdminModule = require('./firebase-admin') as { auth: typeof auth };
    auth = firebaseAdminModule.auth;
  } catch {
    console.warn('Firebase Admin SDK not available in this runtime');
  }
}

export interface FirebaseUser {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  emailVerified: boolean;
  customClaims?: Record<string, unknown>;
}

export interface AuthResult {
  user: FirebaseUser | null;
  error: string | null;
}

/**
 * Verify Firebase ID token from request headers
 * NOTE: This function requires Node.js runtime (not Edge Runtime)
 */
export async function verifyFirebaseToken(request: NextRequest): Promise<AuthResult> {
  if (isEdgeRuntime || !auth) {
    return { user: null, error: 'Firebase Admin SDK not available in Edge Runtime' };
  }

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: 'No authorization header' };
    }

    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken!(token);
    
    const user: FirebaseUser = {
      uid: decodedToken.uid as string,
      email: (decodedToken.email as string) || null,
      name: (decodedToken.name as string) || null,
      picture: (decodedToken.picture as string) || null,
      emailVerified: (decodedToken.email_verified as boolean) || false,
      customClaims: decodedToken.customClaims as Record<string, unknown>,
    };

    return { user, error: null };
  } catch (error) {
    console.error('Token verification failed:', error);
    return { user: null, error: 'Invalid token' };
  }
}

/**
 * Verify Firebase session cookie
 * NOTE: This function requires Node.js runtime (not Edge Runtime)
 */
export async function verifyFirebaseTokenFromCookie(request: NextRequest): Promise<AuthResult> {
  if (isEdgeRuntime || !auth) {
    return { user: null, error: 'Firebase Admin SDK not available in Edge Runtime' };
  }

  try {
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return { user: null, error: 'No session cookie' };
    }

    const decodedClaims = await auth.verifySessionCookie!(sessionCookie, true);
    
    const user: FirebaseUser = {
      uid: decodedClaims.uid as string,
      email: (decodedClaims.email as string) || null,
      name: (decodedClaims.name as string) || null,
      picture: (decodedClaims.picture as string) || null,
      emailVerified: (decodedClaims.email_verified as boolean) || false,
      customClaims: decodedClaims.customClaims as Record<string, unknown>,
    };

    return { user, error: null };
  } catch (error) {
    console.error('Session cookie verification failed:', error);
    return { user: null, error: 'Invalid session cookie' };
  }
}

/**
 * Check if user is authorized for admin access
 */
export function isAuthorizedAdmin(user: FirebaseUser | null): boolean {
  if (!user || !user.email) return false;
  
  // Check if email is from allowed domain
  if (!validateTeacherEmail(user.email)) return false;
  
  // Check custom claims for role
  if (user.customClaims?.role && !['admin', 'staff'].includes(user.customClaims.role as string)) {
    return false;
  }
  
  return true;
}

/**
 * Set custom claims for a user (admin only)
 * NOTE: This function requires Node.js runtime (not Edge Runtime)
 */
export async function setUserRole(uid: string, role: 'admin' | 'staff'): Promise<void> {
  if (isEdgeRuntime || !auth || !auth.setCustomUserClaims) {
    throw new Error('Firebase Admin SDK not available in Edge Runtime');
  }
  await auth.setCustomUserClaims(uid, { role });
}

/**
 * Get user by UID
 * NOTE: This function requires Node.js runtime (not Edge Runtime)
 */
export async function getUserByUid(uid: string): Promise<FirebaseUser | null> {
  if (isEdgeRuntime || !auth || !auth.getUser) {
    throw new Error('Firebase Admin SDK not available in Edge Runtime');
  }

  try {
    const userRecord = await auth.getUser(uid);
    return {
      uid: userRecord.uid,
      email: userRecord.email || null,
      name: userRecord.displayName || null,
      picture: userRecord.photoURL || null,
      emailVerified: userRecord.emailVerified,
      customClaims: userRecord.customClaims as Record<string, unknown>,
    };
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}

/**
 * Create custom token for student sessions (if needed)
 * NOTE: This function requires Node.js runtime (not Edge Runtime)
 */
export async function createCustomToken(uid: string, additionalClaims?: Record<string, unknown>): Promise<string> {
  if (isEdgeRuntime || !auth || !auth.createCustomToken) {
    throw new Error('Firebase Admin SDK not available in Edge Runtime');
  }
  return await auth.createCustomToken(uid, additionalClaims);
}

