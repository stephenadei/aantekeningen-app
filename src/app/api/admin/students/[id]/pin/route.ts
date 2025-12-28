import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, isAuthorizedAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

/**
 * GET /api/admin/students/[id]/pin
 * Get student PIN status (without revealing the actual PIN)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        pinHash: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      hasPin: !!student.pinHash,
      student: {
        id: student.id,
        name: student.name,
      },
    });

  } catch (error) {
    console.error('Error getting PIN status:', error);
    return NextResponse.json(
      { error: 'Failed to get PIN status' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/students/[id]/pin
 * Update student PIN
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pin } = body;

    // Validate PIN format (6 digits)
    if (!pin || typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 6 digits' },
        { status: 400 }
      );
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Hash the new PIN
    const pinHash = await bcrypt.hash(pin, 10);

    // Update student PIN
    await prisma.student.update({
      where: { id },
      data: { pinHash },
    });

    return NextResponse.json({
      success: true,
      message: 'PIN updated successfully',
      student: {
        id: student.id,
        name: student.name,
      },
    });

  } catch (error) {
    console.error('Error updating PIN:', error);
    return NextResponse.json(
      { error: 'Failed to update PIN' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/students/[id]/pin/reset
 * Reset student PIN to default (000000)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Hash the default PIN
    const defaultPin = '000000';
    const pinHash = await bcrypt.hash(defaultPin, 10);

    // Update student PIN
    await prisma.student.update({
      where: { id },
      data: { pinHash },
    });

    return NextResponse.json({
      success: true,
      message: 'PIN reset to default (000000)',
      pin: defaultPin,
      student: {
        id: student.id,
        name: student.name,
      },
    });

  } catch (error) {
    console.error('Error resetting PIN:', error);
    return NextResponse.json(
      { error: 'Failed to reset PIN' },
      { status: 500 }
    );
  }
}



