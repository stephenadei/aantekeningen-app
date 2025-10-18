import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive-simple';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folderId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    
    console.log('📁 Files API called for folderId:', folderId, 'limit:', limit, 'offset:', offset);

    if (!folderId) {
      console.log('❌ No folderId provided');
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Fetching files from Google Drive...');
    const allFiles = await googleDriveService.listFilesInFolder(folderId);
    
    // Apply pagination if requested
    let files = allFiles;
    if (limit) {
      const limitNum = parseInt(limit);
      const offsetNum = offset ? parseInt(offset) : 0;
      files = allFiles.slice(offsetNum, offsetNum + limitNum);
    }
    
    console.log('✅ Files fetched:', files.length, 'files (total:', allFiles.length, ')');

    return NextResponse.json({
      success: true,
      files,
      count: files.length,
      totalCount: allFiles.length,
      hasMore: limit ? (allFiles.length > (parseInt(limit) + (offset ? parseInt(offset) : 0))) : false
    });

  } catch (error) {
    console.error('❌ Error listing files:', error);
    
    // If this is a Google Drive error, it's likely a temporary issue
    // Return a more specific error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to list files',
        message: errorMessage,
        isTemporaryError: errorMessage.includes('Google Drive') || errorMessage.includes('Failed to load files')
      },
      { status: 500 }
    );
  }
}
