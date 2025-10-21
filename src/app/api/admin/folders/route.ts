import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { getAllStudents } from '@/lib/firestore';
import { googleDriveService } from '@/lib/google-drive-simple';
import { isErr } from '@/lib/types';
import type { FoldersListResponse } from '@/lib/interfaces';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all students from Firestore
    const studentsResult = await getAllStudents();
    if (isErr(studentsResult)) {
      return NextResponse.json({ error: studentsResult.error.message }, { status: 500 });
    }

    const students = studentsResult.data;

    // Get all Drive folders
    const driveStudents = await googleDriveService.getAllStudents();

    // Create maps for easier lookup
    const studentsMap = new Map(students.map(s => [s.id, s]));
    const driveStudentsMap = new Map(driveStudents.map(ds => [ds.id, ds]));

    // Find linked folders (students with driveFolderId)
    const linkedFolders = students
      .filter(student => student.driveFolderId)
      .map(student => {
        const driveStudent = driveStudentsMap.get(student.driveFolderId!);
        return {
          student,
          folderId: student.driveFolderId!,
          folderName: driveStudent?.name || 'Unknown Folder',
          fileCount: 0 // TODO: Get actual file count
        };
      });

    // Find unlinked folders (Drive folders not matched to students)
    const linkedFolderIds = new Set(students.map(s => s.driveFolderId).filter(Boolean));
    const unlinkedFolders = driveStudents
      .filter(ds => !linkedFolderIds.has(ds.id))
      .map(ds => {
        // Try to suggest a student based on name matching
        const suggestedStudent = students.find(s => 
          s.displayName.toLowerCase().includes(ds.name.toLowerCase()) ||
          ds.name.toLowerCase().includes(s.displayName.toLowerCase())
        );

        return {
          id: ds.id,
          name: ds.name,
          subject: ds.subject,
          suggestedStudentId: suggestedStudent?.id || undefined
        };
      });

    // Find students without folders
    const studentsWithoutFolders = students.filter(s => !s.driveFolderId);

    const response: FoldersListResponse = {
      linkedFolders,
      unlinkedFolders,
      studentsWithoutFolders
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { folderId, studentId } = body;

    if (!folderId || !studentId) {
      return NextResponse.json(
        { error: 'Folder ID and Student ID are required' },
        { status: 400 }
      );
    }

    // Update student with driveFolderId
    const { updateStudent } = await import('@/lib/firestore');
    const { createFirestoreStudentId, createDriveFolderId } = await import('@/lib/types');

    const result = await updateStudent(
      createFirestoreStudentId(studentId),
      { driveFolderId: createDriveFolderId(folderId) }
    );

    if (isErr(result)) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Folder linked successfully',
      student: result.data
    });

  } catch (error) {
    console.error('Error linking folder:', error);
    return NextResponse.json(
      { error: 'Failed to link folder' },
      { status: 500 }
    );
  }
}
