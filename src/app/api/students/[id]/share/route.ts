import { NextRequest, NextResponse } from 'next/server';
import { getStudent } from '@/lib/firestore';
import { config, ensureConfigValidated } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'Student ID is required'
      }, { status: 400 });
    }

    // Get student info from Firestore
    const student = await getStudent(id);
    
    if (!student) {
      return NextResponse.json({
        success: false,
        message: 'Student not found'
      }, { status: 404 });
    }

    // Generate shareable link using proper domain configuration
    ensureConfigValidated();
    const baseUrl = config.baseUrl;
    const shareableUrl = `${baseUrl}/student/${id}`;
    
    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        displayName: student.displayName,
        subject: student.subject,
        driveFolderId: student.driveFolderId
      },
      shareableUrl: shareableUrl,
      directDriveUrl: student.driveFolderId ? `https://drive.google.com/drive/folders/${student.driveFolderId}` : null,
      message: 'Shareable link generated successfully'
    });

  } catch (error) {
    console.error('❌ Error generating shareable link:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
