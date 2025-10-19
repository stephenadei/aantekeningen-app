import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement Firestore re-analysis trigger
    return NextResponse.json({ 
      id,
      success: true, 
      message: 'Note re-analysis coming soon via Firestore'
    });

  } catch (error) {
    console.error('Error triggering re-analysis:', error);
    return NextResponse.json(
      { error: 'Failed to trigger re-analysis' },
      { status: 500 }
    );
  }
}
