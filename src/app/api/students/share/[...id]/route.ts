import { NextRequest, NextResponse } from 'next/server';
import { getStudent, getStudentByDriveFolderId, validateFirestoreStudentId, validateDriveFolderId } from '@/lib/database';
import { config, ensureConfigValidated } from '@/lib/config';
import { extractSubjectFromDatalakePath } from '@stephen/datalake';
import { 
  StudentIdType, 
  detectIdType, 
  FirestoreStudentId, 
  DriveFolderId,
  isOk,
  isErr,
  createFirestoreStudentId,
  createDriveFolderId
} from '@/lib/types';
import { createErrorResponse, handleUnknownError, InvalidStudentIdError } from '@/lib/errors';
import { getOrCreateShareToken } from '@/lib/share-token';
import { prisma } from '@stephen/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string[] }> }
) {
  try {
    const { id: idArray } = await params;
    const id = idArray.join('/'); // Join array segments back into path
    const { searchParams } = new URL(request.url);
    const idType = searchParams.get('idType') as StudentIdType | null;
    
    if (!id) {
      return NextResponse.json(
        createErrorResponse(new InvalidStudentIdError('', 'unknown')),
        { status: 400 }
      );
    }

    let student: { id: string; displayName: string; subject?: string | null; driveFolderId?: string | null } | null = null;
    let actualId: string = '';

    // Determine ID type and get student info
    if (idType === 'drive') {
      console.log('🔄 Using ID as Drive folder ID (explicit mode)');
      const validationResult = await validateDriveFolderId(id);
      if (isErr(validationResult)) {
        console.log('❌ Invalid Drive folder ID:', validationResult.error);
        return NextResponse.json(
          createErrorResponse(handleUnknownError(validationResult.error)),
          { status: 400 }
        );
      }
      
      const studentResult = await getStudentByDriveFolderId(validationResult.data);
      if (isErr(studentResult)) {
        console.log('❌ Student not found with Drive folder ID:', studentResult.error);
        return NextResponse.json(
          createErrorResponse(handleUnknownError(studentResult.error)),
          { status: 404 }
        );
      }
      
      student = { 
        id: studentResult.data.id, 
        displayName: studentResult.data.displayName,
        subject: studentResult.data.subject,
        driveFolderId: studentResult.data.driveFolderId
      };
      actualId = validationResult.data; // Use Drive folder ID for sharing
    } else if (idType === 'firestore') {
      console.log('🔄 Using ID as Firestore student ID (explicit mode)');
      const validationResult = await validateFirestoreStudentId(id);
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
      
      student = { 
        id: studentResult.data.id, 
        displayName: studentResult.data.displayName,
        subject: studentResult.data.subject,
        driveFolderId: studentResult.data.driveFolderId
      };
      actualId = validationResult.data; // Use student ID for sharing
    } else {
      // Auto-detect ID type (backward compatibility)
      console.log('🔄 Auto-detecting ID type...');
      try {
        const detectedType = detectIdType(id);
        console.log('✅ Detected ID type:', detectedType);
        
        if (detectedType === 'firestore') {
          const studentResult = await getStudent(createFirestoreStudentId(id));
          if (isOk(studentResult)) {
            const dbStudent = await prisma.student.findUnique({ where: { id: studentResult.data.id } });
            student = { 
              id: studentResult.data.id, 
              displayName: studentResult.data.displayName,
              subject: extractSubjectFromDatalakePath(dbStudent?.datalakePath || null) || undefined,
              driveFolderId: studentResult.data.driveFolderId
            };
            actualId = id;
          } else {
            student = null;
          }
        } else {
          // Handle datalake paths with slashes
          if (id.includes('/')) {
            try {
              const driveFolderId = createDriveFolderId(id);
              const studentResult = await getStudentByDriveFolderId(driveFolderId);
              if (isOk(studentResult)) {
                const dbStudent = await prisma.student.findUnique({ where: { id: studentResult.data.id } });
                student = { 
                  id: studentResult.data.id, 
                  displayName: studentResult.data.displayName,
                  subject: extractSubjectFromDatalakePath(dbStudent?.datalakePath || null) || undefined,
                  driveFolderId: studentResult.data.driveFolderId
                };
                actualId = id;
              } else {
                student = null;
              }
            } catch (error) {
              // If validation fails, try without validation
              const studentResult = await getStudentByDriveFolderId(id as DriveFolderId);
              if (isOk(studentResult)) {
                const dbStudent = await prisma.student.findUnique({ where: { id: studentResult.data.id } });
                student = { 
                  id: studentResult.data.id, 
                  displayName: studentResult.data.displayName,
                  subject: extractSubjectFromDatalakePath(dbStudent?.datalakePath || null) || undefined,
                  driveFolderId: studentResult.data.driveFolderId
                };
                actualId = id;
              } else {
                student = null;
              }
            }
          } else {
            const studentResult = await getStudentByDriveFolderId(createDriveFolderId(id));
            if (isOk(studentResult)) {
              const dbStudent = await prisma.student.findUnique({ where: { id: studentResult.data.id } });
              student = { 
                id: studentResult.data.id, 
                displayName: studentResult.data.displayName,
                subject: extractSubjectFromDatalakePath(dbStudent?.datalakePath || null) || undefined,
                driveFolderId: studentResult.data.driveFolderId
              };
              actualId = id;
            } else {
              student = null;
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
    
    if (!student) {
      return NextResponse.json(
        createErrorResponse(new InvalidStudentIdError(id, idType || 'unknown')),
        { status: 404 }
      );
    }

    // Get or create share token for this student
    // First, try to find student in database by datalakePath or ID
    let dbStudent = null;
    let datalakePath: string | null = null;
    
    // Determine datalakePath from actualId
    if (actualId.includes('/')) {
      // It's a datalake path
      datalakePath = actualId;
      dbStudent = await prisma.student.findFirst({
        where: { datalakePath: actualId }
      });
    } else {
      // Try to find by student ID or Drive folder ID
      dbStudent = await prisma.student.findFirst({
        where: {
          OR: [
            { id: actualId },
            // Note: We don't store Drive folder IDs in the database, so we'll use datalakePath
          ]
        }
      });
      
      if (dbStudent) {
        datalakePath = dbStudent.datalakePath;
      } else {
        // Try to find by datalakePath that matches the student name
        // This is a fallback if the student isn't found by ID
        const studentName = student.displayName;
        if (studentName) {
          dbStudent = await prisma.student.findFirst({
            where: {
              name: {
                equals: studentName,
                mode: 'insensitive'
              }
            }
          });
          if (dbStudent) {
            datalakePath = dbStudent.datalakePath;
          }
        }
      }
    }

    // Generate or get share token
    let shareToken: string;
    try {
      if (datalakePath) {
        const tokenResult = await getOrCreateShareToken({ datalakePath });
        shareToken = tokenResult.token;
      } else if (dbStudent?.id) {
        const tokenResult = await getOrCreateShareToken({ studentId: dbStudent.id });
        shareToken = tokenResult.token;
      } else {
        // Fallback: create a token based on student ID hash
        // This is not ideal but ensures we always have a shareable link
        console.warn('⚠️ Could not find student in database, using fallback token generation');
        const crypto = await import('crypto');
        const hash = crypto.createHash('sha256').update(actualId).digest('hex').substring(0, 12);
        shareToken = hash;
      }
    } catch (error) {
      console.error('❌ Error generating share token:', error);
      // Fallback to old method if token generation fails
      ensureConfigValidated();
      const baseUrl = config.baseUrl;
      const shareableUrl = `${baseUrl}/student/${actualId}`;
      
      return NextResponse.json({
        success: true,
        student: {
          id: student.id,
          displayName: student.displayName,
          subject: extractSubjectFromDatalakePath(dbStudent?.datalakePath || null) || undefined,
          driveFolderId: student.driveFolderId
        },
        shareableUrl: shareableUrl,
        directDriveUrl: student.driveFolderId ? `https://drive.google.com/drive/folders/${student.driveFolderId}` : null,
        message: 'Shareable link generated successfully (fallback)',
        idType: idType || detectIdType(id)
      });
    }

    // Generate shareable link using share token
    ensureConfigValidated();
    const baseUrl = config.baseUrl;
    const shareableUrl = `${baseUrl}/share/${shareToken}`;
    
    const dbStudentFinal = await prisma.student.findFirst({ where: { id: student.id } });
    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        displayName: student.displayName,
        subject: extractSubjectFromDatalakePath(dbStudentFinal?.datalakePath || null) || undefined,
        driveFolderId: student.driveFolderId
      },
      shareableUrl: shareableUrl,
      shareToken: shareToken,
      directDriveUrl: student.driveFolderId ? `https://drive.google.com/drive/folders/${student.driveFolderId}` : null,
      message: 'Shareable link generated successfully',
      idType: idType || detectIdType(id)
    });

  } catch (error) {
    console.error('❌ Error generating shareable link:', error);
    return NextResponse.json(
      createErrorResponse(handleUnknownError(error)),
      { status: 500 }
    );
  }
}




