import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, isAuthorizedAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { backgroundSyncService } from '@/lib/background-sync';
import type { BulkOperationRequest, BulkOperationResponse } from '@/lib/interfaces';

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: BulkOperationRequest = await request.json();
    const { action, noteIds, metadata } = body;

    if (!action || !noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      return NextResponse.json(
        { error: 'Action and noteIds array are required' },
        { status: 400 }
      );
    }

    let processed = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    switch (action) {
      case 'reanalyze':
        // Get unique student IDs from notes
        const notes = await prisma.note.findMany({
          where: { id: { in: noteIds } },
          select: { studentId: true }
        });
        
        const studentIds = [...new Set(notes.map(n => n.studentId))];
        
        for (const sid of studentIds) {
          try {
            await backgroundSyncService.forceReanalyzeStudent(sid);
          } catch (error) {
            errors++;
            errorDetails.push(`Failed to re-analyze student ${sid}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        processed = noteIds.length; // Approximate, as we sync by student
        break;

      case 'delete':
        try {
          const result = await prisma.note.deleteMany({
            where: { id: { in: noteIds } }
          });
          processed = result.count;
        } catch (error) {
          errors = noteIds.length;
          errorDetails.push(`Failed to delete notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        break;

      case 'updateMetadata':
        if (!metadata) {
          return NextResponse.json(
            { error: 'Metadata is required for updateMetadata action' },
            { status: 400 }
          );
        }

        try {
          const updateData: any = {
            updatedAt: new Date()
          };

          // Map fields
          if (metadata.subject) updateData.subject = metadata.subject;
          if ('topicGroup' in metadata && metadata.topicGroup) updateData.topicGroup = metadata.topicGroup;
          if (metadata.topic) updateData.topic = metadata.topic;
          if (metadata.level) updateData.level = metadata.level;
          if (metadata.schoolYear) updateData.schoolYear = metadata.schoolYear;
          if (metadata.keywords) updateData.keywords = metadata.keywords;
          if (metadata.summary) updateData.body = metadata.summary; // Map summary to body

          const result = await prisma.note.updateMany({
            where: { id: { in: noteIds } },
            data: updateData
          });
          processed = result.count;
        } catch (error) {
          errors = noteIds.length;
          errorDetails.push(`Failed to update notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "reanalyze", "delete", or "updateMetadata"' },
          { status: 400 }
        );
    }

    const response: BulkOperationResponse = {
      success: errors === 0,
      processed,
      errors,
      ...(errorDetails.length > 0 && { errorDetails })
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in bulk operation:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}
