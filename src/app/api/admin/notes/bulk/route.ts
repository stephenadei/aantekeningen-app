import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { db } from '@/lib/firebase-admin';
import { backgroundSyncService } from '@/lib/background-sync';
import type { BulkOperationRequest, BulkOperationResponse } from '@/lib/interfaces';

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
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
        // Trigger re-analysis for each note
        for (const noteId of noteIds) {
          try {
            // Get the note to find the student
            const noteDoc = await db.collection('fileMetadata').doc(noteId).get();
            if (!noteDoc.exists) {
              errors++;
              errorDetails.push(`Note ${noteId} not found`);
              continue;
            }

            const noteData = noteDoc.data();
            if (!noteData) {
              errors++;
              errorDetails.push(`Note ${noteId} has no data`);
              continue;
            }

            // Trigger re-analysis for the student
            await backgroundSyncService.forceReanalyzeStudent(noteData.studentId);
            processed++;
          } catch (error) {
            errors++;
            errorDetails.push(`Failed to re-analyze note ${noteId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        break;

      case 'delete':
        // Delete notes in batches
        const batchSize = 500; // Firestore batch limit
        for (let i = 0; i < noteIds.length; i += batchSize) {
          const batch = db.batch();
          const batchIds = noteIds.slice(i, i + batchSize);

          for (const noteId of batchIds) {
            try {
              // Delete key concepts first
              const keyConceptsSnapshot = await db
                .collection('keyConcepts')
                .where('noteId', '==', noteId)
                .get();

              keyConceptsSnapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
                batch.delete(doc.ref);
              });

              // Delete the note
              batch.delete(db.collection('fileMetadata').doc(noteId));
              processed++;
            } catch (error) {
              errors++;
              errorDetails.push(`Failed to delete note ${noteId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          try {
            await batch.commit();
          } catch (error) {
            errors += batchIds.length;
            errorDetails.push(`Batch delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        break;

      case 'updateMetadata':
        if (!metadata) {
          return NextResponse.json(
            { error: 'Metadata is required for updateMetadata action' },
            { status: 400 }
          );
        }

        // Update metadata in batches
        const updateBatchSize = 500;
        for (let i = 0; i < noteIds.length; i += updateBatchSize) {
          const batch = db.batch();
          const batchIds = noteIds.slice(i, i + updateBatchSize);

          for (const noteId of batchIds) {
            try {
              const updateData = {
                ...metadata,
                updatedAt: new Date().toISOString()
              };

              batch.update(db.collection('fileMetadata').doc(noteId), updateData);
              processed++;
            } catch (error) {
              errors++;
              errorDetails.push(`Failed to update note ${noteId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          try {
            await batch.commit();
          } catch (error) {
            errors += batchIds.length;
            errorDetails.push(`Batch update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
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
