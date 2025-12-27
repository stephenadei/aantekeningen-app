import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { validateTeacherEmail } from './security';
import type { AuthResult, FirebaseUser } from './interfaces';
import type { TeacherId, TeacherEmail } from './types';

/**
 * Get the current session from NextAuth
 * Replaces verifyFirebaseTokenFromCookie
 */
export async function getAuthSession(): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return { success: false, user: undefined, error: 'No session' };
    }

    const user: FirebaseUser = {
      uid: ((session.user as { id?: string }).id || session.user.email?.split('@')[0] || 'unknown') as TeacherId,
      email: (session.user.email as string) as TeacherEmail | undefined,
      name: session.user.name || undefined,
      picture: session.user.image || undefined,
      emailVerified: true, // NextAuth verifies email through Google
      customClaims: {}, // Can be extended if needed
    };

    return { success: true, user, error: undefined };
  } catch (error) {
    console.error('Session verification failed:', error);
    return { success: false, user: undefined, error: 'Invalid session' };
  }
}

/**
 * Check if user is authorized for admin access
 * Same logic as before, but works with NextAuth session
 */
export function isAuthorizedAdmin(user: FirebaseUser | null): boolean {
  if (!user || !user.email) return false;
  
  // Check if email is from allowed domain
  const emailValidation = validateTeacherEmail(user.email);
  if (!emailValidation.success) return false;
  
  return true;
}

/**
 * Legacy function name for compatibility
 * @deprecated Use getAuthSession instead
 */
export async function verifyFirebaseTokenFromCookie(request: any): Promise<AuthResult> {
  return getAuthSession();
}

