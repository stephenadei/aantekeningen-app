import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, isAuthorizedAdmin } from '@/lib/auth';
import { getAllStudents } from '@/lib/database';
import { datalakeService } from '@/lib/datalake-simple';
import { isErr, createStudentName } from '@/lib/types';
import type { FoldersListResponse } from '@/lib/interfaces';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all students from database
    const studentsResult = await getAllStudents();
    if (isErr(studentsResult)) {
      return NextResponse.json({ error: studentsResult.error.message }, { status: 500 });
    }

    const students = studentsResult.data;

    // Get all student folders from datalake
    const datalakeStudents = await datalakeService.getAllStudentFolders();

    // Create maps for easier lookup
    const studentsMap = new Map(students.map(s => [s.id, s]));
    const datalakeStudentsMap = new Map();
    datalakeStudents.forEach(ds => {
      const studentName = typeof ds.name === 'string' ? ds.name : String(ds.name);
      datalakeStudentsMap.set(studentName, ds);
    });

    // Find linked folders (students with matching datalake folders)
    const linkedFolders = students
      .filter(student => {
        const studentName = student.displayName;
        return datalakeStudentsMap.has(studentName);
      })
      .map(student => {
        const studentName = student.displayName;
        const datalakeStudent = datalakeStudentsMap.get(studentName);
        return {
          student,
          folderId: datalakeStudent?.id || '',
          folderName: studentName,
          fileCount: 0 // TODO: Get actual file count from datalake
        };
      });

    // Find unlinked folders (datalake folders not matched to students)
    const linkedStudentNames = new Set<string>(students.map(s => s.displayName));
    const unlinkedFolders = datalakeStudents
      .filter(ds => {
        const studentNameStr = typeof ds.name === 'string' ? ds.name : String(ds.name);
        return !linkedStudentNames.has(studentNameStr);
      })
      .map(ds => {
        const studentNameStr = typeof ds.name === 'string' ? ds.name : String(ds.name);
        // Try to suggest a student based on name matching
        const suggestedStudent = students.find(s => 
          s.displayName.toLowerCase().includes(studentNameStr.toLowerCase()) ||
          studentNameStr.toLowerCase().includes(s.displayName.toLowerCase())
        );

        return {
          id: typeof ds.id === 'string' ? ds.id : String(ds.id),
          name: studentNameStr,
          subject: typeof ds.subject === 'string' ? ds.subject : String(ds.subject),
          suggestedStudentId: suggestedStudent?.id || undefined
        };
      });

    // Find students without folders
    const studentsWithoutFolders = students.filter(s => {
      const studentName = s.displayName;
      return !datalakeStudentsMap.has(studentName);
    });

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
    const { user, error } = await getAuthSession();
    
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

    // Update student - folderId is now just a reference, not a Google Drive ID
    const { updateStudent } = await import('@/lib/database');
    const { createFirestoreStudentId, createDriveFolderId } = await import('@/lib/types');

    const result = await updateStudent(
      createFirestoreStudentId(studentId),
      { driveFolderId: createDriveFolderId(folderId) } // Can be datalake path or legacy Drive ID
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
