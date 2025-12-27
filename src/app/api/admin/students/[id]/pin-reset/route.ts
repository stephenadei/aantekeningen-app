import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, isAuthorizedAdmin } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement Firestore PIN reset
    return NextResponse.json({ 
      id,
      pin: '000000',
      success: true, 
      message: 'PIN reset coming soon via Firestore'
    });

  } catch (error) {
    console.error('Error resetting PIN:', error);
    return NextResponse.json(
      { error: 'Failed to reset PIN' },
      { status: 500 }
    );
  }
}
