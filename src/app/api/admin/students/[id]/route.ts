import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { getStudent, updateStudent } from '@/lib/firestore';
import { getFileMetadata } from '@/lib/cache';
import { isErr, isFirestoreStudentId, createFirestoreStudentId, createStudentName, createEmail, createDriveFolderId, createSubject } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate student ID
    if (!isFirestoreStudentId(id)) {
      return NextResponse.json({ error: 'Invalid student ID format' }, { status: 400 });
    }

    const studentId = createFirestoreStudentId(id);
    
    // Get student from Firestore
    const studentResult = await getStudent(studentId);
    if (isErr(studentResult)) {
      return NextResponse.json({ error: studentResult.error.message }, { status: 404 });
    }

    const student = studentResult.data;

    // Get file metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let files: any[] = [];
    let fileCount = 0;
    let lastActivity = null;
    try {
      files = await getFileMetadata(student.id);
      fileCount = files.length;
      const lastFile = files.length > 0 ? files[0] : null;
      lastActivity = lastFile ? lastFile.modifiedTime : null;
    } catch (fileError) {
      console.log('Could not fetch file metadata:', fileError);
    }

    return NextResponse.json({ 
      success: true,
      student: {
        ...student,
        fileCount,
        lastActivity,
        files: files.slice(0, 10) // Return first 10 files
      }
    });

  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate student ID
    if (!isFirestoreStudentId(id)) {
      return NextResponse.json({ error: 'Invalid student ID format' }, { status: 400 });
    }

    const studentId = createFirestoreStudentId(id);
    const body = await request.json();
    const { displayName, email, subject, driveFolderId, isActive, tags } = body;

    // Build update object with validated types
    const updates: Record<string, unknown> = {};
    
    try {
      if (displayName !== undefined) {
        updates.displayName = createStudentName(displayName);
      }
      if (email !== undefined) {
        updates.email = email ? createEmail(email) : null;
      }
      if (subject !== undefined) {
        updates.subject = subject ? createSubject(subject) : null;
      }
      if (driveFolderId !== undefined) {
        updates.driveFolderId = driveFolderId ? createDriveFolderId(driveFolderId) : null;
      }
      if (isActive !== undefined) {
        updates.isActive = Boolean(isActive);
      }
      if (tags !== undefined) {
        updates.tags = tags;
      }
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : 'Validation failed' },
        { status: 400 }
      );
    }

    // Update student in Firestore
    const result = await updateStudent(studentId, updates);
    
    if (isErr(result)) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      student: result.data
    });

  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate student ID
    if (!isFirestoreStudentId(id)) {
      return NextResponse.json({ error: 'Invalid student ID format' }, { status: 400 });
    }

    const studentId = createFirestoreStudentId(id);
    
    // Soft delete by setting isActive to false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await updateStudent(studentId, { isActive: false } as any);
    
    if (isErr(result)) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Student deactivated successfully'
    });

  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    );
  }
}
