import { prisma } from './prisma';
import { googleDriveService } from './google-drive-simple';

export async function syncDriveFolders() {
  try {
    const driveService = googleDriveService;
    const driveFolders = await driveService.getAllStudents();
    
    console.log(`Found ${driveFolders.length} folders in Google Drive`);
    
    for (const folder of driveFolders) {
      // Check if folder already linked
      const existingStudent = await prisma.student.findFirst({
        where: { driveFolderId: folder.id }
      });
      
      if (existingStudent) {
        // Already linked, skip
        console.log(`Folder ${folder.name} already linked to student ${existingStudent.displayName}`);
        continue;
      }
      
      // Try to auto-match by name similarity
      const suggestedStudent = await findMatchingStudent(folder.name);
      
      if (suggestedStudent) {
        // Auto-link but mark as unconfirmed
        await prisma.student.update({
          where: { id: suggestedStudent.id },
          data: {
            driveFolderId: folder.id,
            driveFolderName: folder.name,
            subject: folder.subject,
            folderConfirmed: false,
            folderLinkedAt: new Date()
          }
        });
        console.log(`Auto-linked folder ${folder.name} to student ${suggestedStudent.displayName} (unconfirmed)`);
      } else {
        // Create unlinked folder entry
        await prisma.unlinkedFolder.upsert({
          where: { driveFolderId: folder.id },
          create: {
            driveFolderId: folder.id,
            folderName: folder.name,
            subject: folder.subject
          },
          update: {
            folderName: folder.name,
            subject: folder.subject
          }
        });
        console.log(`Created unlinked folder entry for ${folder.name}`);
      }
    }
    
    return { success: true, processed: driveFolders.length };
  } catch (error) {
    console.error('Error syncing Drive folders:', error);
    throw error;
  }
}

async function findMatchingStudent(folderName: string) {
  // Get all students without a linked folder
  const students = await prisma.student.findMany({
    where: { driveFolderId: null }
  });
  
  if (students.length === 0) {
    return null;
  }
  
  // Simple name matching logic
  // Remove common prefixes/suffixes and normalize
  const normalizedFolderName = folderName
    .toLowerCase()
    .replace(/^(leerling|student|folder|map)\s*/i, '')
    .replace(/\s*(folder|map|leerling|student)$/i, '')
    .trim();
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const student of students) {
    const normalizedStudentName = student.displayName.toLowerCase().trim();
    
    // Exact match
    if (normalizedFolderName === normalizedStudentName) {
      return student;
    }
    
    // Partial match (contains)
    if (normalizedFolderName.includes(normalizedStudentName) || 
        normalizedStudentName.includes(normalizedFolderName)) {
      const score = Math.min(normalizedFolderName.length, normalizedStudentName.length) / 
                   Math.max(normalizedFolderName.length, normalizedStudentName.length);
      
      if (score > bestScore && score > 0.6) { // At least 60% similarity
        bestScore = score;
        bestMatch = student;
      }
    }
  }
  
  return bestMatch;
}

export async function getDriveDataStats() {
  const students = await prisma.student.findMany({
    where: { driveFolderId: { not: null } },
    include: { notes: true }
  });
  
  const unlinkedFolders = await prisma.unlinkedFolder.findMany();
  
  const confirmedCount = students.filter(s => s.folderConfirmed).length;
  const unconfirmedCount = students.filter(s => !s.folderConfirmed).length;
  
  return {
    totalLinkedStudents: students.length,
    confirmedLinks: confirmedCount,
    unconfirmedLinks: unconfirmedCount,
    unlinkedFolders: unlinkedFolders.length,
    lastSyncTime: new Date().toISOString() // TODO: Store actual last sync time
  };
}
