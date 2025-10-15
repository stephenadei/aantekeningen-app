import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { validateTeacherEmail } from '@/lib/security';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; conceptId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email || !validateTeacherEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the concept belongs to the note
    const note = await prisma.note.findUnique({
      where: { id: params.id },
      select: { driveFileId: true }
    });

    if (!note || !note.driveFileId) {
      return NextResponse.json({ 
        error: 'Note not found or has no Drive file ID' 
      }, { status: 404 });
    }

    const concept = await prisma.keyConcept.findFirst({
      where: { 
        id: params.conceptId,
        driveFileId: note.driveFileId
      }
    });

    if (!concept) {
      return NextResponse.json({ 
        error: 'Key concept not found' 
      }, { status: 404 });
    }

    await prisma.keyConcept.delete({
      where: { id: params.conceptId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting key concept:', error);
    return NextResponse.json(
      { error: 'Failed to delete key concept' },
      { status: 500 }
    );
  }
}
