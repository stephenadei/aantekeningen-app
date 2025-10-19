import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement Firestore detailed statistics queries
    return NextResponse.json({ 
      bySubject: {},
      byMonth: {},
      message: 'Detailed statistics coming soon via Firestore'
    });

  } catch (error) {
    console.error('Error fetching detailed statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch detailed statistics' },
      { status: 500 }
    );
  }
}
