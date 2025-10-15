import { NextRequest, NextResponse } from 'next/server';
import { syncDriveFolders } from '@/lib/folder-sync';

export async function POST(request: NextRequest) {
  try {
    const result = await syncDriveFolders();
    return NextResponse.json({ 
      success: true, 
      processed: result.processed 
    });
  } catch (error) {
    console.error('Folder sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}
