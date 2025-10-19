import { NextRequest, NextResponse } from 'next/server';
import { googleDriveService } from '@/lib/google-drive-simple';
import { getStudent } from '@/lib/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    console.log('📊 Overview API called for studentId:', studentId);

    if (!studentId) {
      console.log('❌ No studentId provided');
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Get student from Firestore to get the Drive folder ID
    const student = await getStudent(studentId);
    let driveFolderId = student?.driveFolderId;

    // If not found in Firestore, check if studentId is actually a Drive folder ID
    if (!student || !driveFolderId) {
      console.log('🔄 Student not found in Firestore, checking if ID is a Drive folder ID...');
      
      // Assume the ID is a Drive folder ID and try to use it directly
      if (studentId.length > 20) { // Drive folder IDs are typically longer
        driveFolderId = studentId;
        console.log('✅ Using provided ID as Drive folder ID (fallback mode)');
      } else {
        console.log('❌ Student not found and ID is not a valid Drive folder ID');
        return NextResponse.json(
          { error: 'Student not found or no Drive folder configured' },
          { status: 404 }
        );
      }
    }

    console.log('🔄 Fetching student overview from Google Drive...');
    const overview = await googleDriveService.getStudentOverview(driveFolderId);
    console.log('✅ Overview fetched:', overview);

    return NextResponse.json({
      success: true,
      overview
    });

  } catch (error) {
    console.error('❌ Error getting student overview:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get student overview',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
