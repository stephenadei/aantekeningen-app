import { NextRequest, NextResponse } from 'next/server';
import { getAllStudents } from '@/lib/firestore';
import { googleDriveService } from '@/lib/google-drive-simple';
import { sanitizeInput } from '@/lib/security';
import { isOk, isErr } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Search endpoint called');
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      console.log('❌ No query parameter provided');
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Searching for:', query);

    // Get all students from Firestore
    const allStudentsResult = await getAllStudents();
    if (isErr(allStudentsResult)) {
      console.error('❌ Failed to get students from Firestore:', allStudentsResult.error);
      return NextResponse.json(
        { error: 'Failed to retrieve students from database' },
        { status: 500 }
      );
    }
    
    const allStudents = allStudentsResult.data;
    console.log(`📚 Found ${allStudents.length} total students in database`);

    // If no students found in Firestore, try Google Drive as fallback
    if (allStudents.length === 0) {
      console.log('⚠️ No students found in Firestore, trying Google Drive fallback...');
      
      try {
        // Check if we have Google Drive OAuth credentials
        const hasGoogleCredentials = !!(
          process.env.GOOGLE_CLIENT_ID && 
          process.env.GOOGLE_CLIENT_SECRET && 
          process.env.GOOGLE_REFRESH_TOKEN
        );

        if (hasGoogleCredentials) {
          console.log('🔄 Falling back to Google Drive search...');
          try {
            const driveStudents = await googleDriveService.findStudentFolders(query);
            
            if (driveStudents.length > 0) {
              console.log(`✅ Found ${driveStudents.length} students in Google Drive`);
              return NextResponse.json({
                success: true,
                students: driveStudents,
                count: driveStudents.length,
                fromDrive: true,
                message: 'Students found in Google Drive. Consider running "npm run init-students" to migrate to Firestore for better performance.'
              });
            }
          } catch (driveError) {
            console.error('❌ Google Drive search failed:', driveError);
            // Continue to show the helpful message below
          }
        }

        return NextResponse.json({
          success: true,
          students: [],
          count: 0,
          message: 'No students found. Run "npm run init-students" to initialize students from Google Drive structure.'
        });
      } catch (driveError) {
        console.error('❌ Google Drive fallback failed:', driveError);
        return NextResponse.json({
          success: true,
          students: [],
          count: 0,
          message: 'No students found in database. Google Drive fallback also failed. Check your configuration.'
        });
      }
    }

    // Filter students by search query
    const searchTerm = sanitizeInput(query).toLowerCase();
    const filteredStudents = allStudents.filter(student =>
      student.displayName.toLowerCase().includes(searchTerm)
    );

    console.log(`✅ Found ${filteredStudents.length} matching students`);

    // Convert Firestore objects to plain JavaScript objects for JSON serialization
    const plainStudents = filteredStudents.map(student => ({
      id: student.id,
      displayName: student.displayName,
      subject: student.subject,
      driveFolderId: student.driveFolderId,
      // Omit Firestore Timestamp objects to ensure proper serialization
    }));

    return NextResponse.json({
      success: true,
      students: plainStudents,
      count: plainStudents.length
    });

  } catch (error) {
    console.error('❌ Error searching students:', error);
    
    // Provide more detailed error information
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search students',
        ...errorDetails
      },
      { status: 500 }
    );
  }
}
