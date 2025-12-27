import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthSession();
    
    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        picture: user.picture,
        emailVerified: user.emailVerified,
        role: 'admin', // NextAuth doesn't have custom claims by default
      }
    });

  } catch (error) {
    console.error('Failed to get user info:', error);
    return NextResponse.json(
      { error: 'Failed to get user info' },
      { status: 500 }
    );
  }
}

