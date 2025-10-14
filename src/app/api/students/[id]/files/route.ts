import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive-simple';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folderId } = await params;
    console.log('📁 Files API called for folderId:', folderId);

    if (!folderId) {
      console.log('❌ No folderId provided');
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Fetching files from Google Drive...');
    const files = await googleDriveService.listFilesInFolder(folderId);
    console.log('✅ Files fetched:', files.length, 'files');

    return NextResponse.json({
      success: true,
      files,
      count: files.length
    });

  } catch (error) {
    console.error('❌ Error listing files:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to list files',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
