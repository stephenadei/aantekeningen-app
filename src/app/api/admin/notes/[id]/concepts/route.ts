import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // id not used in current implementation
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement Firestore query to get concepts for note
    return NextResponse.json({ 
      concepts: [],
      message: 'Concepts fetching coming soon via Firestore'
    });

  } catch (error) {
    console.error('Error fetching concepts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch concepts' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // id not used in current implementation
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement Firestore create concept
    return NextResponse.json({ 
      success: true, 
      message: 'Concept creation coming soon via Firestore'
    });

  } catch (error) {
    console.error('Error creating concept:', error);
    return NextResponse.json(
      { error: 'Failed to create concept' },
      { status: 500 }
    );
  }
}
