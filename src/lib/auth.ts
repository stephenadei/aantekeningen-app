import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { validateTeacherEmail } from './security';
import type { AuthResult, SessionUser } from './interfaces';
import type { TeacherId, TeacherEmail } from './types';

/**
 * Get the current session from NextAuth
 */
export async function getAuthSession(): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return { success: false, user: undefined, error: 'No session' };
    }

    const user: SessionUser = {
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
export function isAuthorizedAdmin(user: SessionUser | null): boolean {
  if (!user || !user.email) return false;

  // Check if email is from allowed domain
  const emailValidation = validateTeacherEmail(user.email);
  if (!emailValidation.success) return false;

  return true;
}

/**
 * Result of an admin-route guard: either the authorized user, or a ready-to-
 * return 401 response.
 */
export type AdminGuard =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

/**
 * Admin route guard. The single seam for "is this an authorized admin?" —
 * replaces the getAuthSession() + isAuthorizedAdmin() block that was duplicated
 * across ~29 admin routes (42 sites). Usage:
 *
 *   const auth = await requireAdmin();
 *   if (!auth.ok) return auth.response;
 *   // auth.user is the authorized admin
 */
export async function requireAdmin(): Promise<AdminGuard> {
  const { user, error } = await getAuthSession();
  if (error || !user || !isAuthorizedAdmin(user)) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { ok: true, user };
}


