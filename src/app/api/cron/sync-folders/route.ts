import { NextRequest, NextResponse } from 'next/server';
import { backgroundSyncService } from '@/lib/background-sync';
import { runFullDatalakeSync } from '@/lib/datalake-sync';

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

    console.log('🔄 Starting scheduled sync...');

    // 1. Sync database with datalake (create/update students)
    console.log('📊 Step 1: Syncing database with datalake...');
    const datalakeSync = await runFullDatalakeSync();

    // 2. Sync file metadata cache (existing functionality)
    console.log('\n📁 Step 2: Syncing file metadata cache...');
    await backgroundSyncService.runFullSync();

    console.log('\n✅ Scheduled sync completed.');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      datalakeSync: {
        students: {
          scanned: datalakeSync.students.scanned,
          created: datalakeSync.students.created,
          updated: datalakeSync.students.updated,
          errors: datalakeSync.students.errors.length,
        },
        calendar: {
          scanned: datalakeSync.calendar.scanned,
          found: datalakeSync.calendar.found,
          errors: datalakeSync.calendar.errors.length,
        },
      },
    });
  } catch (error) {
    console.error('❌ Scheduled sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
