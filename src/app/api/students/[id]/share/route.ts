import { NextRequest, NextResponse } from 'next/server';
import { getStudent, getStudentByDriveFolderId, validateFirestoreStudentId, validateDriveFolderId } from '@/lib/firestore';
import { config, ensureConfigValidated } from '@/lib/config';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      actualId = validationResult.data; // Use Firestore ID for sharing
    } else {
      // Auto-detect ID type (backward compatibility)
      console.log('🔄 Auto-detecting ID type...');
      try {
        const detectedType = detectIdType(id);
        console.log('✅ Detected ID type:', detectedType);
        
        if (detectedType === 'firestore') {
          const studentResult = await getStudent(createFirestoreStudentId(id));
          if (isOk(studentResult)) {
            student = { 
              id: studentResult.data.id, 
              displayName: studentResult.data.displayName,
              subject: studentResult.data.subject,
              driveFolderId: studentResult.data.driveFolderId
            };
            actualId = id;
          } else {
            student = null;
          }
        } else {
          const studentResult = await getStudentByDriveFolderId(createDriveFolderId(id));
          if (isOk(studentResult)) {
            student = { 
              id: studentResult.data.id, 
              displayName: studentResult.data.displayName,
              subject: studentResult.data.subject,
              driveFolderId: studentResult.data.driveFolderId
            };
            actualId = id;
          } else {
            student = null;
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

    // Generate shareable link using proper domain configuration
    ensureConfigValidated();
    const baseUrl = config.baseUrl;
    const shareableUrl = `${baseUrl}/student/${actualId}`;
    
    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        displayName: student.displayName,
        subject: student.subject,
        driveFolderId: student.driveFolderId
      },
      shareableUrl: shareableUrl,
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
