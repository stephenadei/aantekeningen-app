import { NextResponse } from 'next/server';
import { backgroundSyncService } from '@/lib/background-sync';

export async function GET() {
  try {
    console.log('🔄 Starting metadata preload via GET...');
    
    // Use background sync service to sync all students
    await backgroundSyncService.runFullSync();
    
    return NextResponse.json({
      success: true,
      message: 'Metadata preload started successfully',
      data: { status: 'running' }
    });
  } catch (error) {
    console.error('❌ Error in metadata preload endpoint:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log('🔄 Starting metadata preload...');
    
    // Use background sync service to sync all students
    await backgroundSyncService.runFullSync();
    
    return NextResponse.json({
      success: true,
      message: 'Metadata preload started successfully',
      data: { status: 'running' }
    });
  } catch (error) {
    console.error('❌ Error in metadata preload endpoint:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
