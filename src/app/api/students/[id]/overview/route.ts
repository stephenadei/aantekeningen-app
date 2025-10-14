import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive-simple';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folderId } = await params;
    console.log('📊 Overview API called for folderId:', folderId);

    if (!folderId) {
      console.log('❌ No folderId provided');
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Fetching student overview from Google Drive...');
    const overview = await googleDriveService.getStudentOverview(folderId);
    console.log('✅ Overview fetched:', overview);

    return NextResponse.json({
      success: true,
      overview
    });

  } catch (error) {
    console.error('❌ Error getting student overview:', error);
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
