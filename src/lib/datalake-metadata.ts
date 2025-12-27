import * as MinIO from 'minio';
import { datalakeService } from './datalake-simple';
import type { FileMetadata, Student } from './interfaces';
import { 
  createDriveFileId,
  createFirestoreStudentId,
  createDriveFolderId,
  createFileName,
  createCleanFileName,
  createThumbnailUrl,
  createDownloadUrl,
  createViewUrl,
  type DriveFileId,
  type FirestoreStudentId
} from './types';

const BUCKET_NAME = 'educatie-lesmateriaal';
const BASE_PATH = 'notability/Priveles';

/**
 * Datalake Metadata Service
 * Handles reading and writing metadata JSON files in MinIO datalake
 */
class DatalakeMetadataService {
  private minioClient!: MinIO.Client;

  constructor() {
    this.initializeMinIO();
  }

  private initializeMinIO() {
    try {
      if (typeof window !== 'undefined') {
        throw new Error('MinIO client can only be used server-side');
      }

      const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
      const port = parseInt(process.env.MINIO_PORT || '9000');
      const useSSL = process.env.MINIO_SECURE === 'true';
      const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
      const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';

      // Always use localhost for internal operations
      this.minioClient = new MinIO.Client({
        endPoint: 'localhost',
        port: 9000,
        useSSL: false,
        accessKey: accessKey,
        secretKey: secretKey,
      });

      console.log('✅ Datalake Metadata Service initialized');
    } catch (error) {
      console.error('Failed to initialize Datalake Metadata Service:', error);
      throw error;
    }
  }

