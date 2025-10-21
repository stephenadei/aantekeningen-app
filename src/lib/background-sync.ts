import { db } from './firebase-admin';
import { googleDriveService } from './google-drive-simple';
import { 
  getFileMetadata, 
  setFileMetadata, 
  FileMetadata, 
  isFileMetadataFresh,
  cleanupExpiredCache 
} from './cache';
import { getAllStudents } from './firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { 
  FirestoreStudentId,
  DriveFolderId,
  Result,
  isOk,
  isErr,
  createDriveFileId,
  createFirestoreStudentId,
  createDriveFolderId,
  createThumbnailUrl,
  createDownloadUrl,
  createViewUrl
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

      // Get all students
      const studentsResult = await getAllStudents();
      if (isErr(studentsResult)) {
        console.error('❌ Failed to get students:', studentsResult.error);
        return;
      }
      const students = studentsResult.data;
      console.log(`📚 Found ${students.length} students to sync`);

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
  async syncStudentFiles(student: { id: string; displayName: string; driveFolderId: string | null }): Promise<{ files: number; updated: number }> {
    if (!student.driveFolderId) {
      return { files: 0, updated: 0 };
    }

    try {
      // Check if we need to sync (files are fresh)
      const isFresh = await isFileMetadataFresh(student.id, 6); // 6 hours
      if (isFresh) {
        console.log(`📋 Files for ${student.displayName} are fresh, skipping sync`);
        return { files: 0, updated: 0 };
      }

      // Get current files from Firestore
      const currentFiles = await getFileMetadata(student.id);
      const currentFileMap = new Map(currentFiles.map(f => [f.id, f]));

      // Get latest files from Google Drive
      const driveFiles = await googleDriveService.listFilesInFolder(student.driveFolderId);
      
      let updatedCount = 0;
      const fileMetadata: FileMetadata[] = [];

      for (const driveFile of driveFiles) {
        const existingFile = currentFileMap.get(driveFile.id);
        const driveModifiedTime = new Date(driveFile.modifiedTime);
        
        // Check if file needs update
        let needsUpdate = true;
        if (existingFile) {
          const existingModifiedTime = existingFile.modifiedTime.toDate();
          needsUpdate = driveModifiedTime > existingModifiedTime;
        }

        if (needsUpdate) {
          // Convert to FileMetadata format
          const fileMeta: FileMetadata = {
            id: createDriveFileId(driveFile.id),
            studentId: createFirestoreStudentId(student.id),
            folderId: createDriveFolderId(student.driveFolderId),
            name: driveFile.name,
            title: driveFile.title,
            modifiedTime: Timestamp.fromDate(driveModifiedTime),
            size: driveFile.size,
            thumbnailUrl: driveFile.thumbnailUrl ? createThumbnailUrl(driveFile.thumbnailUrl) : createThumbnailUrl(''),
            downloadUrl: driveFile.downloadUrl ? createDownloadUrl(driveFile.downloadUrl) : createDownloadUrl(''),
            viewUrl: driveFile.viewUrl ? createViewUrl(driveFile.viewUrl) : createViewUrl(''),
            subject: driveFile.subject,
            topic: driveFile.topic,
            level: driveFile.level,
            schoolYear: driveFile.schoolYear,
            keywords: driveFile.keywords,
            summary: driveFile.summary,
            summaryEn: driveFile.summaryEn,
            topicEn: driveFile.topicEn,
            keywordsEn: driveFile.keywordsEn,
            aiAnalyzedAt: driveFile.aiAnalyzedAt ? Timestamp.fromDate(driveFile.aiAnalyzedAt) : undefined,
            createdAt: existingFile?.createdAt || Timestamp.now(),
            updatedAt: Timestamp.now(),
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
        lastFullSync: Timestamp.now(),
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
        lastSync: data.lastFullSync?.toDate() || null,
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
}

// Export singleton instance
export const backgroundSyncService = new BackgroundSyncService();
