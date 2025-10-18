import { NextRequest, NextResponse } from 'next/server';
import { getStudent, getStudentNotes } from '@/lib/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const student = await getStudent(id);
    const notes = student ? await getStudentNotes(id) : [];

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
      student: {
        ...studentData,
        notes: notes,
      },
    });

  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    );
  }
}
