import { NextRequest, NextResponse } from 'next/server';
import { datalakeService } from '@/lib/datalake-simple';

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

    // Search directly in Datalake
    try {
      // Check if we have MinIO credentials
      const hasMinIOCredentials = !!(
        process.env.MINIO_ENDPOINT && 
        process.env.MINIO_ACCESS_KEY && 
        process.env.MINIO_SECRET_KEY
      );

      if (!hasMinIOCredentials) {
        return NextResponse.json({
          success: true,
          students: [],
          count: 0,
          message: 'MinIO credentials not configured. Please set MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY environment variables.'
        });
      }

      const datalakeStudents = await datalakeService.findStudentFolders(query);
      
      console.log(`✅ Found ${datalakeStudents.length} students in Datalake`);
      
      return NextResponse.json({
        success: true,
        students: datalakeStudents,
        count: datalakeStudents.length,
        fromDatalake: true
      });
    } catch (datalakeError) {
      console.error('❌ Datalake search failed:', datalakeError);
      return NextResponse.json({
        success: false,
        students: [],
        count: 0,
        error: 'Failed to search students in Datalake',
        message: datalakeError instanceof Error ? datalakeError.message : 'Unknown error'
      }, { status: 500 });
    }

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
