import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { getLoginAudits } from '@/lib/firestore';
import { validateTeacherEmail } from '@/lib/security';

export async function POST(
  request: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find student with this folder
    const student = await prisma.student.findFirst({
      where: { driveFolderId: params.folderId }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student with this folder not found' }, { status: 404 });
    }

    // Confirm the link
    await prisma.student.update({
      where: { id: student.id },
      data: {
        folderConfirmed: true,
        folderConfirmedAt: new Date()
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error confirming folder link:', error);
    return NextResponse.json(
      { error: 'Failed to confirm folder link' },
      { status: 500 }
    );
  }
}
