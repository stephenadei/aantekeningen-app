import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { backgroundSyncService } from '@/lib/background-sync';
import { getAllStudents } from '@/lib/firestore';
import { invalidateCache } from '@/lib/cache';
import { isErr } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, studentId, forceAll = false } = body;

    switch (action) {
      case 'all':
        console.log('🔄 Starting full AI re-analysis for all students...');
        
        // Invalidate AI analysis cache
        await invalidateCache('ai-analysis');
        console.log('✅ AI analysis cache invalidated');
        
        // Start force re-analysis in background (this will re-analyze all files)
        backgroundSyncService.forceReanalyzeAll().catch(error => {
          console.error('Full re-analysis failed:', error);
        });
        
        return NextResponse.json({
          success: true,
          message: 'Full AI re-analysis started in background',
          action: 'all',
          timestamp: new Date().toISOString(),
        });

      case 'student':
        if (!studentId) {
          return NextResponse.json(
            { error: 'Student ID is required for student re-analysis' },
            { status: 400 }
          );
        }

        console.log(`🔄 Starting AI re-analysis for student ${studentId}...`);
        
        // Invalidate cache for this student
        await invalidateCache(`student-${studentId}`);
        console.log(`✅ Cache invalidated for student ${studentId}`);
        
        // Force re-analyze this student (this will re-analyze their files)
        await backgroundSyncService.forceReanalyzeStudent(studentId);
        
        return NextResponse.json({
          success: true,
          message: `AI re-analysis completed for student ${studentId}`,
          action: 'student',
          studentId,
          timestamp: new Date().toISOString(),
        });

      case 'status':
        // Get status of current sync/re-analysis
        const status = await backgroundSyncService.getSyncStatus();
        const studentsResult = await getAllStudents();
        
        if (isErr(studentsResult)) {
          return NextResponse.json(
            { error: 'Failed to get students' },
            { status: 500 }
          );
        }
        
        const totalStudents = studentsResult.data.length;
        const studentsWithFolders = studentsResult.data.filter(s => s.driveFolderId).length;
        
        return NextResponse.json({
          success: true,
          status: {
            ...status,
            totalStudents,
            studentsWithFolders,
            canReanalyze: !status.isRunning,
          },
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "all", "student", or "status"' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in re-analysis action:', error);
    return NextResponse.json(
      { error: 'Failed to execute re-analysis action' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get status of current sync/re-analysis
    const status = await backgroundSyncService.getSyncStatus();
    const studentsResult = await getAllStudents();
    
    if (isErr(studentsResult)) {
      return NextResponse.json(
        { error: 'Failed to get students' },
        { status: 500 }
      );
    }
    
    const totalStudents = studentsResult.data.length;
    const studentsWithFolders = studentsResult.data.filter(s => s.driveFolderId).length;
    
    return NextResponse.json({
      success: true,
      status: {
        ...status,
        totalStudents,
        studentsWithFolders,
        canReanalyze: !status.isRunning,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error getting re-analysis status:', error);
    return NextResponse.json(
      { error: 'Failed to get re-analysis status' },
      { status: 500 }
    );
  }
}
