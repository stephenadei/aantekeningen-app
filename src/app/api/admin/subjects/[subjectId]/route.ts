import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;
    const body = await request.json();
    const { name, description, color, icon, sortOrder } = body;

    console.log('🔄 Updating subject:', subjectId);

    await prisma.subject.update({
      where: { id: subjectId },
      data: {
        name: name || undefined,
        description: description || undefined,
        color: color || undefined,
        icon: icon || undefined,
        sortOrder: sortOrder !== undefined ? sortOrder : undefined,
      }
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

    await prisma.subject.delete({
      where: { id: subjectId }
    });

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
