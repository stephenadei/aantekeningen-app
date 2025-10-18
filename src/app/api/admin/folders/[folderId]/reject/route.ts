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

    // Get folder info before unlinking
    const folderName = student.driveFolderName || 'Unknown';
    const subject = student.subject || 'Unknown';

    // Unlink the folder from student
    await prisma.student.update({
      where: { id: student.id },
      data: {
        driveFolderId: null,
        driveFolderName: null,
        subject: null,
        folderConfirmed: false,
        folderLinkedAt: null,
        folderConfirmedAt: null
      }
    });

    // Add to unlinked folders
    await prisma.unlinkedFolder.upsert({
      where: { driveFolderId: params.folderId },
      create: {
        driveFolderId: params.folderId,
        folderName: folderName,
        subject: subject
      },
      update: {
        folderName: folderName,
        subject: subject
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error rejecting folder link:', error);
    return NextResponse.json(
      { error: 'Failed to reject folder link' },
      { status: 500 }
    );
  }
}
