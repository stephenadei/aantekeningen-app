import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, isAuthorizedAdmin } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Implement Firestore folder linking
    return NextResponse.json({ 
      folderId,
      success: true, 
      message: 'Folder linking coming soon via Firestore'
    });

  } catch (error) {
    console.error('Error linking folder:', error);
    return NextResponse.json(
      { error: 'Failed to link folder' },
      { status: 500 }
    );
  }
}
