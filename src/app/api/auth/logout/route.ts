import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { createLoginAudit } from '@/lib/database';
import { getClientIP, getUserAgent } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // Get user info before logout for audit logging
    const { user } = await getAuthSession();
    
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

    // NextAuth handles session clearing automatically
    // This endpoint is kept for audit logging
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Logout failed:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

