import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, isAuthorizedAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createDriveFileId } from '@/lib/types';
import type { AdminNoteWithMetadata } from '@/lib/interfaces';

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

    // Get note from Prisma
    const note = await prisma.note.findUnique({
      where: { id },
      include: {
        student: true,
        keyConcepts: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });
    
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const adminNote: AdminNoteWithMetadata = {
      id: note.id,
      name: note.title || 'Untitled',
      title: note.title || '',
      modifiedTime: note.updatedAt.toISOString(),
      size: 0,
      thumbnailUrl: '',
      downloadUrl: '',
      viewUrl: '',
      
      subject: note.subject || undefined,
      topicGroup: note.topicGroup || undefined,
      topic: note.topic || undefined,
      level: note.level || undefined,
      schoolYear: note.schoolYear || undefined,
      keywords: note.keywords,
      summary: note.body || undefined,
      
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      
      student: {
        id: note.student.id,
        displayName: note.student.name,
        subject: note.student.subject?.toString() || undefined
      }
    };

    return NextResponse.json({
      success: true,
      note: adminNote,
      keyConcepts: note.keyConcepts
    });

  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      { error: 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

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
    const {
      subject,
      topicGroup,
      topic,
      level,
      schoolYear,
      keywords,
      summary,
      // summaryEn, topicEn, keywordsEn, skills, tools, theme -> Not in Prisma Note schema yet?
      // I only added fields from core-data. If these fields are needed, they should be in schema or JSON metadata.
      // Prisma Note schema has keywords.
      // summary -> body.
    } = body;

    // Validate and prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (subject !== undefined) updateData.subject = subject;
    if (topicGroup !== undefined) updateData.topicGroup = topicGroup;
    if (topic !== undefined) updateData.topic = topic;
    if (level !== undefined) updateData.level = level;
    if (schoolYear !== undefined) updateData.schoolYear = schoolYear;
    if (keywords !== undefined) updateData.keywords = keywords;
    if (summary !== undefined) updateData.body = summary; // Mapping summary to body

    // Update the note
    const updatedNote = await prisma.note.update({
      where: { id },
      data: updateData,
      include: { student: true }
    });

    const adminNote: AdminNoteWithMetadata = {
      id: updatedNote.id,
      name: updatedNote.title || 'Untitled',
      title: updatedNote.title || '',
      modifiedTime: updatedNote.updatedAt.toISOString(),
      size: 0,
      thumbnailUrl: '',
      downloadUrl: '',
      viewUrl: '',
      
      subject: updatedNote.subject || undefined,
      topicGroup: updatedNote.topicGroup || undefined,
      topic: updatedNote.topic || undefined,
      level: updatedNote.level || undefined,
      schoolYear: updatedNote.schoolYear || undefined,
      keywords: updatedNote.keywords,
      summary: updatedNote.body || undefined,
      
      createdAt: updatedNote.createdAt.toISOString(),
      updatedAt: updatedNote.updatedAt.toISOString(),
      
      student: {
        id: updatedNote.student.id,
        displayName: updatedNote.student.name,
        subject: updatedNote.student.subject?.toString() || undefined
      }
    };

    return NextResponse.json({
      success: true,
      note: adminNote
    });

  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the note (Cascade will delete KeyConcepts)
    await prisma.note.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
