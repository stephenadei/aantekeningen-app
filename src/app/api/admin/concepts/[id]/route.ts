import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement Firestore query to get concept
    return NextResponse.json({ 
      id,
      success: true, 
      message: 'Concept fetching coming soon via Firestore'
    });

  } catch (error) {
    console.error('Error fetching concept:', error);
    return NextResponse.json(
      { error: 'Failed to fetch concept' },
      { status: 500 }
    );
  }
}
