import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { getLoginAudits } from '@/lib/firestore';
import { validateTeacherEmail } from '@/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const note = await prisma.note.findUnique({
      where: { id: params.id },
      select: { driveFileId: true }
    });

    if (!note || !note.driveFileId) {
      return NextResponse.json([]);
    }

    const concepts = await prisma.keyConcept.findMany({
      where: { driveFileId: note.driveFileId },
      orderBy: { orderIndex: 'asc' }
    });

    return NextResponse.json(concepts);

  } catch (error) {
    console.error('Error fetching key concepts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch key concepts' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const note = await prisma.note.findUnique({
      where: { id: params.id },
      select: { driveFileId: true }
    });

    if (!note || !note.driveFileId) {
      return NextResponse.json({ 
        error: 'Note has no Drive file ID' 
      }, { status: 400 });
    }

    const body = await request.json();
    const { term, explanation, example, isAiGenerated } = body;

    if (!term || !explanation) {
      return NextResponse.json({ 
        error: 'Term and explanation are required' 
      }, { status: 400 });
    }

    // Get the next order index
    const lastConcept = await prisma.keyConcept.findFirst({
      where: { driveFileId: note.driveFileId },
      orderBy: { orderIndex: 'desc' }
    });

    const concept = await prisma.keyConcept.create({
      data: {
        driveFileId: note.driveFileId,
        term,
        explanation,
        example: example || null,
        orderIndex: (lastConcept?.orderIndex || 0) + 1,
        isAiGenerated: isAiGenerated ?? false
      }
    });

    return NextResponse.json(concept);

  } catch (error) {
    console.error('Error creating key concept:', error);
    return NextResponse.json(
      { error: 'Failed to create key concept' },
      { status: 500 }
    );
  }
}
