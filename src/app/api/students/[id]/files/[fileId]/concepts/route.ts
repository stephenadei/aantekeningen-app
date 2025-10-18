import { NextRequest, NextResponse } from 'next/server';
import { getLoginAudits } from '@/lib/firestore';
import { googleDriveService } from '@/lib/google-drive-simple';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id: studentId, fileId } = await params;
    
    // First check if we have concepts in the database
    const dbConcepts = await prisma.keyConcept.findMany({
      where: { driveFileId: fileId },
      orderBy: { orderIndex: 'asc' }
    });

    if (dbConcepts.length > 0) {
      return NextResponse.json({
        success: true,
        concepts: dbConcepts.map(concept => ({
          id: concept.id,
          term: concept.term,
          explanation: concept.explanation,
          example: concept.example,
          isAiGenerated: concept.isAiGenerated
        }))
      });
    }

    // If no concepts in DB, try to get from AI analysis
    try {
      const files = await googleDriveService.listFilesInFolder(studentId);
      const file = files.find(f => f.id === fileId);
      
      if (file?.keyConcepts && file.keyConcepts.length > 0) {
        return NextResponse.json({
          success: true,
          concepts: file.keyConcepts
        });
      }
    } catch (error) {
      console.error('Error getting AI concepts:', error);
    }

    // Return empty array if no concepts found
    return NextResponse.json({
      success: true,
      concepts: []
    });

  } catch (error) {
    console.error('Error fetching concepts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch concepts' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id: studentId, fileId } = await params;
    const body = await request.json();
    
    const { term, explanation, example } = body;

    if (!term || !explanation) {
      return NextResponse.json(
        { error: 'Term and explanation are required' },
        { status: 400 }
      );
    }

    // Get the highest order index for this file
    const lastConcept = await prisma.keyConcept.findFirst({
      where: { driveFileId: fileId },
      orderBy: { orderIndex: 'desc' }
    });

    const newConcept = await prisma.keyConcept.create({
      data: {
        driveFileId: fileId,
        term,
        explanation,
        example: example || null,
        orderIndex: (lastConcept?.orderIndex || 0) + 1,
        isAiGenerated: false
      }
    });

    return NextResponse.json({
      success: true,
      concept: {
        id: newConcept.id,
        term: newConcept.term,
        explanation: newConcept.explanation,
        example: newConcept.example,
        isAiGenerated: newConcept.isAiGenerated
      }
    });

  } catch (error) {
    console.error('Error creating concept:', error);
    return NextResponse.json(
      { error: 'Failed to create concept' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id: studentId, fileId } = await params;
    const body = await request.json();
    
    const { conceptId, term, explanation, example } = body;

    if (!conceptId) {
      return NextResponse.json(
        { error: 'Concept ID is required' },
        { status: 400 }
      );
    }

    const updatedConcept = await prisma.keyConcept.update({
      where: { id: conceptId },
      data: {
        ...(term && { term }),
        ...(explanation && { explanation }),
        ...(example !== undefined && { example }),
        isAiGenerated: false // Mark as manually edited
      }
    });

    return NextResponse.json({
      success: true,
      concept: {
        id: updatedConcept.id,
        term: updatedConcept.term,
        explanation: updatedConcept.explanation,
        example: updatedConcept.example,
        isAiGenerated: updatedConcept.isAiGenerated
      }
    });

  } catch (error) {
    console.error('Error updating concept:', error);
    return NextResponse.json(
      { error: 'Failed to update concept' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id: studentId, fileId } = await params;
    const body = await request.json();
    
    const { conceptId } = body;

    if (!conceptId) {
      return NextResponse.json(
        { error: 'Concept ID is required' },
        { status: 400 }
      );
    }

    await prisma.keyConcept.delete({
      where: { id: conceptId }
    });

    return NextResponse.json({
      success: true,
      message: 'Concept deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting concept:', error);
    return NextResponse.json(
      { error: 'Failed to delete concept' },
      { status: 500 }
    );
  }
}
