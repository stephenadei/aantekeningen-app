import * as MinIO from 'minio';

const BUCKET_NAME = process.env.DATALAKE_BUCKET_EDUCATION_BRONZE || 'bronze-education';

export interface FileMetadata {
  id?: string;
  name: string;
  modifiedTime: string;
  size?: number;
  checksum?: string;
  
  // Content metadata
  subject?: string;
  topicGroup?: string;
  topic?: string;
  level?: string;
  schoolYear?: string;
  keywords?: string[];
  
  // AI analysis
  summary?: string;
  summaryEn?: string;
  topicEn?: string;
  keywordsEn?: string[];
  aiAnalyzedAt?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export class DatalakeMetadataService {
  private minioClient!: MinIO.Client;
  private isInitialized = false;

  constructor() {
    this.initializeMinIO();
  }

  private initializeMinIO() {
    try {
      if (typeof window !== 'undefined') {
        throw new Error('MinIO client can only be used server-side');
      }

      const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
      const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';

      // Always use localhost for internal operations (MinIO runs locally)
      this.minioClient = new MinIO.Client({
        endPoint: 'localhost',
        port: 9000,
        useSSL: false,
        accessKey: accessKey,
        secretKey: secretKey,
      });

      this.isInitialized = true;
      console.log('✅ Datalake Metadata Service initialized');
    } catch (error) {
      console.error('Failed to initialize Datalake Metadata Service:', error);
      throw error;
    }
  }

  /**
   * Get metadata file path for a PDF file
   * Example: notability/Priveles/VO/Amirah/file.pdf -> notability/Priveles/VO/Amirah/file.pdf.metadata.json
   */
  private getMetadataPath(filePath: string): string {
    // Remove bucket name if present
    let cleanPath = filePath.replace(`${BUCKET_NAME}/`, '');
    
    // Ensure we don't double-append extension if it's already there
    if (cleanPath.endsWith('.metadata.json')) {
      return cleanPath;
    }
    
    return `${cleanPath}.metadata.json`;
  }

  /**
   * Get metadata for a file
   */
  async getFileMetadata(filePath: string): Promise<FileMetadata | null> {
    try {
      if (!this.isInitialized) this.initializeMinIO();

      const metadataPath = this.getMetadataPath(filePath);
      
      try {
        const stream = await this.minioClient.getObject(BUCKET_NAME, metadataPath);
        const data = await this.streamToString(stream);
        return JSON.parse(data) as FileMetadata;
      } catch (error: any) {
        if (error.code === 'NoSuchKey') {
          return null;
        }
        throw error;
      }
    } catch (error) {
      console.error(`Error getting metadata for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Save metadata for a file
   */
  async saveFileMetadata(filePath: string, metadata: FileMetadata): Promise<void> {
    try {
      if (!this.isInitialized) this.initializeMinIO();

      const metadataPath = this.getMetadataPath(filePath);
      const data = JSON.stringify(metadata, null, 2);
      
      await this.minioClient.putObject(
        BUCKET_NAME,
        metadataPath,
        Buffer.from(data),
        data.length,
        { 'Content-Type': 'application/json' }
      );
      
      console.log(`Saved metadata to ${metadataPath}`);
    } catch (error) {
      console.error(`Error saving metadata for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Check if metadata exists for a file
   */
  async metadataExists(filePath: string): Promise<boolean> {
    try {
      if (!this.isInitialized) this.initializeMinIO();
      
      const metadataPath = this.getMetadataPath(filePath);
      await this.minioClient.statObject(BUCKET_NAME, metadataPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper to create FileMetadata object
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
    studentId: string,
    folderId: string,
    aiAnalysis?: any
  ): FileMetadata {
    const now = new Date().toISOString();
    
    const metadata: FileMetadata = {
      id: fileInfo.id,
      name: fileInfo.name,
      modifiedTime: fileInfo.modifiedTime,
      size: fileInfo.size,
      createdAt: now,
      updatedAt: now,
    };

    if (aiAnalysis) {
      metadata.subject = aiAnalysis.subject;
      metadata.topicGroup = aiAnalysis.topicGroup;
      metadata.topic = aiAnalysis.topic;
      metadata.level = aiAnalysis.level;
      metadata.schoolYear = aiAnalysis.schoolYear;
      metadata.keywords = aiAnalysis.keywords;
      metadata.summary = aiAnalysis.summary;
      metadata.summaryEn = aiAnalysis.summaryEn;
      metadata.topicEn = aiAnalysis.topicEn;
      metadata.keywordsEn = aiAnalysis.keywordsEn;
      metadata.aiAnalyzedAt = now;
    }

    return metadata;
  }

  /**
   * Get metadata for all files in a student folder
   */
  async getStudentFileMetadata(studentPath: string): Promise<FileMetadata[]> {
    if (!this.isInitialized) this.initializeMinIO();
    
    try {
      const objects: any[] = [];
      const stream = this.minioClient.listObjects(BUCKET_NAME, studentPath, true);
      
      await new Promise((resolve, reject) => {
          stream.on('data', obj => {
              if (obj.name && obj.name.endsWith('.metadata.json')) {
                  objects.push(obj);
              }
          });
          stream.on('end', resolve);
          stream.on('error', reject);
      });

      const results = await Promise.all(objects.map(async obj => {
          try {
              const stream = await this.minioClient.getObject(BUCKET_NAME, obj.name);
              const data = await this.streamToString(stream);
              return JSON.parse(data) as FileMetadata;
          } catch (e) {
              return null;
          }
      }));
      
      return results.filter((m): m is FileMetadata => m !== null);
    } catch (error) {
      console.error(`Error getting student file metadata for ${studentPath}:`, error);
      return [];
    }
  }

  /**
   * Save system status (e.g. sync status)
   */
  async saveSystemStatus(key: string, data: any): Promise<void> {
    try {
      if (!this.isInitialized) this.initializeMinIO();
      const path = `system/${key}.json`;
      const buffer = Buffer.from(JSON.stringify(data, null, 2));
      await this.minioClient.putObject(BUCKET_NAME, path, buffer, buffer.length, { 'Content-Type': 'application/json' });
    } catch (error) {
      console.error(`Error saving system status ${key}:`, error);
    }
  }

  /**
   * Get system status
   */
  async getSystemStatus(key: string): Promise<any | null> {
    try {
      if (!this.isInitialized) this.initializeMinIO();
      const path = `system/${key}.json`;
      try {
        const stream = await this.minioClient.getObject(BUCKET_NAME, path);
        const str = await this.streamToString(stream);
        return JSON.parse(str);
      } catch (e: any) {
        if (e.code === 'NoSuchKey') return null;
        throw e;
      }
    } catch (error) {
      console.error(`Error getting system status ${key}:`, error);
      return null;
    }
  }

  // Helper to convert stream to string
  private streamToString(stream: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      stream.on('data', (chunk: any) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      stream.on('error', (err: any) => reject(err));
    });
  }
}

export const datalakeMetadata = new DatalakeMetadataService();
// Backwards-compatible export expected by other modules
export const datalakeMetadataService = datalakeMetadata;
