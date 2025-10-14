import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { validateTeacherEmail, sanitizeInput } from '@/lib/security';
import { z } from 'zod';

const updateStudentSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email || !validateTeacherEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        tags: true,
        _count: {
          select: {
            notes: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Remove sensitive data
    const { pinHash, ...studentData } = student;

    return NextResponse.json({
      success: true,
      student: studentData,
    });

  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email || !validateTeacherEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const updateData = updateStudentSchema.parse(body);

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id: id },
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // If updating displayName, check for duplicates
    if (updateData.displayName && updateData.displayName !== existingStudent.displayName) {
      const duplicateStudent = await prisma.student.findUnique({
        where: { displayName: updateData.displayName },
      });

      if (duplicateStudent) {
        return NextResponse.json(
          { error: 'Student met deze naam bestaat al' },
          { status: 400 }
        );
      }
    }

    // Update student
    const updatedStudent = await prisma.student.update({
      where: { id: id },
      data: {
        ...updateData,
        displayName: updateData.displayName ? sanitizeInput(updateData.displayName) : undefined,
      },
    });

    // Log the update
    await prisma.loginAudit.create({
      data: {
        who: `teacher:${session.user.email}`,
        action: 'student_updated',
        studentId: id,
        metadata: {
          changes: updateData,
          studentName: updatedStudent.displayName,
        },
      },
    });

    // Remove sensitive data
    const { pinHash, ...studentData } = updatedStudent;

    return NextResponse.json({
      success: true,
      student: studentData,
    });

  } catch (error) {
    console.error('Error updating student:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email || !validateTeacherEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id: id },
      include: {
        _count: {
          select: {
            notes: true,
          },
        },
      },
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Log the deletion
    await prisma.loginAudit.create({
      data: {
        who: `teacher:${session.user.email}`,
        action: 'student_deleted',
        studentId: id,
        metadata: {
          studentName: existingStudent.displayName,
          notesCount: existingStudent._count.notes,
        },
      },
    });

    // Delete student (cascade will handle related records)
    await prisma.student.delete({
      where: { id: id },
    });

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    );
  }
}
