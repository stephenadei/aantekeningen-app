import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { getLoginAudits } from '@/lib/firestore';
import { validateTeacherEmail } from '@/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    const concept = await prisma.keyConcept.findUnique({
      where: { id }
    });

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      concept
    });

  } catch (error) {
    console.error('Error fetching concept:', error);
    return NextResponse.json(
      { error: 'Failed to fetch concept' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    const { term, explanation, example, orderIndex } = body;

    const updatedConcept = await prisma.keyConcept.update({
      where: { id },
      data: {
        ...(term && { term }),
        ...(explanation && { explanation }),
        ...(example !== undefined && { example }),
        ...(orderIndex !== undefined && { orderIndex }),
        isAiGenerated: false // Mark as manually edited
      }
    });

    return NextResponse.json({
      success: true,
      concept: updatedConcept
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.keyConcept.delete({
      where: { id }
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
