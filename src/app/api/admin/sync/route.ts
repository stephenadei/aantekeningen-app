import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { backgroundSyncService } from '@/lib/background-sync';
import { getCacheStats } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);

    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get sync status and cache stats
    const [syncStatus, cacheStats] = await Promise.all([
      backgroundSyncService.getSyncStatus(),
      getCacheStats(),
    ]);

    return NextResponse.json({
      success: true,
      syncStatus,
      cacheStats,
    });

  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
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

    const body = await request.json();
    const { action, studentId } = body;

    switch (action) {
      case 'full-sync':
        console.log('🔄 Starting full sync triggered by admin...');
        // Start full sync in background (don't wait for completion)
        backgroundSyncService.runFullSync().catch(error => {
          console.error('Full sync failed:', error);
        });
        
        return NextResponse.json({
          success: true,
          message: 'Full sync started in background',
        });

      case 'sync-student':
        if (!studentId) {
          return NextResponse.json(
            { error: 'Student ID is required for sync-student action' },
            { status: 400 }
          );
        }

        console.log(`🔄 Force syncing student ${studentId} triggered by admin...`);
        await backgroundSyncService.forceSyncStudent(studentId);
        
        return NextResponse.json({
          success: true,
          message: `Student ${studentId} synced successfully`,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "full-sync" or "sync-student"' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in sync action:', error);
    return NextResponse.json(
      { error: 'Failed to execute sync action' },
      { status: 500 }
    );
  }
}
