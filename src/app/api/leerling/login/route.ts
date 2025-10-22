import { NextRequest, NextResponse } from 'next/server';
import { getStudentByName, createLoginAudit } from '@/lib/firestore';
import { getFileMetadata } from '@/lib/cache';
import { validatePinFormat, verifyPin, getClientIP, getUserAgent } from '@/lib/security';
import { createStudentName, createPin, isOk } from '@/lib/types';
import type { StudentPortalStudent } from '@/lib/interfaces';
import { z } from 'zod';

const loginSchema = z.object({
  displayName: z.string().min(1).max(50),
  pin: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { displayName, pin } = loginSchema.parse(body);

    // Validate PIN format
    if (!validatePinFormat(pin)) {
      return NextResponse.json(
        { error: 'Ongeldige PIN format' },
        { status: 400 }
      );
    }

    // Find student by display name
    const studentResult = await getStudentByName(createStudentName(displayName));

    if (!isOk(studentResult)) {
      // Log failed attempt
      await createLoginAudit({
        who: `student:${displayName}`,
        action: 'login_fail',
        ip: getClientIP(request),
        userAgent: getUserAgent(request),
        metadata: {
          reason: 'student_not_found',
          displayName,
        },
      });

      return NextResponse.json(
        { error: 'Student niet gevonden' },
        { status: 404 }
      );
    }

    const student = studentResult.data;

    // Verify PIN
    const isValidPin = await verifyPin(createPin(pin), student.pinHash);

    if (!isValidPin) {
      // Log failed attempt
      await createLoginAudit({
        who: `student:${student.displayName}`,
        action: 'login_fail',
        ip: getClientIP(request),
        userAgent: getUserAgent(request),
        metadata: {
          reason: 'invalid_pin',
          studentId: student.id,
          displayName: student.displayName,
        },
      });

      return NextResponse.json(
        { error: 'Ongeldige PIN' },
        { status: 401 }
      );
    }

    // Log successful login
    await createLoginAudit({
      who: `student:${student.displayName}`,
      action: 'login_ok',
      ip: getClientIP(request),
      userAgent: getUserAgent(request),
      metadata: {
        studentId: student.id,
        displayName: student.displayName,
      },
    });

    // Get student's notes from fileMetadata
    const files = await getFileMetadata(student.id);
    
    // Convert files to notes format expected by StudentPortalStudent
    const notes = files.map(file => ({
      id: file.id,
      contentMd: file.summary || '', // Use summary as content
      subject: file.subject || 'Unknown',
      level: file.level || 'Unknown',
      topic: file.topic || 'Unknown',
      createdAt: file.createdAt,
      updatedAt: file.updatedAt
    }));

    // Create StudentPortalStudent object
    const studentPortalData: StudentPortalStudent = {
      id: student.id,
      displayName: student.displayName,
      notes: notes
    };

    return NextResponse.json({
      success: true,
      student: studentPortalData,
    });

  } catch (error: unknown) {
    console.error('Error in student login:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ongeldige invoer', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Er is een fout opgetreden bij het inloggen' },
      { status: 500 }
    );
  }
}
