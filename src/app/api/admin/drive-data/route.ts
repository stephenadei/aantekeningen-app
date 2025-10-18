import { NextResponse } from 'next/server';
import { getLoginAudits } from '@/lib/firestore';
import { getDriveDataStats } from '@/lib/folder-sync';

export async function GET() {
  try {
    // Get all students with drive folders
    const students = await prisma.student.findMany({
      where: { driveFolderId: { not: null } },
      include: { 
        notes: {
          select: {
            id: true,
            subject: true,
            level: true,
            topic: true,
            aiGenerated: true,
            aiConfirmed: true,
            manuallyEdited: true,
            createdAt: true
          }
        }
      },
      orderBy: { folderConfirmed: 'asc' }  // Unconfirmed first
    });
    
    // Get unlinked folders
    const unlinked = await prisma.unlinkedFolder.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Get stats
    const stats = await getDriveDataStats();
    
    return NextResponse.json({ 
      students, 
      unlinkedFolders: unlinked, 
      stats 
    });
  } catch (error) {
    console.error('Error fetching drive data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drive data' }, 
      { status: 500 }
    );
  }
}
