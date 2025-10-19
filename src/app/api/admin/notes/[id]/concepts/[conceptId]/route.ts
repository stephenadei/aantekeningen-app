import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; conceptId: string }> }
) {
  try {
    const { id, conceptId } = await params;
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement Firestore update concept
    return NextResponse.json({ 
      id: conceptId,
      success: true, 
      message: 'Concept update coming soon via Firestore'
    });

  } catch (error) {
    console.error('Error updating concept:', error);
    return NextResponse.json(
      { error: 'Failed to update concept' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; conceptId: string }> }
) {
  try {
    const { id, conceptId } = await params;
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement Firestore delete concept
    return NextResponse.json({ 
      id: conceptId,
      success: true, 
      message: 'Concept deletion coming soon via Firestore'
    });

  } catch (error) {
    console.error('Error deleting concept:', error);
    return NextResponse.json(
      { error: 'Failed to delete concept' },
      { status: 500 }
    );
  }
}
