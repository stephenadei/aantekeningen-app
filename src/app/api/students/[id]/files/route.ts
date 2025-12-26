import { NextRequest, NextResponse } from 'next/server';
import { datalakeService } from '@/lib/datalake-simple';
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
          // Check if it's a datalake path (contains slashes)
          if (studentId.includes('/')) {
            // It's a datalake path, extract student name directly
            driveFolderId = studentId as DriveFolderId;
            const pathParts = studentId.split('/');
            const studentNameFromPath = pathParts[pathParts.length - 2]; // Second to last part
            if (studentNameFromPath) {
              studentName = studentNameFromPath;
            }
            
            // Try to get from Firestore if available (for metadata)
            try {
              const studentResult = await getStudentByDriveFolderId(driveFolderId);
              if (isOk(studentResult)) {
                studentName = studentResult.data.displayName;
              }
            } catch (error) {
              // Ignore Firestore errors, use extracted name
            }
          } else {
            // It's a Google Drive ID (legacy support)
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
        }
      } catch (error) {
        console.log('❌ Unable to determine ID type:', error);
        return NextResponse.json(
          createErrorResponse(handleUnknownError(error)),
          { status: 400 }
        );
      }
    }

    // Always fetch from Datalake first (primary source)
    console.log('🔄 Fetching files from Datalake...');
    if (!studentName) {
      // Try to extract student name from driveFolderId if it's a path
      if (driveFolderId.includes('/')) {
        const pathParts = driveFolderId.split('/');
        const studentNameFromPath = pathParts[pathParts.length - 2]; // Second to last part
        if (studentNameFromPath) {
          studentName = studentNameFromPath;
        }
      }
      
      if (!studentName) {
        return NextResponse.json(
          createErrorResponse(new InvalidStudentIdError(studentId, 'firestore')),
          { status: 400 }
        );
      }
    }
    
    const allFiles = await datalakeService.listFilesInFolder('', studentName);
    
    // Optionally enrich with Firestore cache metadata (AI analysis, etc.)
    if (!forceRefresh) {
      const cachedFiles = await getFileMetadata(studentId);
      if (cachedFiles.length > 0) {
        const cacheMap = new Map(cachedFiles.map(f => [f.id, f]));
        
        // Merge cache metadata with datalake files
        const enrichedFiles = allFiles.map(file => {
          const cached = cacheMap.get(file.id);
          if (cached) {
            return {
              ...file,
              topic: cached.topic,
              level: cached.level,
              schoolYear: cached.schoolYear,
              keywords: cached.keywords,
              summary: cached.summary,
              summaryEn: cached.summaryEn,
              topicEn: cached.topicEn,
              keywordsEn: cached.keywordsEn,
              aiAnalyzedAt: cached.aiAnalyzedAt,
            };
          }
          return file;
        });
        
        // Check if cache is fresh, if not trigger background refresh
        const isFresh = await isFileMetadataFresh(studentId, 6); // 6 hours
        if (!isFresh) {
          console.log('🔄 Cache is stale, triggering background refresh...');
          // Trigger background sync (don't wait for it)
          backgroundSyncService.forceSyncStudent(studentId).catch(error => {
            console.error('Background sync failed:', error);
          });
        }
        
        // Apply pagination
        let files = enrichedFiles;
        if (limit) {
          const limitNum = parseInt(limit);
          const offsetNum = offset ? parseInt(offset) : 0;
          files = enrichedFiles.slice(offsetNum, offsetNum + limitNum);
        }
        
        return NextResponse.json({
          success: true,
          files,
          count: files.length,
          totalCount: enrichedFiles.length,
          hasMore: limit ? (enrichedFiles.length > (parseInt(limit) + (offset ? parseInt(offset) : 0))) : false,
          fromCache: false,
          cacheEnriched: true,
          cacheFresh: isFresh,
          studentName,
          idType: idType || detectIdType(studentId)
        });
      }
    }
    
    // Apply pagination if requested
    let files = allFiles;
    if (limit) {
      const limitNum = parseInt(limit);
      const offsetNum = offset ? parseInt(offset) : 0;
      files = allFiles.slice(offsetNum, offsetNum + limitNum);
    }
    
    console.log('✅ Files fetched from Datalake:', files.length, 'files (total:', allFiles.length, ')');

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
