import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement Firestore query to list students
    return NextResponse.json({ 
      students: [],
      total: 0,
      message: 'Students listing coming soon via Firestore'
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement Firestore create student
    return NextResponse.json({ 
      success: true, 
      message: 'Student creation coming soon via Firestore'
    });

  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    );
  }
}
