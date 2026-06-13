import { NextRequest, NextResponse } from 'next/server';
import { datalakeService } from '@/lib/datalake-simple';
import { getStudent, getStudentByDriveFolderId, validateFirestoreStudentId, validateDriveFolderId } from '@/lib/database';
import { StudentIdType, detectIdType, FirestoreStudentId, DriveFolderId } from '@/lib/types';
import { createErrorResponse, handleUnknownError, InvalidStudentIdError } from '@/lib/errors';
import { resolveStudentRequest } from '@/lib/student-resolution';

// Overview shares the resolution seam but does NOT wire the Prisma-by-id lookup,
// preserving its existing behaviour (CUID/UUID ids resolve via getStudent).
const identityDeps = {
  getStudentPath: (name: string, subject?: string) => datalakeService.getStudentPath(name, subject),
  detectIdType,
  validateFirestoreStudentId,
  validateDriveFolderId,
  getStudent: (id: string) => getStudent(id as FirestoreStudentId),
  getStudentByDriveFolderId: (id: string) => getStudentByDriveFolderId(id as DriveFolderId),
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string[] }> }
) {
  try {
    const { id: idArray } = await params;
    const studentId = idArray.join('/'); // Join array segments back into path
    const { searchParams } = new URL(request.url);
    const idType = searchParams.get('idType') as StudentIdType | null;

    if (!studentId) {
      return NextResponse.json(
        createErrorResponse(new InvalidStudentIdError('', 'unknown')),
        { status: 400 }
      );
    }

    const resolution = await resolveStudentRequest(studentId, idType, identityDeps);
    if (resolution.kind === 'invalid') {
      return NextResponse.json(createErrorResponse(handleUnknownError(resolution.error)), { status: 400 });
    }
    if (resolution.kind === 'not-found') {
      return NextResponse.json(
        createErrorResponse(new InvalidStudentIdError(resolution.message, idType || 'unknown')),
        { status: 404 }
      );
    }
    if (resolution.kind === 'no-files' || resolution.kind === 'no-notes') {
      // Student exists but has no datalake files yet.
      return NextResponse.json({
        success: true,
        overview: { fileCount: 0, lastActivity: 'no files', lastActivityDate: new Date().toISOString(), lastFile: undefined },
        studentName: resolution.studentName,
        idType: 'firestore',
      });
    }

    const { datalakePath, studentName, idType: resolvedIdType } = resolution;
    const overview = await datalakeService.getStudentOverview(datalakePath, studentName || undefined);

    return NextResponse.json({
      success: true,
      overview,
      studentName,
      idType: resolvedIdType,
    });

  } catch (error) {
    console.error('❌ Error getting student overview:', error);
    return NextResponse.json(
      createErrorResponse(handleUnknownError(error)),
      { status: 500 }
    );
  }
}
