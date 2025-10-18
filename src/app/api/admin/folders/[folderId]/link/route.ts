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

    const { studentId } = await request.json();
    
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check if student already has a folder linked
    if (student.driveFolderId && student.driveFolderId !== params.folderId) {
      return NextResponse.json({ 
        error: 'Student already has a folder linked' 
      }, { status: 400 });
    }

    // Check if folder is already linked to another student
    const existingLink = await prisma.student.findFirst({
      where: { 
        driveFolderId: params.folderId,
        id: { not: studentId }
      }
    });

    if (existingLink) {
      return NextResponse.json({ 
        error: 'Folder is already linked to another student' 
      }, { status: 400 });
    }

    // Get folder info from unlinked folders or use provided data
    const unlinkedFolder = await prisma.unlinkedFolder.findUnique({
      where: { driveFolderId: params.folderId }
    });

    // Link folder to student
    await prisma.student.update({
      where: { id: studentId },
      data: {
        driveFolderId: params.folderId,
        driveFolderName: unlinkedFolder?.folderName || 'Unknown',
        subject: unlinkedFolder?.subject || null,
        folderConfirmed: true,
        folderConfirmedAt: new Date()
      }
    });

    // Remove from unlinked folders if exists
    if (unlinkedFolder) {
      await prisma.unlinkedFolder.delete({
        where: { driveFolderId: params.folderId }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error linking folder:', error);
    return NextResponse.json(
      { error: 'Failed to link folder' },
      { status: 500 }
    );
  }
}
