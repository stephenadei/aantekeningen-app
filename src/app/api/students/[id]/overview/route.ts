import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive-simple';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folderId } = await params;

    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    const overview = await googleDriveService.getStudentOverview(folderId);

    return NextResponse.json({
      success: true,
      overview
    });

  } catch (error) {
    console.error('Error getting student overview:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get student overview',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
