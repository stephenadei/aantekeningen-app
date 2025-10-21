import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { createStudent } from '@/lib/firestore';
import { db } from '@/lib/firebase-admin';
import { isErr, createPin, createStudentName, createEmail, createDriveFolderId, createSubject } from '@/lib/types';
import type { CreateStudentInput } from '@/lib/interfaces';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, displayName, email, pin, driveFolderId, subject } = body;

    // Validate required fields
    if (!studentId || !displayName || !pin) {
      return NextResponse.json(
        { error: 'Student ID, display name and PIN are required' },
        { status: 400 }
      );
    }

    // Check if student already exists in students collection
    const existingStudent = await db.collection('students').doc(studentId).get();
    if (existingStudent.exists) {
      return NextResponse.json(
        { error: 'Student already exists in students collection' },
        { status: 400 }
      );
    }

    // Check if student ID exists in fileMetadata
    const fileMetadataQuery = await db.collection('fileMetadata')
      .where('studentId', '==', studentId)
      .limit(1)
      .get();
    
    if (fileMetadataQuery.empty) {
      return NextResponse.json(
        { error: 'Student ID not found in file metadata' },
        { status: 404 }
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

    // Create student in Firestore with the specific ID
    const result = await createStudent(validatedInput, studentId);
    
    if (isErr(result)) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      student: result.data,
      message: 'Student successfully adopted from file metadata'
    });

  } catch (error) {
    console.error('Error adopting student:', error);
    return NextResponse.json(
      { error: 'Failed to adopt student' },
      { status: 500 }
    );
  }
}
