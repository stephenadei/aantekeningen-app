import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { validateTeacherEmail } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email || !validateTeacherEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current date for "recent" calculations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all stats in parallel
    const [
      totalStudents,
      totalNotes,
      recentActivity,
      activeStudents,
    ] = await Promise.all([
      // Total students
      prisma.student.count(),
      
      // Total notes
      prisma.note.count(),
      
      // Recent activity (notes created in last 30 days)
      prisma.note.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      
      // Active students (students with notes in last 30 days)
      prisma.student.count({
        where: {
          notes: {
            some: {
              createdAt: {
                gte: thirtyDaysAgo,
              },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      totalStudents,
      totalNotes,
      recentActivity,
      activeStudents,
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
