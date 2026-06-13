import { NextRequest, NextResponse } from 'next/server';
import { backgroundSyncService } from '@/lib/background-sync';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    console.log('Starting manual folder sync...');
    await backgroundSyncService.runFullSync();
    console.log('✅ Folder sync completed');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Folder sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
