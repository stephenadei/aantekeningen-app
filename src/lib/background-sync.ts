import { prisma } from './prisma';
import { datalakeService } from './datalake-simple';
import { datalakeMetadataService } from './datalake-metadata';
import { thumbnailGeneratorService } from './thumbnail-generator';
import { 
  getFileMetadata, 
  setFileMetadata, 
  isFileMetadataFresh,
  cleanupExpiredCache 
} from './cache';
import type { FileMetadata } from './interfaces';
import { getAllStudents, getStudentByDriveFolderId } from './firestore';
import { 
  createDriveFileId,
  createFirestoreStudentId,
  createDriveFolderId,
  createThumbnailUrl,
  createDownloadUrl,
  createViewUrl,
  isErr,
  isOk,
  type FirestoreStudentId
} from './types';
import crypto from 'crypto';

/**
 * Background sync job to keep Firestore cache fresh
 */
export class BackgroundSyncService {
  private isRunning = false;
  private lastSyncTime: Date | null = null;

  /**
   * Generate a consistent FirestoreStudentId from a datalake path
   * Uses SHA-256 hash and takes first 20 alphanumeric characters
   */
  private generateStudentIdFromPath(datalakePath: string): FirestoreStudentId {
    // Generate consistent hash from path
    const hash = crypto.createHash('sha256').update(datalakePath).digest('hex');
    // Take first 20 alphanumeric characters
    let studentId = hash.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    
    // Ensure it's exactly 20 characters (pad if needed)
    if (studentId.length < 20) {
      const moreChars = hash.substring(20).replace(/[^a-zA-Z0-9]/g, '');
      studentId = (studentId + moreChars).substring(0, 20);
    }
    
    return createFirestoreStudentId(studentId);
  }

  /**
   * Get FirestoreStudentId from datalake path, trying Firestore mapping first
   */
  private async getStudentIdFromPath(datalakePath: string): Promise<FirestoreStudentId> {
    try {
      // Try to get from Firestore if mapping exists
      const driveFolderId = createDriveFolderId(datalakePath);
      const studentResult = await getStudentByDriveFolderId(driveFolderId);
      
      if (isOk(studentResult)) {
        // Use existing Firestore ID
        return createFirestoreStudentId(studentResult.data.id);
      }
    } catch (error) {
      // Fall through to hash generation
    }
    
    // Generate consistent hash-based ID
    return this.generateStudentIdFromPath(datalakePath);
  }

