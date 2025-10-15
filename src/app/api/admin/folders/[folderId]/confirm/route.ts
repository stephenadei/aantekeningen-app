import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { validateTeacherEmail } from '@/lib/security';

export async function POST(
  request: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email || !validateTeacherEmail(session.user.email)) {
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
