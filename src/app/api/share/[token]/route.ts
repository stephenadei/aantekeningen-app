import { NextRequest, NextResponse } from 'next/server';
import { getStudentByShareToken } from '@/lib/share-token';
import { datalakeService } from '@/lib/datalake-simple';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Share token is required' },
        { status: 400 }
      );
    }

    // Get student by share token
    const student = await getStudentByShareToken(token);

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student niet gevonden voor dit share token' },
        { status: 404 }
      );
    }

    // Get student path (datalakePath or generate from name)
    let studentPath: string | null = null;
    
    if (student.datalakePath) {
      studentPath = student.datalakePath;
    } else {
      // Try to find student path in datalake by name
      const allStudents = await datalakeService.getAllStudentFolders();
      const datalakeStudent = allStudents.find(s => s.name === student.name);
      if (datalakeStudent) {
        studentPath = datalakeStudent.id;
      }
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        datalakePath: studentPath
      }
    });

  } catch (error) {
    console.error('❌ Error getting student by share token:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}


