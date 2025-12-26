import { NextRequest } from 'next/server';
import { validateTeacherEmail } from './security';
import { 
  TeacherEmail, 
  TeacherId
} from './types';

// Runtime detection to prevent Edge Runtime usage
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
// Lazy load Firebase Admin SDK to prevent build-time issues
async function getFirebaseAuth() {
  if (auth) return auth;
  
  if (isEdgeRuntime) {
    throw new Error('Firebase Admin SDK not available in Edge Runtime');
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const firebaseAdminModule = require('./firebase-admin') as { auth: typeof auth };
    auth = firebaseAdminModule.auth;
    return auth;
  } catch (error) {
    console.warn('Firebase Admin SDK not available in this environment:', error);
    throw new Error('Firebase Admin SDK not available');
  }
}

import type { FirebaseUser, AuthResult } from './interfaces';

/**
 * Verify Firebase ID token from request headers
 * NOTE: This function requires Node.js runtime (not Edge Runtime)
 */
export async function verifyFirebaseToken(request: NextRequest): Promise<AuthResult> {
  if (isEdgeRuntime) {
    return { success: false, user: undefined, error: 'Firebase Admin SDK not available in Edge Runtime' };
  }

  try {
    const firebaseAuth = await getFirebaseAuth();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, user: undefined, error: 'No authorization header' };
    }

    const token = authHeader.substring(7);
    if (!firebaseAuth || !firebaseAuth.verifyIdToken) {
      return { success: false, user: undefined, error: 'Firebase Auth not initialized' };
    }
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    
    const user: FirebaseUser = {
      uid: decodedToken.uid as TeacherId,
      email: (decodedToken.email as TeacherEmail) || undefined,
      name: (decodedToken.name as string) || undefined,
      picture: (decodedToken.picture as string) || undefined,
      emailVerified: (decodedToken.email_verified as boolean) || false,
      customClaims: decodedToken.customClaims as Record<string, unknown>,
    };

    return { user, success: true, error: undefined };
  } catch (error) {
    console.error('Token verification failed:', error);
    return { success: false, user: undefined, error: 'Invalid token' };
  }
}

/**
 * Verify Firebase session cookie
 * NOTE: This function requires Node.js runtime (not Edge Runtime)
 */
export async function verifyFirebaseTokenFromCookie(request: NextRequest): Promise<AuthResult> {
  if (isEdgeRuntime) {
    return { success: false, user: undefined, error: 'Firebase Admin SDK not available in Edge Runtime' };
  }

  try {
    const firebaseAuth = await getFirebaseAuth();
    
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return { success: false, user: undefined, error: 'No session cookie' };
    }

    if (!firebaseAuth || !firebaseAuth.verifySessionCookie) {
      return { success: false, user: undefined, error: 'Firebase Auth not initialized' };
    }
    const decodedClaims = await firebaseAuth.verifySessionCookie(sessionCookie, true);
    
    const user: FirebaseUser = {
      uid: decodedClaims.uid as TeacherId,
      email: (decodedClaims.email as TeacherEmail) || undefined,
      name: (decodedClaims.name as string) || undefined,
      picture: (decodedClaims.picture as string) || undefined,
      emailVerified: (decodedClaims.email_verified as boolean) || false,
      customClaims: decodedClaims.customClaims as Record<string, unknown>,
    };

    return { user, success: true, error: undefined };
  } catch (error) {
    console.error('Session cookie verification failed:', error);
    return { success: false, user: undefined, error: 'Invalid session cookie' };
  }
}

/**
 * Check if user is authorized for admin access
 */
export function isAuthorizedAdmin(user: FirebaseUser | null): boolean {
  if (!user || !user.email) return false;
  
  // Check if email is from allowed domain
  const emailValidation = validateTeacherEmail(user.email);
  if (!emailValidation.success) return false;
  
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
  if (isEdgeRuntime) {
    throw new Error('Firebase Admin SDK not available in Edge Runtime');
  }
  const firebaseAuth = await getFirebaseAuth();
  if (!firebaseAuth || !firebaseAuth.setCustomUserClaims) {
    throw new Error('setCustomUserClaims not available');
  }
  await firebaseAuth.setCustomUserClaims(uid, { role });
}

/**
 * Get user by UID
 * NOTE: This function requires Node.js runtime (not Edge Runtime)
 */
export async function getUserByUid(uid: string): Promise<FirebaseUser | null> {
  if (isEdgeRuntime) {
    throw new Error('Firebase Admin SDK not available in Edge Runtime');
  }

  try {
    const firebaseAuth = await getFirebaseAuth();
    if (!firebaseAuth || !firebaseAuth.getUser) {
      throw new Error('getUser not available');
    }
    const userRecord = await firebaseAuth.getUser(uid);
    return {
      uid: userRecord.uid as TeacherId,
      email: (userRecord.email as TeacherEmail) || undefined,
      name: userRecord.displayName || undefined,
      picture: userRecord.photoURL || undefined,
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
  if (isEdgeRuntime) {
    throw new Error('Firebase Admin SDK not available in Edge Runtime');
  }
  const firebaseAuth = await getFirebaseAuth();
  if (!firebaseAuth || !firebaseAuth.createCustomToken) {
    throw new Error('createCustomToken not available');
  }
  return await firebaseAuth.createCustomToken(uid, additionalClaims);
}

