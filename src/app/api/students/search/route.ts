import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive-simple';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Search endpoint called');
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      console.log('❌ No query parameter provided');
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Searching for:', query);

    // Check environment variables first
    const envCheck = {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: !!process.env.GOOGLE_REDIRECT_URI,
      GOOGLE_REFRESH_TOKEN: !!process.env.GOOGLE_REFRESH_TOKEN,
    };

    console.log('📋 Environment variables status:', envCheck);

    // Check if all required env vars are present
    const missingEnvVars = Object.entries(envCheck)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingEnvVars.length > 0) {
      console.error('❌ Missing environment variables:', missingEnvVars);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Configuration error',
          message: `Missing environment variables: ${missingEnvVars.join(', ')}`,
          debug: {
            missingEnvVars,
            nodeEnv: process.env.NODE_ENV
          }
        },
        { status: 500 }
      );
    }

    const students = await googleDriveService.findStudentFolders(query);

    console.log('✅ Search completed, found', students.length, 'students');

    return NextResponse.json({
      success: true,
      students,
      count: students.length
    });

  } catch (error) {
    console.error('❌ Error searching students:', error);
    
    // Provide more detailed error information
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search students',
        ...errorDetails
      },
      { status: 500 }
    );
  }
}
