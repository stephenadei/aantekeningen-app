import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { getLoginAudits } from '@/lib/firestore';
import { validateTeacherEmail } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const subject = searchParams.get('subject') || '';
    const level = searchParams.get('level') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { student: { displayName: { contains: search, mode: 'insensitive' } } },
        { topic: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (subject) {
      where.subject = subject;
    }
    
    if (level) {
      where.level = level;
    }

    // Get total count
    const total = await prisma.note.count({ where });

    // Get notes with pagination
    const notes = await prisma.note.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            displayName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      notes,
      total,
      page,
      totalPages,
      limit
    });

  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}