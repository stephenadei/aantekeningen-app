import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { getLoginAudits } from '@/lib/firestore';
import { validateTeacherEmail } from '@/lib/security';
import { generatePin, hashPin } from '@/lib/security';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id },
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Generate new PIN and hash it
    const newPin = generatePin();
    const newPinHash = await hashPin(newPin);

    // Update student with new PIN
    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        pinHash: newPinHash,
        pinUpdatedAt: new Date(),
      },
    });

    // Log the PIN reset
    await prisma.loginAudit.create({
      data: {
        who: `teacher:${session.user.email}`,
        action: 'pin_reset',
        studentId: id,
        metadata: {
          studentName: updatedStudent.displayName,
          resetBy: session.user.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'PIN reset successfully',
      pin: newPin, // Return PIN only once during reset
      student: {
        id: updatedStudent.id,
        displayName: updatedStudent.displayName,
        pinUpdatedAt: updatedStudent.pinUpdatedAt,
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
