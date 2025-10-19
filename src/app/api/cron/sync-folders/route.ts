import { NextRequest, NextResponse } from 'next/server';
import { backgroundSyncService } from '@/lib/background-sync';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json({ success: false, error: 'Cron secret not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting scheduled folder sync...');
    const result = await backgroundSyncService.syncAllStudents();
    console.log(`✅ Scheduled sync completed. Processed ${result.processed} files.`);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Scheduled sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
