import { NextRequest, NextResponse } from 'next/server';
import { createLoginAudit } from '@/lib/firestore';
import { getFileMetadata } from '@/lib/cache';
import { validatePinFormat, getClientIP, getUserAgent } from '@/lib/security';
import { createStudentName } from '@/lib/types';
import { findStudentByName, verifyStudentPin, checkDashboardAvailability } from '@/lib/dashboard-api';
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

    // Check if dashboard API is available
    console.log(`🔍 Checking dashboard availability: ${process.env.DASHBOARD_API_URL || 'http://localhost:4141'}`);
    const dashboardAvailable = await checkDashboardAvailability();
    console.log(`📊 Dashboard available: ${dashboardAvailable}`);
    
    if (!dashboardAvailable) {
      console.warn('⚠️ Dashboard API not available');
      return NextResponse.json(
        { error: 'Login service temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    // Find student by display name in privelessen-dashboard
    console.log(`🔍 Looking up student: ${displayName}`);
    const dashboardStudent = await findStudentByName(displayName);

    if (!dashboardStudent) {
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

    // Verify PIN via dashboard API
    const pinVerification = await verifyStudentPin(displayName, pin);

    if (!pinVerification.valid || !pinVerification.student) {
      // Log failed attempt
      await createLoginAudit({
        who: `student:${displayName}`,
        action: 'login_fail',
        ip: getClientIP(request),
        userAgent: getUserAgent(request),
        metadata: {
          reason: pinVerification.error || 'invalid_pin',
          studentId: dashboardStudent.id,
          displayName: displayName,
        },
      });

      return NextResponse.json(
        { error: pinVerification.error || 'Ongeldige PIN' },
        { status: 401 }
      );
    }

    const student = pinVerification.student;

    // Log successful login
    await createLoginAudit({
      who: `student:${student.name}`,
      action: 'login_ok',
      ip: getClientIP(request),
      userAgent: getUserAgent(request),
      metadata: {
        studentId: student.id,
        displayName: student.name,
      },
    });

    // Get student's notes from fileMetadata
    // Use datalakePath if available, otherwise use student ID
    const studentIdForMetadata = student.datalakePath || student.id;
    const files = await getFileMetadata(studentIdForMetadata);
    
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
      id: student.datalakePath || student.id, // Use datalakePath if available
      displayName: student.name,
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
