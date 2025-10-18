import { NextRequest } from 'next/server';
import { validateTeacherEmail } from './security';

// Runtime detection to prevent Edge Runtime usage
const isEdgeRuntime = typeof EdgeRuntime !== 'undefined' || 
  (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge');

// Only import Firebase Admin SDK in Node.js runtime
let auth: any = null;
if (!isEdgeRuntime) {
  try {
    const { auth: firebaseAuth } = require('./firebase-admin');
    auth = firebaseAuth;
  } catch (error) {
    console.warn('Firebase Admin SDK not available in this runtime');
  }
}

export interface FirebaseUser {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  emailVerified: boolean;
  customClaims?: {
    role?: string;
  };
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
    const decodedToken = await auth.verifyIdToken(token);
    
    const user: FirebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      emailVerified: decodedToken.email_verified || false,
      customClaims: decodedToken.customClaims as any,
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

    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    
    const user: FirebaseUser = {
      uid: decodedClaims.uid,
      email: decodedClaims.email || null,
      name: decodedClaims.name || null,
      picture: decodedClaims.picture || null,
      emailVerified: decodedClaims.email_verified || false,
      customClaims: decodedClaims.customClaims as any,
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
  if (user.customClaims?.role && !['admin', 'staff'].includes(user.customClaims.role)) {
    return false;
  }
  
  return true;
}

/**
 * Set custom claims for a user (admin only)
 * NOTE: This function requires Node.js runtime (not Edge Runtime)
 */
export async function setUserRole(uid: string, role: 'admin' | 'staff'): Promise<void> {
  if (isEdgeRuntime || !auth) {
    throw new Error('Firebase Admin SDK not available in Edge Runtime');
  }
  await auth.setCustomUserClaims(uid, { role });
}

/**
 * Get user by UID
 * NOTE: This function requires Node.js runtime (not Edge Runtime)
 */
export async function getUserByUid(uid: string): Promise<FirebaseUser | null> {
  if (isEdgeRuntime || !auth) {
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
      customClaims: userRecord.customClaims as any,
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
export async function createCustomToken(uid: string, additionalClaims?: any): Promise<string> {
  if (isEdgeRuntime || !auth) {
    throw new Error('Firebase Admin SDK not available in Edge Runtime');
  }
  return await auth.createCustomToken(uid, additionalClaims);
}

