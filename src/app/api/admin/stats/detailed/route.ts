import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, isAuthorizedAdmin } from '@/lib/auth';
import { prisma } from '@stephenadei/database';
import { extractSubjectFromDatalakePath } from '@stephenadei/datalake';
import { getFileMetadata } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all students from database
    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        datalakePath: true,
        createdAt: true,
      },
    });

    // Calculate basic statistics
    const totalStudents = students.length;
    
    // Get file counts and subject breakdown
    let totalNotes = 0;
    const subjectCounts = new Map<string, number>();
    const levelCounts = new Map<string, number>();
    const recentNotes: Array<{
      id: string;
      topic: string;
      student: { displayName: string };
      createdAt: string;
    }> = [];

    // Process each student to get file metadata
    for (const student of students) {
      try {
        const files = await getFileMetadata(student.id);
        totalNotes += files.length;

        // Count by subject
        for (const file of files) {
          const subject = file.subject || extractSubjectFromDatalakePath(student.datalakePath) || 'unknown';
          subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1);

          // Extract level from datalake path (e.g., "VO", "WO")
          if (student.datalakePath) {
            const pathParts = student.datalakePath.split('/');
            const level = pathParts.find(p => ['VO', 'WO', 'HAVO', 'VWO', 'VMBO'].includes(p)) || 'unknown';
            levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
          }

          // Collect recent notes (last 10)
          if (file.modifiedTime && recentNotes.length < 10) {
            recentNotes.push({
              id: file.id || file.name,
              topic: file.topic || file.name,
              student: { displayName: student.name },
              createdAt: file.modifiedTime,
            });
          }
        }
      } catch (error) {
        // Skip students with errors, continue processing
        console.warn(`Error processing student ${student.id}:`, error);
      }
    }

    // Sort recent notes by date
    recentNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate monthly growth (last 6 months)
    const monthlyGrowth = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const monthStudents = students.filter(s => {
        const created = new Date(s.createdAt);
        return created >= monthStart && created <= monthEnd;
      });

      // Count notes for this month (simplified - using all files)
      const monthNotes = Math.floor(totalNotes / 6); // Rough estimate

      monthlyGrowth.push({
        month: monthDate.toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' }),
        students: monthStudents.length,
        notes: monthNotes,
      });
    }

    // Convert maps to arrays
    const subjectBreakdown = Array.from(subjectCounts.entries())
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count);

    const levelBreakdown = Array.from(levelCounts.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      totalStudents,
      totalNotes,
      recentActivity: recentNotes.length,
      activeStudents: totalStudents,
      unconfirmedFolders: 0, // TODO: Implement when folder confirmation is added
      unlinkedFolders: 0, // TODO: Implement when folder linking is tracked
      subjectBreakdown,
      levelBreakdown,
      recentNotes: recentNotes.slice(0, 10),
      monthlyGrowth,
    });

  } catch (error) {
    console.error('Error fetching detailed statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch detailed statistics' },
      { status: 500 }
    );
  }
}
