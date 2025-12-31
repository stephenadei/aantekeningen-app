import { NextRequest, NextResponse } from 'next/server';
import { datalakeService } from '@/lib/datalake-simple';
import { getFileMetadata, isFileMetadataFresh } from '@/lib/cache';
import { getStudent, getStudentByDriveFolderId, validateFirestoreStudentId, validateDriveFolderId } from '@/lib/database';
import { backgroundSyncService } from '@/lib/background-sync';
import { prisma } from '@stephen/database';
import { formatFileTitle } from '@/lib/title-formatter';
import { 
  StudentIdType, 
  detectIdType, 
  FirestoreStudentId, 
  DriveFolderId,
  createDriveFolderId,
  createCleanFileName,
  isOk,
  isErr
} from '@/lib/types';
import { createErrorResponse, handleUnknownError, InvalidStudentIdError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string[] }> }
) {
  try {
    const { id: idArray } = await params;
    const studentId = idArray.join('/'); // Join array segments back into path
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
      
      // Try to get student name from database if possible
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
      // Use datalakePath as driveFolderId if driveFolderId is not available
      let folderId = student.driveFolderId || student.datalakePath;
      
          // If no folderId, try to find datalake path from student name
          // Database uses 'name' but Student interface uses 'displayName'
          const studentNameForLookup = (student as any).name || student.displayName;
          if (!folderId && studentNameForLookup) {
            console.log(`🔍 No datalakePath found, searching datalake for student: ${studentNameForLookup}`);
            const datalakePath = await datalakeService.getStudentPath(studentNameForLookup, student.subject || undefined);
            if (datalakePath) {
              folderId = datalakePath;
              console.log(`✅ Found datalake path: ${datalakePath}`);
            } else {
              console.log(`⚠️ No datalake path found for student: ${studentNameForLookup}`);
              // Return empty files list instead of error - student exists but has no files
              return NextResponse.json({
                success: true,
                files: [],
                studentName: studentNameForLookup,
                hasMore: false
              });
            }
          }
          
          if (!folderId) {
            return NextResponse.json(
              createErrorResponse(new InvalidStudentIdError(studentId, 'firestore')),
              { status: 400 }
            );
          }
          
          driveFolderId = folderId as DriveFolderId;
          studentName = studentNameForLookup || student.displayName;
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
          // Use datalakePath as driveFolderId if driveFolderId is not available
          let folderId = student.driveFolderId || student.datalakePath;
          
          // If no folderId, try to find datalake path from student name
          // Database uses 'name' but Student interface uses 'displayName'
          const studentNameForLookup = (student as any).name || student.displayName;
          if (!folderId && studentNameForLookup) {
            console.log(`🔍 No datalakePath found, searching datalake for student: ${studentNameForLookup}`);
            const datalakePath = await datalakeService.getStudentPath(studentNameForLookup, student.subject || undefined);
            if (datalakePath) {
              folderId = datalakePath;
              console.log(`✅ Found datalake path: ${datalakePath}`);
            } else {
              console.log(`⚠️ No datalake path found for student: ${studentNameForLookup}`);
              // Return empty files list instead of error - student exists but has no files
              return NextResponse.json({
                success: true,
                files: [],
                studentName: studentNameForLookup,
                hasMore: false
              });
            }
          }
          
          if (!folderId) {
            return NextResponse.json(
              createErrorResponse(new InvalidStudentIdError(studentId, 'firestore')),
              { status: 400 }
            );
          }
          
          driveFolderId = folderId as DriveFolderId;
          studentName = studentNameForLookup || student.displayName;
        } else {
          // Check if it's a datalake path (contains slashes)
          if (studentId.includes('/')) {
            // It's a datalake path, validate and create DriveFolderId
            try {
              driveFolderId = createDriveFolderId(studentId);
              const pathParts = studentId.split('/').filter(p => p); // Remove empty parts
              // Student name is the last non-empty part of the path
              const studentNameFromPath = pathParts[pathParts.length - 1];
              if (studentNameFromPath) {
                studentName = studentNameFromPath;
              }
              
              // Try to get from database if available (for metadata)
              try {
                const studentResult = await getStudentByDriveFolderId(driveFolderId);
                if (isOk(studentResult)) {
                  studentName = studentResult.data.displayName;
                }
              } catch (error) {
                // Ignore database errors, use extracted name
              }
            } catch (error) {
              // If validation fails, still use the path but log the error
              console.error('Error validating datalake path:', error);
              driveFolderId = studentId as DriveFolderId; // Fallback to type assertion
              const pathParts = studentId.split('/').filter(p => p); // Remove empty parts
              const studentNameFromPath = pathParts[pathParts.length - 1]; // Last part is student name
              if (studentNameFromPath) {
                studentName = studentNameFromPath;
              }
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
    
    // Check if studentId is a Prisma database ID (not a path)
    // Prisma IDs are typically CUIDs (24 chars) or UUIDs
    let datalakePath: string | null = null;
    let isPrismaId = false;
    
    // Check if it looks like a Prisma ID (CUID or UUID format, no slashes)
    if (!studentId.includes('/') && (studentId.length >= 20 || studentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
      try {
        // Try to find student in Prisma database
        const dbStudent = await prisma.student.findUnique({
          where: { id: studentId },
          select: { id: true, name: true, datalakePath: true }
        });
        
        if (dbStudent) {
          isPrismaId = true;
          studentName = dbStudent.name;
          datalakePath = dbStudent.datalakePath;
          
          if (!datalakePath) {
            // Student exists in database but has no datalakePath (no notes yet)
            return NextResponse.json({
              success: true,
              files: [],
              count: 0,
              message: 'Deze student heeft nog geen aantekeningen',
              studentName: dbStudent.name,
              hasNotes: false
            });
          }
        }
      } catch (error) {
        console.log('⚠️ Error checking Prisma database:', error);
        // Continue with normal flow
      }
    }
    
    // If studentId is already a datalake path, use it directly
    if (!datalakePath) {
      if (studentId.includes('/')) {
        // It's already a full datalake path (e.g., "notability/Priveles/VO/Teresa")
        datalakePath = studentId;
        if (!studentName) {
          const pathParts = studentId.split('/').filter(p => p); // Filter out empty parts
          studentName = pathParts[pathParts.length - 1]; // Last part is student name
        }
      } else {
        // It's just a student name, need to find the path
        if (!studentName) {
          // Try to extract student name from driveFolderId if it's a path
          if (driveFolderId && driveFolderId.includes('/')) {
            const pathParts = driveFolderId.split('/');
            studentName = pathParts[pathParts.length - 1];
          } else if (driveFolderId) {
            studentName = driveFolderId;
          }
        }
        
        if (!studentName) {
          return NextResponse.json(
            createErrorResponse(new InvalidStudentIdError(studentId, 'firestore')),
            { status: 400 }
          );
        }
        
        // Find the datalake path for this student
        datalakePath = await datalakeService.getStudentPath(studentName) || '';
        if (!datalakePath) {
          return NextResponse.json(
            createErrorResponse(new InvalidStudentIdError(`Student folder not found: ${studentName}`, 'firestore')),
            { status: 404 }
          );
        }
      }
    }
    
    // Extract student name from path if not already set
    if (!studentName && datalakePath) {
      const pathParts = datalakePath.split('/').filter(p => p); // Filter out empty parts
      studentName = pathParts[pathParts.length - 1];
    }
    
    // List files using the full datalake path (pass path as first param, empty string as second)
    const allFiles = await datalakeService.listFilesInFolder(datalakePath, '');
    
    // Optionally enrich with cache metadata (AI analysis, etc.)
    if (!forceRefresh) {
      const cachedFiles = await getFileMetadata(studentId);
      if (cachedFiles.length > 0) {
        const cacheMap = new Map(cachedFiles.map(f => [f.id, f]));
        
        // Merge cache metadata with datalake files
        const enrichedFiles = allFiles.map(file => {
          const cached = cacheMap.get(file.id);
          if (cached) {
            // Create enriched file with proper types
            const enrichedFile: typeof file = {
              ...file,
              topic: cached.topic,
              level: cached.level,
              schoolYear: cached.schoolYear,
              keywords: cached.keywords,
              summary: cached.summary,
              summaryEn: cached.summaryEn,
              topicEn: cached.topicEn,
              keywordsEn: cached.keywordsEn,
              aiAnalyzedAt: cached.aiAnalyzedAt ? new Date(cached.aiAnalyzedAt) : undefined,
            };
            // Update title with enhanced formatting
            const formattedTitle = formatFileTitle(enrichedFile);
            return {
              ...enrichedFile,
              title: createCleanFileName(formattedTitle)
            };
          }
          // Update title with enhanced formatting even if no cache
          const formattedTitle = formatFileTitle(file);
          return {
            ...file,
            title: createCleanFileName(formattedTitle)
          };
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

    // Trigger background sync to update datalake metadata (non-blocking, optional)
    backgroundSyncService.forceSyncStudent(studentId).catch(error => {
      console.error('Background sync failed (non-critical):', error);
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




