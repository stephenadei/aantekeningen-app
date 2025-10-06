import { NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive-simple';

export async function POST() {
  try {
    console.log('🔄 Starting metadata preload...');
    
    const result = await googleDriveService.preloadMetadata();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Error in metadata preload endpoint:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
