import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive-simple';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const students = await googleDriveService.findStudentFolders(query);

    return NextResponse.json({
      success: true,
      students,
      count: students.length
    });

  } catch (error) {
    console.error('Error searching students:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search students',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
