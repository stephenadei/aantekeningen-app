import { NextResponse } from 'next/server';
import { datalakeService } from '@/lib/datalake-simple';

export async function GET() {
  try {
    console.log('🔍 Debug endpoint called - checking Datalake status...');

    // Check environment variables
    const envCheck = {
      MINIO_ENDPOINT: !!process.env.MINIO_ENDPOINT,
      MINIO_PORT: !!process.env.MINIO_PORT,
      MINIO_ACCESS_KEY: !!process.env.MINIO_ACCESS_KEY,
      MINIO_SECRET_KEY: !!process.env.MINIO_SECRET_KEY,
    };

    console.log('📋 Environment variables status:', envCheck);

    // Try to access datalake
    let apiStatus = 'unknown';
    let errorMessage = null;
    let studentCount = 0;

    try {
      // Test if we can access the datalake
      const students = await datalakeService.getAllStudentFolders();
      studentCount = students.length;
      apiStatus = 'working';
      console.log('✅ Datalake is working, found', studentCount, 'students');
    } catch (error) {
      apiStatus = 'error';
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Datalake error:', errorMessage);
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
