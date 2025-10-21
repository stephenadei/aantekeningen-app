import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive-simple';
import { getFileMetadata, isFileMetadataFresh } from '@/lib/cache';
import { getStudent, getStudentByDriveFolderId, validateFirestoreStudentId, validateDriveFolderId } from '@/lib/firestore';
import { backgroundSyncService } from '@/lib/background-sync';
import { 
  StudentIdType, 
  detectIdType, 
  FirestoreStudentId, 
  DriveFolderId,
  isOk,
  isErr
} from '@/lib/types';
import { createErrorResponse, handleUnknownError, InvalidStudentIdError } from '@/lib/errors';

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
    const idType = searchParams.get('idType') as StudentIdType | null;
    
    console.log('📁 Files API called for studentId:', studentId, 'idType:', idType, 'limit:', limit, 'offset:', offset, 'refresh:', forceRefresh);

    if (!studentId) {
      console.log('❌ No studentId provided');
      return NextResponse.json(
        createErrorResponse(new InvalidStudentIdError('', 'unknown')),
        { status: 400 }
      );
    }

    let driveFolderId: DriveFolderId;
    let studentName: string | undefined;

    // Determine ID type and get Drive folder ID
    if (idType === 'drive') {
      console.log('🔄 Using ID as Drive folder ID (explicit mode)');
      const validationResult = await validateDriveFolderId(studentId);
      if (isErr(validationResult)) {
        console.log('❌ Invalid Drive folder ID:', validationResult.error);
        return NextResponse.json(
          createErrorResponse(handleUnknownError(validationResult.error)),
          { status: 400 }
        );
      }
      
      driveFolderId = validationResult.data;
      
      // Try to get student name from Firestore if possible
      const studentResult = await getStudentByDriveFolderId(validationResult.data);
      if (isOk(studentResult)) {
        studentName = studentResult.data.displayName;
      }
    } else if (idType === 'firestore') {
      console.log('🔄 Using ID as Firestore student ID (explicit mode)');
      const validationResult = await validateFirestoreStudentId(studentId);
      if (isErr(validationResult)) {
        console.log('❌ Invalid Firestore student ID:', validationResult.error);
        return NextResponse.json(
          createErrorResponse(handleUnknownError(validationResult.error)),
          { status: 400 }
        );
      }
      
      const studentResult = await getStudent(validationResult.data);
      if (isErr(studentResult)) {
        console.log('❌ Student not found:', studentResult.error);
        return NextResponse.json(
          createErrorResponse(handleUnknownError(studentResult.error)),
          { status: 404 }
        );
      }
      
      const student = studentResult.data;
      if (!student.driveFolderId) {
        return NextResponse.json(
          createErrorResponse(new InvalidStudentIdError(studentId, 'firestore')),
          { status: 400 }
        );
      }
      
      driveFolderId = student.driveFolderId;
      studentName = student.displayName;
    } else {
      // Auto-detect ID type (backward compatibility)
      console.log('🔄 Auto-detecting ID type...');
      try {
        const detectedType = detectIdType(studentId);
        console.log('✅ Detected ID type:', detectedType);
        
        if (detectedType === 'firestore') {
          const validationResult = await validateFirestoreStudentId(studentId);
          if (isErr(validationResult)) {
            return NextResponse.json(
              createErrorResponse(handleUnknownError(validationResult.error)),
              { status: 400 }
            );
          }
          
          const studentResult = await getStudent(validationResult.data);
          if (isErr(studentResult)) {
            return NextResponse.json(
              createErrorResponse(handleUnknownError(studentResult.error)),
              { status: 404 }
            );
          }
          
          const student = studentResult.data;
          if (!student.driveFolderId) {
            return NextResponse.json(
              createErrorResponse(new InvalidStudentIdError(studentId, 'firestore')),
              { status: 400 }
            );
          }
          
          driveFolderId = student.driveFolderId;
          studentName = student.displayName;
        } else {
          const validationResult = await validateDriveFolderId(studentId);
          if (isErr(validationResult)) {
            return NextResponse.json(
              createErrorResponse(handleUnknownError(validationResult.error)),
              { status: 400 }
            );
          }
          
          driveFolderId = validationResult.data;
          const studentResult = await getStudentByDriveFolderId(validationResult.data);
          if (isOk(studentResult)) {
            studentName = studentResult.data.displayName;
          }
        }
      } catch (error) {
        console.log('❌ Unable to determine ID type:', error);
        return NextResponse.json(
          createErrorResponse(handleUnknownError(error)),
          { status: 400 }
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
          modifiedTime: file.modifiedTime,
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
          aiAnalyzedAt: file.aiAnalyzedAt,
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
          studentName,
          idType: idType || detectIdType(studentId)
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
      studentName,
      idType: idType || detectIdType(studentId)
    });

  } catch (error) {
    console.error('❌ Error listing files:', error);
    return NextResponse.json(
      createErrorResponse(handleUnknownError(error)),
      { status: 500 }
    );
  }
}
