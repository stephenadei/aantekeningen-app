import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { db } from '@/lib/firebase-admin';
import { getStudent } from '@/lib/firestore';
import { isErr, createDriveFileId } from '@/lib/types';
import type { AdminNoteWithMetadata } from '@/lib/interfaces';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get file metadata from Firestore
    const doc = await db.collection('fileMetadata').doc(id).get();
    
    if (!doc.exists) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const noteData = doc.data();
    if (!noteData) {
      return NextResponse.json({ error: 'Note data not found' }, { status: 404 });
    }

    // Get student info
    const studentResult = await getStudent(noteData.studentId);
    if (isErr(studentResult)) {
      return NextResponse.json({ error: studentResult.error.message }, { status: 500 });
    }

    const student = studentResult.data;

    // Get key concepts (if any exist)
    const keyConceptsSnapshot = await db
      .collection('keyConcepts')
      .where('noteId', '==', id)
      .get();

    const keyConcepts = keyConceptsSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: createDriveFileId(doc.id),
      ...doc.data()
    }));

    const note: AdminNoteWithMetadata = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(noteData as any),
      id: createDriveFileId(doc.id),
      student: {
        id: student.id,
        displayName: student.displayName,
        subject: student.subject
      }
    };

    return NextResponse.json({
      success: true,
      note,
      keyConcepts
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
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
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
      summaryEn,
      topicEn,
      keywordsEn,
      skills,
      tools,
      theme
    } = body;

    // Validate and prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString()
    };

    if (subject !== undefined) updateData.subject = subject;
    if (topicGroup !== undefined) updateData.topicGroup = topicGroup;
    if (topic !== undefined) updateData.topic = topic;
    if (level !== undefined) updateData.level = level;
    if (schoolYear !== undefined) updateData.schoolYear = schoolYear;
    if (keywords !== undefined) updateData.keywords = keywords;
    if (summary !== undefined) updateData.summary = summary;
    if (summaryEn !== undefined) updateData.summaryEn = summaryEn;
    if (topicEn !== undefined) updateData.topicEn = topicEn;
    if (keywordsEn !== undefined) updateData.keywordsEn = keywordsEn;
    if (skills !== undefined) updateData.skills = skills;
    if (tools !== undefined) updateData.tools = tools;
    if (theme !== undefined) updateData.theme = theme;

    // Update the document
    await db.collection('fileMetadata').doc(id).update(updateData);

    // Get the updated document
    const doc = await db.collection('fileMetadata').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Note not found after update' }, { status: 404 });
    }

    const noteData = doc.data();
    if (!noteData) {
      return NextResponse.json({ error: 'Note data not found after update' }, { status: 404 });
    }

    // Get student info
    const studentResult = await getStudent(noteData.studentId);
    if (isErr(studentResult)) {
      return NextResponse.json({ error: studentResult.error.message }, { status: 500 });
    }

    const student = studentResult.data;

    const note: AdminNoteWithMetadata = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(noteData as any),
      id: createDriveFileId(doc.id),
      student: {
        id: student.id,
        displayName: student.displayName,
        subject: student.subject
      }
    };

    return NextResponse.json({
      success: true,
      note
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
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if note exists
    const doc = await db.collection('fileMetadata').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Delete key concepts first
    const keyConceptsSnapshot = await db
      .collection('keyConcepts')
      .where('noteId', '==', id)
      .get();

    const batch = db.batch();
    keyConceptsSnapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      batch.delete(doc.ref);
    });

    // Delete the note
    batch.delete(db.collection('fileMetadata').doc(id));

    await batch.commit();

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