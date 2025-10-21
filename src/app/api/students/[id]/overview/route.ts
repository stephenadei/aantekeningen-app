import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive-simple';
import { getStudent, getStudentByDriveFolderId, validateFirestoreStudentId, validateDriveFolderId } from '@/lib/firestore';
import { 
  StudentIdType, 
  detectIdType, 
  FirestoreStudentId, 
  DriveFolderId,
  isOk,
  isErr
} from '@/lib/types';
import { createErrorResponse, handleUnknownError, InvalidStudentIdError, InvalidDriveFolderIdError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const { searchParams } = new URL(request.url);
    const idType = searchParams.get('idType') as StudentIdType | null;
    
    console.log('📊 Overview API called for studentId:', studentId, 'idType:', idType);

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

    console.log('🔄 Fetching student overview from Google Drive...');
    const overview = await googleDriveService.getStudentOverview(driveFolderId);
    console.log('✅ Overview fetched:', overview);

    return NextResponse.json({
      success: true,
      overview,
      studentName,
      idType: idType || detectIdType(studentId)
    });

  } catch (error) {
    console.error('❌ Error getting student overview:', error);
    return NextResponse.json(
      createErrorResponse(handleUnknownError(error)),
      { status: 500 }
    );
  }
}
