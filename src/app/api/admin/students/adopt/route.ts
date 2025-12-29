import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, isAuthorizedAdmin } from '@/lib/auth';
import { createStudent } from '@/lib/firestore';
import { prisma } from '@/lib/prisma';
import { isErr, createPin, createStudentName, createEmail, createDriveFolderId, createSubject } from '@/lib/types';
import type { CreateStudentInput } from '@/lib/interfaces';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthSession();
    
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

    // Check if student already exists in students table
    const existingStudent = await prisma.student.findUnique({ where: { id: studentId } });
    if (existingStudent) {
      return NextResponse.json(
        { error: 'Student already exists' },
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
      } as any;
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : 'Validation failed' },
        { status: 400 }
      );
    }

    // Create student in Prisma with the specific ID
    const result = await createStudent(validatedInput, studentId);
    
    if (isErr(result)) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      student: result.data,
      message: 'Student successfully adopted'
    });

  } catch (error) {
    console.error('Error adopting student:', error);
    return NextResponse.json(
      { error: 'Failed to adopt student' },
      { status: 500 }
    );
  }
}
