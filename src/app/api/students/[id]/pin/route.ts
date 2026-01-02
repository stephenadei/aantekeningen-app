import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@stephen/database';
import bcrypt from 'bcrypt';
import { verifyStudentPin } from '@/lib/dashboard-api';

/**
 * PUT /api/students/[id]/pin
 * Update student PIN (student self-service)
 * Requires current PIN verification
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { currentPin, newPin } = body;

    // Validate inputs
    if (!currentPin || typeof currentPin !== 'string' || !/^\d{6}$/.test(currentPin)) {
      return NextResponse.json(
        { error: 'Huidige PIN moet 6 cijfers zijn' },
        { status: 400 }
      );
    }

    if (!newPin || typeof newPin !== 'string' || !/^\d{6}$/.test(newPin)) {
      return NextResponse.json(
        { error: 'Nieuwe PIN moet 6 cijfers zijn' },
        { status: 400 }
      );
    }

    if (currentPin === newPin) {
      return NextResponse.json(
        { error: 'Nieuwe PIN moet anders zijn dan de huidige PIN' },
        { status: 400 }
      );
    }

    // Get student from database
    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        pinHash: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student niet gevonden' },
        { status: 404 }
      );
    }

    if (!student.pinHash) {
      return NextResponse.json(
        { error: 'Student heeft nog geen PIN code' },
        { status: 400 }
      );
    }

    // Verify current PIN via dashboard API
    const pinVerification = await verifyStudentPin(student.name, currentPin);
    
    if (!pinVerification.valid) {
      return NextResponse.json(
        { error: 'Huidige PIN is onjuist' },
        { status: 401 }
      );
    }

    // Hash the new PIN
    const pinHash = await bcrypt.hash(newPin, 10);

    // Update student PIN (store both pin and pinHash for admin visibility)
    await prisma.student.update({
      where: { id },
      data: { 
        pin: newPin, // Store plain text for admin visibility
        pinHash: pinHash 
      },
    });

    return NextResponse.json({
      success: true,
      message: 'PIN code succesvol gewijzigd',
      student: {
        id: student.id,
        name: student.name,
      },
    });

  } catch (error) {
    console.error('Error updating student PIN:', error);
    return NextResponse.json(
      { error: 'Fout bij het wijzigen van PIN code' },
      { status: 500 }
    );
  }
}

