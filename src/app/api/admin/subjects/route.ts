import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('📚 Fetching all subjects...');

    const subjects = await prisma.subject.findMany({
      orderBy: { sortOrder: 'asc' }
    });

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

    // Check if subject exists (name is unique)
    const existingSubject = await prisma.subject.findUnique({
        where: { name }
    });

    if (existingSubject) {
        return NextResponse.json(
            { success: false, error: 'Subject already exists' },
            { status: 400 }
        );
    }

    // Try to preserve ID generation logic if possible or let CUID handle it
    // Old logic: const subjectId = name.toLowerCase().replace(/\s+/g, '-');
    // Prisma uses CUID by default. We can set ID manually if we want to preserve that format.
    const subjectId = name.toLowerCase().replace(/\s+/g, '-');

    await prisma.subject.create({
      data: {
        id: subjectId, // Manual ID setting
        name,
        description: description || '',
        color: color || '#3B82F6',
        icon: icon || 'BookOpen',
        sortOrder: sortOrder || 0
      }
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
