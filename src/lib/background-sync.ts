import { db } from './firebase-admin';
import { datalakeService } from './datalake-simple';
import { 
  getFileMetadata, 
  setFileMetadata, 
  isFileMetadataFresh,
  cleanupExpiredCache 
} from './cache';
import type { FileMetadata } from './interfaces';
import { getAllStudents } from './firestore';
import { 
  createDriveFileId,
  createFirestoreStudentId,
  createDriveFolderId,
  createThumbnailUrl,
  createDownloadUrl,
  createViewUrl,
  isErr
} from './types';

/**
 * Background sync job to keep Firestore cache fresh
 */
export class BackgroundSyncService {
  private isRunning = false;
  private lastSyncTime: Date | null = null;

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
      if (!forceReanalyze) {
        const isFresh = await isFileMetadataFresh(student.id, 6); // 6 hours
        if (isFresh) {
          console.log(`📋 Files for ${student.displayName} are fresh, skipping sync`);
          return { files: 0, updated: 0 };
        }
      } else {
        console.log(`🔄 Force re-analyzing files for ${student.displayName} (ignoring cache freshness)`);
      }

      // Get current files from Firestore
      const currentFiles = await getFileMetadata(student.id);
      const currentFileMap = new Map(currentFiles.map(f => [f.id, f]));

      // Get latest files from Datalake
      const driveFiles = await datalakeService.listFilesInFolder('', student.displayName);
      
      let updatedCount = 0;
      const fileMetadata: FileMetadata[] = [];

      for (const driveFile of driveFiles) {
        const existingFile = currentFileMap.get(driveFile.id);
        const driveModifiedTime = new Date(driveFile.modifiedTime);
        
        // Check if file needs update
        let needsUpdate = true;
        if (existingFile) {
          const existingModifiedTime = new Date(existingFile.modifiedTime);
          needsUpdate = driveModifiedTime > existingModifiedTime;
        }

        if (needsUpdate || forceReanalyze) {
          // Perform AI analysis if file needs update or force re-analyze
          let aiAnalysis: any = null;
          try {
            // Get file path for AI analysis
            const filePath = driveFile.id; // driveFile.id contains the full path
            aiAnalysis = await datalakeService.analyzeDocumentWithAI(
              driveFile.name,
              filePath,
              forceReanalyze
            );
          } catch (error) {
            console.error(`Error analyzing file ${driveFile.name}:`, error);
            // Continue with basic metadata even if AI analysis fails
          }

          // Convert to FileMetadata format
          const fileMeta: FileMetadata = {
            id: createDriveFileId(driveFile.id),
            studentId: createFirestoreStudentId(student.id),
            folderId: student.driveFolderId ? createDriveFolderId(student.driveFolderId) : createDriveFolderId(''),
            name: driveFile.name,
            title: driveFile.title,
            modifiedTime: driveModifiedTime.toISOString(),
            size: driveFile.size ?? 0,
            thumbnailUrl: driveFile.thumbnailUrl ? createThumbnailUrl(driveFile.thumbnailUrl) : createThumbnailUrl(''),
            downloadUrl: driveFile.downloadUrl ? createDownloadUrl(driveFile.downloadUrl) : createDownloadUrl(''),
            viewUrl: driveFile.viewUrl ? createViewUrl(driveFile.viewUrl) : createViewUrl(''),
            subject: aiAnalysis?.subject || driveFile.subject,
            topic: aiAnalysis?.topic || driveFile.topic,
            level: aiAnalysis?.level || driveFile.level,
            schoolYear: aiAnalysis?.schoolYear || driveFile.schoolYear,
            keywords: aiAnalysis?.keywords || driveFile.keywords || [],
            summary: aiAnalysis?.summary || driveFile.summary,
            summaryEn: aiAnalysis?.summaryEn || driveFile.summaryEn,
            topicEn: aiAnalysis?.topicEn || driveFile.topicEn,
            keywordsEn: aiAnalysis?.keywordsEn || driveFile.keywordsEn || [],
            aiAnalyzedAt: aiAnalysis ? new Date().toISOString() : (existingFile?.aiAnalyzedAt || undefined),
            createdAt: existingFile?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          fileMetadata.push(fileMeta);
          updatedCount++;
        } else {
          // Keep existing file metadata
          fileMetadata.push(existingFile!);
        }
      }

      // Update Firestore with all file metadata
      if (fileMetadata.length > 0) {
        await setFileMetadata(fileMetadata);
      }

      return { files: driveFiles.length, updated: updatedCount };

    } catch (error) {
      console.error(`Error syncing files for student ${student.id}:`, error);
      throw error;
    }
  }

  /**
   * Update sync timestamp in Firestore
   */
  private async updateSyncTimestamp(): Promise<void> {
    try {
      await db.collection('system').doc('syncStatus').set({
        lastFullSync: new Date().toISOString(),
        isRunning: this.isRunning,
        version: '1.0',
      });
    } catch (error) {
      console.error('Error updating sync timestamp:', error);
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    lastSync: Date | null;
    isRunning: boolean;
    version: string;
  }> {
    try {
      const doc = await db.collection('system').doc('syncStatus').get();
      
      if (!doc.exists) {
        return {
          lastSync: null,
          isRunning: false,
          version: '1.0',
        };
      }

      const data = doc.data()!;
      return {
        lastSync: data.lastFullSync ? new Date(data.lastFullSync) : null,
        isRunning: data.isRunning || false,
        version: data.version || '1.0',
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
