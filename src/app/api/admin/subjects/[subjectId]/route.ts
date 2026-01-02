import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@stephen/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;
    const body = await request.json();
    const { name, displayName, description, color, icon, sortOrder } = body;

    console.log('🔄 Updating subject:', subjectId);

    const updateData: {
      name?: string;
      displayName?: string;
      description?: string | null;
      color?: string | null;
      icon?: string | null;
      sortOrder?: number;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description || null;
    if (color !== undefined) updateData.color = color || null;
    if (icon !== undefined) updateData.icon = icon || null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    await prisma.subject.update({
      where: { id: subjectId },
      data: updateData
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