  /**
   * Run full sync for all students
   */
  async runFullSync(): Promise<void> {
    if (this.isRunning) {
      console.log('Sync already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starting full background sync...');

    try {
      // Clean up expired cache first
      await cleanupExpiredCache();

      // Get all students from Datalake (primary source)
      const allDatalakeStudents = await datalakeService.getAllStudentFolders();
      console.log(`📚 Found ${allDatalakeStudents.length} students in Datalake to sync`);
      
      // Convert to format expected by syncStudentFiles
      const students = allDatalakeStudents.map(student => ({
        id: student.id, // Use datalake path as ID
        displayName: student.name,
        driveFolderId: student.id, // Use datalake path as driveFolderId
      }));

      let totalFiles = 0;
      let updatedFiles = 0;

      // Process students in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < students.length; i += batchSize) {
        const batch = students.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (student) => {
          if (!student.driveFolderId || !student.id) {
            console.log(`⚠️ Student ${student.displayName} has no Drive folder ID or ID`);
            return { files: 0, updated: 0 };
          }

          try {
            const result = await this.syncStudentFiles(student as { id: string; displayName: string; driveFolderId: string | null });
            console.log(`✅ Synced ${student.displayName}: ${result.updated} files updated`);
            return result;
          } catch (error) {
            console.error(`❌ Error syncing ${student.displayName}:`, error);
            return { files: 0, updated: 0 };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(result => {
          totalFiles += result.files;
          updatedFiles += result.updated;
        });

        // Small delay between batches to be nice to the API
        if (i + batchSize < students.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      this.lastSyncTime = new Date();
      console.log(`🎉 Full sync completed: ${updatedFiles}/${totalFiles} files updated`);
      
      // Update sync timestamp
      await this.updateSyncTimestamp();

    } catch (error) {
      console.error('❌ Full sync failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync files for a specific student
   */
  async syncStudentFiles(student: { id: string; displayName: string; driveFolderId: string | null }, forceReanalyze = false): Promise<{ files: number; updated: number }> {
    if (!student.displayName) {
      return { files: 0, updated: 0 };
    }

    try {
      // Check if we need to sync (files are fresh) - unless force re-analyze is requested
      // Note: We skip freshness check for now since we're migrating to datalake
      // The freshness will be determined by checking individual file metadata timestamps
      if (forceReanalyze) {
        console.log(`🔄 Force re-analyzing files for ${student.displayName} (ignoring cache freshness)`);
      }

      // Get student path in datalake
      const studentPath = await datalakeService.getStudentPath(student.displayName);
      if (!studentPath) {
        console.error(`Student path not found for: ${student.displayName}`);
        return { files: 0, updated: 0 };
      }

      // Get latest files from Datalake
      const driveFiles = await datalakeService.listFilesInFolder('', student.displayName);
      
      let updatedCount = 0;

      for (const driveFile of driveFiles) {
        // driveFile.id contains the full path (e.g., "notability/Priveles/VO/StudentName/file.pdf")
        const fullFilePath = driveFile.id;
        
        // Check if metadata exists and is fresh
        const existingMetadata = await datalakeMetadataService.getFileMetadata(fullFilePath);
        const driveModifiedTime = new Date(driveFile.modifiedTime);
        
        // Check if file needs update
        let needsUpdate = true;
        if (existingMetadata && !forceReanalyze) {
          const existingModifiedTime = new Date(existingMetadata.modifiedTime);
          needsUpdate = driveModifiedTime > existingModifiedTime;
        }

        if (needsUpdate || forceReanalyze) {
          // Perform AI analysis if file needs update or force re-analyze
          let aiAnalysis: any = null;
          try {
            // Get file path for AI analysis
            aiAnalysis = await datalakeService.analyzeDocumentWithAI(
              driveFile.name,
              fullFilePath,
              forceReanalyze
            );
          } catch (error) {
            console.error(`Error analyzing file ${driveFile.name}:`, error);
            // Continue with basic metadata even if AI analysis fails
          }

          // Get or generate FirestoreStudentId from datalake path
          const firestoreStudentId = await this.getStudentIdFromPath(student.id);

          // Create FileMetadata using the service helper
          const fileMeta = datalakeMetadataService.createFileMetadata(
            {
              id: driveFile.id,
            name: driveFile.name,
            modifiedTime: driveModifiedTime.toISOString(),
            size: driveFile.size ?? 0,
              downloadUrl: driveFile.downloadUrl,
              viewUrl: driveFile.viewUrl,
              thumbnailUrl: driveFile.thumbnailUrl,
            },
            firestoreStudentId,
            student.driveFolderId || '',
            aiAnalysis || undefined
          );

          // Write metadata to datalake
          await datalakeMetadataService.saveFileMetadata(fullFilePath, fileMeta);

          // Sync to PostgreSQL
          try {
            // Find student in Postgres
            // We try to match by datalakePath (if mapped) or name
            const dbStudent = await prisma.student.findFirst({
              where: {
                OR: [
                  { datalakePath: { contains: student.displayName } },
                  { name: student.displayName }
                ]
              }
            });

            if (dbStudent) {
              // Check if note exists by datalake path
              const existingNote = await prisma.note.findFirst({
                where: { datalakePath: fullFilePath }
              });

              const noteData = {
                studentId: dbStudent.id,
                type: 'PDF' as const,
                title: fileMeta.title || fileMeta.name,
                datalakePath: fullFilePath,
                subject: fileMeta.subject,
                topicGroup: fileMeta.topicGroup,
                topic: fileMeta.topic,
                level: fileMeta.level,
                schoolYear: fileMeta.schoolYear,
                keywords: fileMeta.keywords || [],
                body: fileMeta.summary, // Map summary to body
                updatedAt: new Date(fileMeta.modifiedTime)
              };

              if (existingNote) {
                await prisma.note.update({
                  where: { id: existingNote.id },
                  data: noteData
                });
              } else {
                await prisma.note.create({
                  data: {
                    ...noteData,
                    createdAt: new Date(fileMeta.createdAt || new Date())
                  }
                });
              }
              console.log(`   ↳ Synced to Postgres for student: ${dbStudent.name}`);
            }
          } catch (pgError) {
            console.error(`   ❌ Failed to sync to Postgres:`, pgError);
          }

          updatedCount++;
        }
      }

      console.log(`✅ Synced ${student.displayName}: ${updatedCount}/${driveFiles.length} files updated`);
      
      // Generate thumbnails for PDFs (non-blocking, in background)
      try {
        console.log(`🖼️  Generating thumbnails for ${student.displayName}...`);
        await thumbnailGeneratorService.generateThumbnailsForStudent(
          studentPath,
          'medium',
          false, // Don't force regeneration
          (progress) => {
            if (progress.processed % 10 === 0 || progress.processed === progress.total) {
              console.log(`   Thumbnails: ${progress.processed}/${progress.total} (${progress.successful} successful, ${progress.failed} failed, ${progress.skipped} skipped)`);
            }
          }
        );
        console.log(`✅ Thumbnails generated for ${student.displayName}`);
      } catch (thumbnailError) {
        // Don't fail the sync if thumbnail generation fails
        console.error(`⚠️  Thumbnail generation failed for ${student.displayName}:`, thumbnailError);
      }
      
      return { files: driveFiles.length, updated: updatedCount };

    } catch (error) {
      console.error(`Error syncing files for student ${student.id}:`, error);
      throw error;
    }
  }

  /**
   * Generate thumbnails for a specific student
   */
  async generateThumbnailsForStudent(studentPath: string, force: boolean = false): Promise<void> {
    try {
      await thumbnailGeneratorService.generateThumbnailsForStudent(
        studentPath,
        'medium',
        force,
        (progress) => {
          console.log(`📊 Thumbnail progress for ${studentPath}: ${progress.processed}/${progress.total} (${progress.successful} successful, ${progress.failed} failed, ${progress.skipped} skipped)`);
        }
      );
    } catch (error) {
      console.error(`Error generating thumbnails for student ${studentPath}:`, error);
      throw error;
    }
  }

  /**
   * Update sync timestamp in MinIO
   */
  private async updateSyncTimestamp(): Promise<void> {
    try {
      const status = {
        lastFullSync: new Date().toISOString(),
        isRunning: this.isRunning,
        version: '1.0',
      };
      await datalakeMetadataService.saveSystemStatus('syncStatus', status);
    } catch (error) {
      console.error('Error updating sync timestamp:', error);
    }
  }

  /**
   * Get sync status from MinIO
   */
  async getSyncStatus(): Promise<{
    lastSync: Date | null;
    isRunning: boolean;
    version: string;
  }> {
    try {
      const status = await datalakeMetadataService.getSystemStatus('syncStatus');
      
      if (!status) {
        return {
          lastSync: null,
          isRunning: false,
          version: '1.0',
        };
      }

      return {
        lastSync: status.lastFullSync ? new Date(status.lastFullSync) : null,
        isRunning: status.isRunning || false,
        version: status.version || '1.0',
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        lastSync: null,
        isRunning: false,
        version: '1.0',
      };
    }
  }

  /**
   * Force sync for a specific student (for immediate updates)
   */
  async forceSyncStudent(studentId: string): Promise<void> {
    try {
      const studentsResult = await getAllStudents();
      if (isErr(studentsResult)) {
        console.error('❌ Failed to get students:', studentsResult.error);
        throw new Error(`Failed to get students: ${studentsResult.error.message}`);
      }
      
      const students = studentsResult.data;
      const student = students.find(s => s.id === studentId);
      
      if (!student || !student.id) {
        throw new Error(`Student ${studentId} not found or has no ID`);
      }

      console.log(`🔄 Force syncing student: ${student.displayName}`);
      await this.syncStudentFiles(student as { id: string; displayName: string; driveFolderId: string | null });
      console.log(`✅ Force sync completed for: ${student.displayName}`);
    } catch (error) {
      console.error(`Error force syncing student ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Force re-analysis for a specific student (ignores cache freshness)
   */
  async forceReanalyzeStudent(studentId: string): Promise<void> {
    try {
      const studentsResult = await getAllStudents();
      if (isErr(studentsResult)) {
        console.error('❌ Failed to get students:', studentsResult.error);
        throw new Error(`Failed to get students: ${studentsResult.error.message}`);
      }
      
      const students = studentsResult.data;
      const student = students.find(s => s.id === studentId);
      
      if (!student || !student.id) {
        throw new Error(`Student ${studentId} not found or has no ID`);
      }

      console.log(`🔄 Force re-analyzing student: ${student.displayName}`);
      await this.syncStudentFiles(student as { id: string; displayName: string; driveFolderId: string | null }, true);
      console.log(`✅ Force re-analysis completed for: ${student.displayName}`);
    } catch (error) {
      console.error(`Error force re-analyzing student ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Force re-analysis for all students (ignores cache freshness)
   */
  async forceReanalyzeAll(): Promise<void> {
    if (this.isRunning) {
      console.log('Re-analysis already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starting force re-analysis for all students...');

    try {
      // Clean up expired cache first
      await cleanupExpiredCache();
      
      const studentsResult = await getAllStudents();
      if (isErr(studentsResult)) {
        console.error('❌ Failed to get students:', studentsResult.error);
        throw new Error(`Failed to get students: ${studentsResult.error.message}`);
      }

      const students = studentsResult.data;
      const studentsWithFolders = students.filter(s => s.driveFolderId);
      
      console.log(`📊 Found ${studentsWithFolders.length} students with Drive folders`);

      let totalFiles = 0;
      let totalUpdated = 0;

      for (const student of studentsWithFolders) {
        try {
          console.log(`🔄 Re-analyzing files for: ${student.displayName}`);
          const result = await this.syncStudentFiles(student as { id: string; displayName: string; driveFolderId: string | null }, true);
          totalFiles += result.files;
          totalUpdated += result.updated;
          console.log(`✅ Re-analyzed ${result.files} files (${result.updated} updated) for: ${student.displayName}`);
        } catch (error) {
          console.error(`❌ Error re-analyzing student ${student.displayName}:`, error);
        }
      }

      this.lastSyncTime = new Date();
      console.log(`🎉 Force re-analysis completed! Total: ${totalFiles} files, ${totalUpdated} updated`);

    } catch (error) {
      console.error('❌ Force re-analysis failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
}

// Export singleton instance
export const backgroundSyncService = new BackgroundSyncService();

