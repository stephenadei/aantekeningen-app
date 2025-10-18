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

    // Get current date for "recent" calculations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all stats in parallel
    const [
      totalStudents,
      totalNotes,
      recentActivity,
      activeStudents,
      unconfirmedFolders,
      unlinkedFolders,
      subjectBreakdown,
      levelBreakdown,
      recentNotes,
      monthlyGrowth
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
      
      // Unconfirmed folder links
      prisma.student.count({
        where: {
          driveFolderId: { not: null },
          folderConfirmed: false,
        },
      }),
      
      // Unlinked folders
      prisma.unlinkedFolder.count(),
      
      // Subject breakdown
      prisma.note.groupBy({
        by: ['subject'],
        _count: {
          subject: true,
        },
        orderBy: {
          _count: {
            subject: 'desc',
          },
        },
      }),
      
      // Level breakdown
      prisma.note.groupBy({
        by: ['level'],
        _count: {
          level: true,
        },
        orderBy: {
          _count: {
            level: 'desc',
          },
        },
      }),
      
      // Recent notes
      prisma.note.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              displayName: true,
            },
          },
        },
      }),
      
      // Monthly growth (last 6 months)
      getMonthlyGrowth()
    ]);

    // Transform breakdown data
    const subjectBreakdownFormatted = subjectBreakdown.map(item => ({
      subject: item.subject,
      count: item._count.subject
    }));

    const levelBreakdownFormatted = levelBreakdown.map(item => ({
      level: item.level,
      count: item._count.level
    }));

    return NextResponse.json({
      totalStudents,
      totalNotes,
      recentActivity,
      activeStudents,
      unconfirmedFolders,
      unlinkedFolders,
      subjectBreakdown: subjectBreakdownFormatted,
      levelBreakdown: levelBreakdownFormatted,
      recentNotes,
      monthlyGrowth
    });

  } catch (error) {
    console.error('Error fetching detailed stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch detailed stats' },
      { status: 500 }
    );
  }
}

async function getMonthlyGrowth() {
  const months = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    
    const monthName = date.toLocaleDateString('nl-NL', { 
      month: 'long', 
      year: 'numeric' 
    });
    
    const [students, notes] = await Promise.all([
      prisma.student.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextMonth,
          },
        },
      }),
      prisma.note.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextMonth,
          },
        },
      })
    ]);
    
    months.push({
      month: monthName,
      students,
      notes
    });
  }
  
  return months;
}
