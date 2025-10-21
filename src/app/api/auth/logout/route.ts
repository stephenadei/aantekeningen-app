import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie } from '@/lib/firebase-auth';
import { createLoginAudit } from '@/lib/firestore';
import { getClientIP, getUserAgent } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // Get user info before logout for audit logging
    const { user } = await verifyFirebaseTokenFromCookie(request);
    
    // Log sign-out
    if (user?.email) {
      await createLoginAudit({
        who: `teacher:${user.email}`,
        action: 'logout',
        ip: getClientIP(request),
        userAgent: getUserAgent(request),
        metadata: {
          email: user.email,
          uid: user.uid,
        },
      });
    }

    // Clear the Firebase token cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('firebase-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Logout failed:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

