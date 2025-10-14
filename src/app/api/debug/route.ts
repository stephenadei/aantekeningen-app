import { NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive-simple';

export async function GET() {
  try {
    console.log('🔍 Debug endpoint called - checking Google Drive API status...');

    // Check environment variables
    const envCheck = {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: !!process.env.GOOGLE_REDIRECT_URI,
      GOOGLE_REFRESH_TOKEN: !!process.env.GOOGLE_REFRESH_TOKEN,
    };

    console.log('📋 Environment variables status:', envCheck);

    // Try to initialize and test Google Drive API
    let apiStatus = 'unknown';
    let errorMessage = null;
    let studentCount = 0;

    try {
      // Test if we can get students (this will initialize the API)
      const students = await googleDriveService.getAllStudents();
      studentCount = students.length;
      apiStatus = 'working';
      console.log('✅ Google Drive API is working, found', studentCount, 'students');
    } catch (error) {
      apiStatus = 'error';
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Google Drive API error:', errorMessage);
    }

    return NextResponse.json({
      success: true,
      debug: {
        environment: envCheck,
        apiStatus,
        errorMessage,
        studentCount,
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
      }
    });

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
      }
    }, { status: 500 });
  }
}
