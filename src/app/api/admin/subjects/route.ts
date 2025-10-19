import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    console.log('📚 Fetching all subjects...');

    const snapshot = await db.collection('subjects')
      .orderBy('sortOrder', 'asc')
      .get();

    const subjects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Found ${subjects.length} subjects`);

    return NextResponse.json({
      success: true,
      subjects
    });
  } catch (error) {
    console.error('❌ Error fetching subjects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color, icon, sortOrder } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Subject name is required' },
        { status: 400 }
      );
    }

    console.log('🆕 Creating new subject:', name);

    const subjectId = name.toLowerCase().replace(/\s+/g, '-');
    const subjectRef = db.collection('subjects').doc(subjectId);

    await subjectRef.set({
      name,
      description: description || '',
      color: color || '#3B82F6',
      icon: icon || 'BookOpen',
      sortOrder: sortOrder || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Subject created:', subjectId);

    return NextResponse.json(
      { success: true, subjectId },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Error creating subject:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create subject' },
      { status: 500 }
    );
  }
}
