import { NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive-simple';

export async function GET() {
  try {
    const result = await googleDriveService.testDriveAccess();

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error testing drive access:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test drive access',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
