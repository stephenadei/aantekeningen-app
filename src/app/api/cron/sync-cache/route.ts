import { NextRequest, NextResponse } from 'next/server';
import { syncOrchestrator } from '@/lib/sync-orchestrator';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Cron job triggered: Starting background sync...');
    
    // Start background file sync (don't wait for completion)
    syncOrchestrator.syncFiles().catch(error => {
      console.error('Cron sync failed:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Background sync started',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
