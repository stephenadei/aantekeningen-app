import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;

    console.log('📚 Fetching topics for subject:', subjectId);

    const snapshot = await db.collection('subjects')
      .doc(subjectId)
      .collection('topics')
      .orderBy('sortOrder', 'asc')
      .get();

    const topics = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Found ${topics.length} topics`);

    return NextResponse.json({
      success: true,
      topics
    });
  } catch (error) {
    console.error('❌ Error fetching topics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;
    const body = await request.json();
    const { name, description, sortOrder } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Topic name is required' },
        { status: 400 }
      );
    }

    console.log('🆕 Creating topic:', name, 'for subject:', subjectId);

    const topicRef = db.collection('subjects')
      .doc(subjectId)
      .collection('topics')
      .doc();

    await topicRef.set({
      name,
      description: description || '',
      sortOrder: sortOrder || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Topic created');

    return NextResponse.json(
      { success: true, topicId: topicRef.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Error creating topic:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create topic' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;
    const body = await request.json();
    const { topicId, name, description, sortOrder } = body;

    if (!topicId) {
      return NextResponse.json(
        { success: false, error: 'Topic ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Updating topic:', topicId);

    await db.collection('subjects')
      .doc(subjectId)
      .collection('topics')
      .doc(topicId)
      .update({
        name: name || undefined,
        description: description || undefined,
        sortOrder: sortOrder !== undefined ? sortOrder : undefined,
        updatedAt: new Date()
      });

    console.log('✅ Topic updated');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating topic:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update topic' },
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
    const body = await request.json();
    const { topicId } = body;

    if (!topicId) {
      return NextResponse.json(
        { success: false, error: 'Topic ID is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ Deleting topic:', topicId);

    await db.collection('subjects')
      .doc(subjectId)
      .collection('topics')
      .doc(topicId)
      .delete();

    console.log('✅ Topic deleted');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting topic:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete topic' },
      { status: 500 }
    );
  }
}