  /**
   * Get metadata file path for a PDF file
   */
  private getMetadataPath(filePath: string): string {
    // Remove bucket name if present
    let cleanPath = filePath.replace(`${BUCKET_NAME}/`, '');
    // Remove leading slash if present
    cleanPath = cleanPath.replace(/^\//, '');
    // Add .metadata.json extension (before .pdf if present)
    if (cleanPath.endsWith('.pdf')) {
      return cleanPath.replace(/\.pdf$/, '.pdf.metadata.json');
    }
    return `${cleanPath}.metadata.json`;
  }

  /**
   * Get student metadata file path
   */
  private getStudentMetadataPath(studentPath: string): string {
    // Remove bucket name if present
    let cleanPath = studentPath.replace(`${BUCKET_NAME}/`, '');
    // Ensure it ends with /
    if (!cleanPath.endsWith('/')) {
      cleanPath += '/';
    }
    return `${cleanPath}.student.json`;
  }

  /**
   * Check if a file exists in MinIO
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(BUCKET_NAME, filePath);
      return true;
    } catch (error: any) {
      if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if metadata exists for a file
   */
  async metadataExists(filePath: string): Promise<boolean> {
    const metadataPath = this.getMetadataPath(filePath);
    return this.fileExists(metadataPath);
  }

  /**
   * Read metadata for a PDF file
   */
  async getFileMetadata(filePath: string): Promise<FileMetadata | null> {
    try {
      const metadataPath = this.getMetadataPath(filePath);
      
      if (!(await this.fileExists(metadataPath))) {
        return null;
      }

      const stream = await this.minioClient.getObject(BUCKET_NAME, metadataPath);
      const chunks: Buffer[] = [];
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const content = Buffer.concat(chunks).toString('utf-8');
      const metadata = JSON.parse(content) as FileMetadata;
      
      return metadata;
    } catch (error) {
      console.error(`Error reading metadata for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Write metadata for a PDF file (atomic write)
   */
  async setFileMetadata(filePath: string, metadata: FileMetadata): Promise<void> {
    try {
      const metadataPath = this.getMetadataPath(filePath);
      const content = JSON.stringify(metadata, null, 2);
      
      // Atomic write: write directly (MinIO handles this atomically)
      await this.minioClient.putObject(
        BUCKET_NAME,
        metadataPath,
        Buffer.from(content, 'utf-8'),
        content.length,
        {
          'Content-Type': 'application/json',
        }
      );
      
      console.log(`✅ Metadata written for ${filePath}`);
    } catch (error) {
      console.error(`Error writing metadata for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get all file metadata for a student
   */
  async getStudentFileMetadata(studentPath: string): Promise<FileMetadata[]> {
    try {
      // List all files in student folder
      const files: FileMetadata[] = [];
      const objectsStream = this.minioClient.listObjects(BUCKET_NAME, studentPath, false);
      
      for await (const obj of objectsStream) {
        if (!obj.name) continue;
        
        // Skip metadata files and folders
        if (obj.name.endsWith('.metadata.json') || obj.name.endsWith('.student.json') || obj.name.endsWith('/')) {
          continue;
        }
        
        // Only process PDF files
        if (!obj.name.toLowerCase().endsWith('.pdf')) {
          continue;
        }
        
        // Try to read metadata
        const metadata = await this.getFileMetadata(obj.name);
        if (metadata) {
          files.push(metadata);
        }
      }
      
      // Sort by modifiedTime descending
      files.sort((a, b) => {
        const aTime = new Date(a.modifiedTime).getTime();
        const bTime = new Date(b.modifiedTime).getTime();
        return bTime - aTime;
      });
      
      return files;
    } catch (error) {
      console.error(`Error getting student file metadata for ${studentPath}:`, error);
      return [];
    }
  }

  /**
   * Get student metadata
   */
  async getStudentMetadata(studentPath: string): Promise<Student | null> {
    try {
      const metadataPath = this.getStudentMetadataPath(studentPath);
      
      if (!(await this.fileExists(metadataPath))) {
        return null;
      }

      const stream = await this.minioClient.getObject(BUCKET_NAME, metadataPath);
      const chunks: Buffer[] = [];
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const content = Buffer.concat(chunks).toString('utf-8');
      const metadata = JSON.parse(content) as Student;
      
      return metadata;
    } catch (error) {
      console.error(`Error reading student metadata for ${studentPath}:`, error);
      return null;
    }
  }

  /**
   * Write student metadata
   */
  async setStudentMetadata(studentPath: string, metadata: Student): Promise<void> {
    try {
      const metadataPath = this.getStudentMetadataPath(studentPath);
      const content = JSON.stringify(metadata, null, 2);
      
      await this.minioClient.putObject(
        BUCKET_NAME,
        metadataPath,
        Buffer.from(content, 'utf-8'),
        content.length,
        {
          'Content-Type': 'application/json',
        }
      );
      
      console.log(`✅ Student metadata written for ${studentPath}`);
    } catch (error) {
      console.error(`Error writing student metadata for ${studentPath}:`, error);
      throw error;
    }
  }

  /**
   * Convert file path to datalake path
   */
  private getDatalakePath(filePath: string): string {
    // If path already includes bucket, remove it
    if (filePath.startsWith(BUCKET_NAME + '/')) {
      return filePath;
    }
    // If path starts with BASE_PATH, add bucket
    if (filePath.startsWith(BASE_PATH)) {
      return `${BUCKET_NAME}/${filePath}`;
    }
    // Otherwise assume it's relative to BASE_PATH
    return `${BUCKET_NAME}/${BASE_PATH}/${filePath}`;
  }

  /**
   * Create FileMetadata from file info and AI analysis
   */
  createFileMetadata(
    fileInfo: {
      id: string;
      name: string;
      modifiedTime: string;
      size: number;
      downloadUrl?: string;
      viewUrl?: string;
      thumbnailUrl?: string;
    },
    studentId: FirestoreStudentId,
    folderId: string,
    aiAnalysis?: {
      subject?: string;
      topic?: string;
      level?: string;
      schoolYear?: string;
      keywords?: string[];
      summary?: string;
      summaryEn?: string;
      topicEn?: string;
      keywordsEn?: string[];
    }
  ): FileMetadata {
    return {
      id: createDriveFileId(fileInfo.id),
      studentId: studentId,
      folderId: createDriveFolderId(folderId),
      name: createFileName(fileInfo.name),
      title: createCleanFileName(fileInfo.name.replace(/\.pdf$/i, '')),
      modifiedTime: fileInfo.modifiedTime,
      size: fileInfo.size,
      thumbnailUrl: fileInfo.thumbnailUrl ? createThumbnailUrl(fileInfo.thumbnailUrl) : createThumbnailUrl(''),
      downloadUrl: fileInfo.downloadUrl ? createDownloadUrl(fileInfo.downloadUrl) : createDownloadUrl(''),
      viewUrl: fileInfo.viewUrl ? createViewUrl(fileInfo.viewUrl) : createViewUrl(''),
      subject: aiAnalysis?.subject as any,
      topic: aiAnalysis?.topic as any,
      level: aiAnalysis?.level as any,
      schoolYear: aiAnalysis?.schoolYear as any,
      keywords: aiAnalysis?.keywords || [],
      summary: aiAnalysis?.summary,
      summaryEn: aiAnalysis?.summaryEn,
      topicEn: aiAnalysis?.topicEn,
      keywordsEn: aiAnalysis?.keywordsEn || [],
      aiAnalyzedAt: aiAnalysis ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const datalakeMetadataService = new DatalakeMetadataService();

