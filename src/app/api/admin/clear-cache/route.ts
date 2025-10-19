import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { googleDriveService } from '@/lib/google-drive-simple';

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear the cache
    const result = googleDriveService.clearCache();
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Cache cleared successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: result.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
