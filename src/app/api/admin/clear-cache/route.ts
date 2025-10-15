import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { validateTeacherEmail } from '@/lib/security';
import { googleDriveService } from '@/lib/google-drive-simple';

export async function POST() {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email || !validateTeacherEmail(session.user.email)) {
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
