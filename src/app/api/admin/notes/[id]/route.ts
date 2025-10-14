import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { validateTeacherEmail, sanitizeInput } from '@/lib/security';
import { canonSubject, canonLevel, canonTopic, generateTags } from '@/lib/normalization';
import { z } from 'zod';

const updateNoteSchema = z.object({
  contentMd: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  level: z.string().min(1).optional(),
  topic: z.string().min(1).optional(),
  driveFileId: z.string().optional(),
  driveFileName: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email || !validateTeacherEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const note = await prisma.note.findUnique({
      where: { id: params.id },
      include: {
        student: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      note,
    });

  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      { error: 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email || !validateTeacherEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updateData = updateNoteSchema.parse(body);

    // Check if note exists
    const existingNote = await prisma.note.findUnique({
      where: { id: params.id },
      include: {
        student: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Normalize tags if they're being updated
    const normalizedData: any = { ...updateData };
    
    if (updateData.subject) {
      normalizedData.subject = canonSubject(updateData.subject);
    }
    
    if (updateData.level) {
      normalizedData.level = canonLevel(updateData.level);
    }
    
    if (updateData.topic) {
      normalizedData.topic = canonTopic(updateData.topic);
    }

    if (updateData.contentMd) {
      normalizedData.contentMd = sanitizeInput(updateData.contentMd);
    }

    // Update note and tags in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the note
      const updatedNote = await tx.note.update({
        where: { id: params.id },
        data: normalizedData,
      });

      // Update student tags if subject, level, or topic changed
      if (updateData.subject || updateData.level || updateData.topic) {
        const finalSubject = normalizedData.subject || existingNote.subject;
        const finalLevel = normalizedData.level || existingNote.level;
        const finalTopic = normalizedData.topic || existingNote.topic;

        const tags = generateTags(finalSubject, finalLevel, finalTopic);
        
        // Delete old tags for this student
        await tx.studentTag.deleteMany({
          where: {
            studentId: existingNote.studentId,
          },
        });

        // Create new tags
        for (const tag of tags) {
          await tx.studentTag.create({
            data: {
              studentId: existingNote.studentId,
              key: tag.key,
              value: tag.value,
            },
          });
        }
      }

      return updatedNote;
    });

    // Log the update
    await prisma.loginAudit.create({
      data: {
        who: `teacher:${session.user.email}`,
        action: 'note_updated',
        studentId: existingNote.studentId,
        metadata: {
          noteId: params.id,
          studentName: existingNote.student.displayName,
          changes: updateData,
        },
      },
    });

    return NextResponse.json({
      success: true,
      note: result,
    });

  } catch (error) {
    console.error('Error updating note:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email || !validateTeacherEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if note exists
    const existingNote = await prisma.note.findUnique({
      where: { id: params.id },
      include: {
        student: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Log the deletion
    await prisma.loginAudit.create({
      data: {
        who: `teacher:${session.user.email}`,
        action: 'note_deleted',
        studentId: existingNote.studentId,
        metadata: {
          noteId: params.id,
          studentName: existingNote.student.displayName,
          subject: existingNote.subject,
          level: existingNote.level,
          topic: existingNote.topic,
        },
      },
    });

    // Delete note (cascade will handle related records)
    await prisma.note.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
