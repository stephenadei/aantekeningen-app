import { NextResponse } from 'next/server';
import { datalakeService } from '@/lib/datalake-simple';

export async function GET() {
  try {
    const result = await datalakeService.testDatalakeAccess();

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
