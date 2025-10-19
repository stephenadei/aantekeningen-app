import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;
    const body = await request.json();
    const { name, description, color, icon, sortOrder } = body;

    console.log('🔄 Updating subject:', subjectId);

    const subjectRef = db.collection('subjects').doc(subjectId);
    
    await subjectRef.update({
      name: name || undefined,
      description: description || undefined,
      color: color || undefined,
      icon: icon || undefined,
      sortOrder: sortOrder !== undefined ? sortOrder : undefined,
      updatedAt: new Date()
    });

    console.log('✅ Subject updated:', subjectId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating subject:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update subject' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;

    console.log('🗑️ Deleting subject:', subjectId);

    const subjectRef = db.collection('subjects').doc(subjectId);
    
    // Delete all topics in this subject first
    const topicsSnapshot = await subjectRef.collection('topics').get();
    for (const topicDoc of topicsSnapshot.docs) {
      await topicDoc.ref.delete();
    }

    // Delete the subject
    await subjectRef.delete();

    console.log('✅ Subject deleted:', subjectId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting subject:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete subject' },
      { status: 500 }
    );
  }
}
