import { NextRequest, NextResponse } from 'next/server';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { authClient } from '@/lib/firebase-client';
import { createLoginAudit } from '@/lib/firestore';
import { getClientIP, getUserAgent } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'No ID token provided' }, { status: 400 });
    }

    // Verify the Google ID token with Firebase
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(authClient, credential);
    const user = userCredential.user;

    // Log successful sign-in
    await createLoginAudit({
      who: `teacher:${user.email}`,
      action: 'login_ok',
      ip: getClientIP(request),
      userAgent: getUserAgent(request),
      metadata: {
        provider: 'google',
        email: user.email,
        uid: user.uid,
      },
    });

    // Create a custom token for the session
    const customToken = await user.getIdToken();

    // Set the token as a secure HTTP-only cookie
    const response = NextResponse.json({ 
      success: true, 
      user: {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        picture: user.photoURL,
      }
    });

    response.cookies.set('firebase-token', customToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Google sign-in failed:', error);

    // Log failed attempt
    try {
      await createLoginAudit({
        who: 'teacher:unknown',
        action: 'login_fail',
        ip: getClientIP(request),
        userAgent: getUserAgent(request),
        metadata: {
          provider: 'google',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } catch (auditError) {
      console.error('Failed to log sign-in attempt:', auditError);
    }

    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

