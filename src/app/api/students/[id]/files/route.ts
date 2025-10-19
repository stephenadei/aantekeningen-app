import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive-simple';
import { getFileMetadata, isFileMetadataFresh } from '@/lib/cache';
import { getStudent } from '@/lib/firestore';
import { backgroundSyncService } from '@/lib/background-sync';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    console.log('📁 Files API called for studentId:', studentId, 'limit:', limit, 'offset:', offset, 'refresh:', forceRefresh);

    if (!studentId) {
      console.log('❌ No studentId provided');
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Get student info - try Firestore first
    const student = await getStudent(studentId);
    let driveFolderId = student?.driveFolderId;

    // If not found in Firestore, check if studentId is actually a Drive folder ID
    if (!student || !driveFolderId) {
      console.log('🔄 Student not found in Firestore, checking if ID is a Drive folder ID...');
      
      // Assume the ID is a Drive folder ID and try to use it directly
      if (studentId.length > 20) { // Drive folder IDs are typically longer
        driveFolderId = studentId;
        console.log('✅ Using provided ID as Drive folder ID (fallback mode)');
      } else {
        console.log('❌ Student not found and ID is not a valid Drive folder ID');
        return NextResponse.json(
          { error: 'Student not found or no Drive folder configured' },
          { status: 404 }
        );
      }
    }

    // Check if we should use Firestore cache or fallback to Google Drive
    const useFirestoreCache = !forceRefresh;
    
    if (useFirestoreCache) {
      console.log('🔄 Checking Firestore cache for student files...');
      
      // Try to get files from Firestore cache first
      const cachedFiles = await getFileMetadata(studentId);
      
      if (cachedFiles.length > 0) {
        console.log(`✅ Found ${cachedFiles.length} cached files in Firestore`);
        
        // Convert Firestore format to API format
        const apiFiles = cachedFiles.map(file => ({
          id: file.id,
          name: file.name,
          title: file.title,
          url: file.viewUrl,
          downloadUrl: file.downloadUrl,
          viewUrl: file.viewUrl,
          thumbnailUrl: file.thumbnailUrl,
          modifiedTime: file.modifiedTime.toDate().toISOString(),
          size: file.size,
          subject: file.subject,
          topic: file.topic,
          level: file.level,
          schoolYear: file.schoolYear,
          keywords: file.keywords,
          summary: file.summary,
          summaryEn: file.summaryEn,
          topicEn: file.topicEn,
          keywordsEn: file.keywordsEn,
          aiAnalyzedAt: file.aiAnalyzedAt?.toDate().toISOString(),
        }));

        // Apply pagination
        let files = apiFiles;
        if (limit) {
          const limitNum = parseInt(limit);
          const offsetNum = offset ? parseInt(offset) : 0;
          files = apiFiles.slice(offsetNum, offsetNum + limitNum);
        }

        // Check if cache is fresh, if not trigger background refresh
        const isFresh = await isFileMetadataFresh(studentId, 6); // 6 hours
        if (!isFresh) {
          console.log('🔄 Cache is stale, triggering background refresh...');
          // Trigger background sync (don't wait for it)
          backgroundSyncService.forceSyncStudent(studentId).catch(error => {
            console.error('Background sync failed:', error);
          });
        }

        return NextResponse.json({
          success: true,
          files,
          count: files.length,
          totalCount: apiFiles.length,
          hasMore: limit ? (apiFiles.length > (parseInt(limit) + (offset ? parseInt(offset) : 0))) : false,
          fromCache: true,
          cacheFresh: isFresh,
        });
      }
    }

    // Fallback to Google Drive API
    console.log('🔄 Cache miss or force refresh, fetching from Google Drive...');
    const allFiles = await googleDriveService.listFilesInFolder(driveFolderId);
    
    // Apply pagination if requested
    let files = allFiles;
    if (limit) {
      const limitNum = parseInt(limit);
      const offsetNum = offset ? parseInt(offset) : 0;
      files = allFiles.slice(offsetNum, offsetNum + limitNum);
    }
    
    console.log('✅ Files fetched from Google Drive:', files.length, 'files (total:', allFiles.length, ')');

    // Trigger background sync to update Firestore cache
    backgroundSyncService.forceSyncStudent(studentId).catch(error => {
      console.error('Background sync failed:', error);
    });

    return NextResponse.json({
      success: true,
      files,
      count: files.length,
      totalCount: allFiles.length,
      hasMore: limit ? (allFiles.length > (parseInt(limit) + (offset ? parseInt(offset) : 0))) : false,
      fromCache: false,
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
