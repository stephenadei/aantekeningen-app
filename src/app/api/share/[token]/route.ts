import { NextRequest, NextResponse } from 'next/server';
import { getStudentByShareToken } from '@/lib/share-token';
import { datalakeService } from '@/lib/datalake-simple';
import { resolveDatalakePathForStudent } from '@/lib/student-resolution';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Share token is required' },
        { status: 400 }
      );
    }

    // Get student by share token
    const student = await getStudentByShareToken(token);

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student niet gevonden voor dit share token' },
        { status: 404 }
      );
    }

    // Resolve the student's datalake location through the single shared seam
    // (stored path -> targeted name-lookup fallback). Replaces a per-route
    // getAllStudentFolders()+linear-scan that loaded every folder per request.
    const location = await resolveDatalakePathForStudent(
      {
        datalakePath: student.datalakePath,
        driveFolderId: (student as { driveFolderId?: string }).driveFolderId,
        name: student.name,
      },
      { getStudentPath: (name, subject) => datalakeService.getStudentPath(name, subject) },
    );
    const studentPath: string | null = location.kind === 'resolved' ? location.datalakePath : null;

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        displayName: student.name, // Add displayName for consistency
        datalakePath: studentPath
      }
    });

  } catch (error) {
    console.error('❌ Error getting student by share token:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}



