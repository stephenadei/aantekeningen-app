import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { getAllStudents, createStudent } from '@/lib/firestore';
import { getFileMetadata } from '@/lib/cache';
import { db } from '@/lib/firebase-admin';
import { isErr, createPin, createStudentName, createEmail, createDriveFolderId, createSubject } from '@/lib/types';
import type { Student, CreateStudentInput } from '@/lib/interfaces';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';
    const subject = searchParams.get('subject') || '';
    const activeFilter = searchParams.get('active');

    // Get all students from Firestore
    const studentsResult = await getAllStudents();
    if (isErr(studentsResult)) {
      return NextResponse.json({ error: studentsResult.error.message }, { status: 500 });
    }

    // Also get student IDs from fileMetadata to find "orphaned" students
    const fileMetadataSnapshot = await db.collection('fileMetadata').get();
    const studentIdsFromFiles = new Set<string>();
    fileMetadataSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.studentId) {
        studentIdsFromFiles.add(data.studentId);
      }
    });

    // Get all student IDs from students collection
    const studentIdsFromStudents = new Set(studentsResult.data.map(s => s.id));

    // Find student IDs that exist in fileMetadata but not in students collection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orphanedStudentIds = Array.from(studentIdsFromFiles).filter(id => !studentIdsFromStudents.has(id as any));

    // Create placeholder student objects for orphaned students
    const orphanedStudents = orphanedStudentIds.map(id => ({
      id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      displayName: `Unknown Student (${id})` as any,
      email: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pinHash: '' as any,
      driveFolderId: undefined,
      subject: undefined,
      createdAt: new Date().toISOString(),
      lastLoginAt: undefined,
      isActive: false,
      tags: []
    }));

    // Combine regular students with orphaned students
    let students = [...studentsResult.data, ...orphanedStudents];

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      students = students.filter(s => 
        s.displayName.toLowerCase().includes(searchLower) ||
        s.email?.toLowerCase().includes(searchLower)
      );
    }

    if (subject) {
      students = students.filter(s => s.subject === subject);
    }

    if (activeFilter !== null) {
      const isActive = activeFilter === 'true';
      students = students.filter(s => s.isActive === isActive);
    }

    // Get file counts and last activity for each student
    const studentsWithMetadata = await Promise.all(
      students.map(async (student) => {
        try {
          const files = await getFileMetadata(student.id);
          const fileCount = files.length;
          const lastFile = files.length > 0 ? files[0] : null;
          const lastActivity = lastFile ? lastFile.modifiedTime : null;

          return {
            ...student,
            fileCount,
            lastActivity,
            lastLoginAt: student.lastLoginAt || null
          };
        } catch {
          return {
            ...student,
            fileCount: 0,
            lastActivity: null,
            lastLoginAt: student.lastLoginAt || null
          };
        }
      })
    );

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStudents = studentsWithMetadata.slice(startIndex, endIndex);

    return NextResponse.json({ 
      students: paginatedStudents,
      total: studentsWithMetadata.length,
      page,
      limit,
      hasMore: endIndex < studentsWithMetadata.length
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
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
    const { displayName, email, pin, driveFolderId, subject, tags } = body;

    // Validate required fields
    if (!displayName || !pin) {
      return NextResponse.json(
        { error: 'Display name and PIN are required' },
        { status: 400 }
      );
    }

    // Validate and create branded types
    let validatedInput: CreateStudentInput;
    try {
      const pinHash = await bcrypt.hash(pin, 10);
      
      validatedInput = {
        displayName: createStudentName(displayName),
        email: email ? createEmail(email) : undefined,
        pin: createPin(pin),
        pinHash: pinHash as string,
        driveFolderId: driveFolderId ? createDriveFolderId(driveFolderId) : undefined,
        subject: subject ? createSubject(subject) : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : 'Validation failed' },
        { status: 400 }
      );
    }

    // Create student in Firestore
    const result = await createStudent(validatedInput);
    
    if (isErr(result)) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      student: result.data
    });

  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    );
  }
}
