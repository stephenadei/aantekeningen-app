import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@stephen/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;

    console.log('📚 Fetching topics for subject:', subjectId);

    const topics = await prisma.topic.findMany({
      where: { subjectId },
      orderBy: { sortOrder: 'asc' }
    });

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

    const topic = await prisma.topic.create({
      data: {
        subjectId,
        name,
        description: description || '',
        sortOrder: sortOrder || 0
      }
    });

    console.log('✅ Topic created');

    return NextResponse.json(
      { success: true, topicId: topic.id },
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
    // const { subjectId } = await params; // Not strictly needed for update if topicId is unique globally
    const body = await request.json();
    const { topicId, name, description, sortOrder } = body;

    if (!topicId) {
      return NextResponse.json(
        { success: false, error: 'Topic ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Updating topic:', topicId);

    await prisma.topic.update({
      where: { id: topicId },
      data: {
        name: name || undefined,
        description: description || undefined,
        sortOrder: sortOrder !== undefined ? sortOrder : undefined,
      }
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
    // const { subjectId } = await params;
    const body = await request.json();
    const { topicId } = body;

    if (!topicId) {
      return NextResponse.json(
        { success: false, error: 'Topic ID is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ Deleting topic:', topicId);

    await prisma.topic.delete({
      where: { id: topicId }
    });

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
