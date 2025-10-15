import { NextRequest, NextResponse } from 'next/server';
import { syncDriveFolders } from '@/lib/folder-sync';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Starting scheduled folder sync...');
    const result = await syncDriveFolders();
    console.log(`Scheduled sync completed. Processed ${result.processed} folders.`);
    
    return NextResponse.json({ 
      success: true, 
      processed: result.processed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Scheduled sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
