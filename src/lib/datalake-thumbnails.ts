/**
 * Datalake Thumbnail Service
 * Stores and retrieves PDF thumbnails in MinIO datalake
 */

import * as MinIO from 'minio';

const BUCKET_NAME = process.env.DATALAKE_BUCKET_EDUCATION_BRONZE || 'bronze-education';
const THUMBNAIL_PREFIX = 'thumbnails/';

class DatalakeThumbnailService {
  private minioClient!: MinIO.Client;
  private presignedClient!: MinIO.Client;
  private isInitialized = false;
  private presignedEndpoint: string | null = null;

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

      // Internal client for operations
      this.minioClient = new MinIO.Client({
        endPoint: 'localhost',
        port: 9000,
        useSSL: false,
        accessKey: accessKey,
        secretKey: secretKey,
      });

      // Presigned client for public URLs
      if (endpoint !== 'localhost' && !endpoint.includes('127.0.0.1')) {
        const protocol = useSSL ? 'https' : 'http';
        const publicPort = port === 80 || port === 443 ? '' : `:${port}`;
        this.presignedEndpoint = `${protocol}://${endpoint}${publicPort}`;
        
        this.presignedClient = new MinIO.Client({
          endPoint: endpoint,
          port: port,
          useSSL: useSSL,
          accessKey: accessKey,
          secretKey: secretKey,
        });
      } else {
        this.presignedEndpoint = null;
        this.presignedClient = this.minioClient;
      }

      this.isInitialized = true;
      console.log('✅ Datalake Thumbnail Service initialized');
    } catch (error) {
      console.error('Failed to initialize Datalake Thumbnail Service:', error);
      throw error;
    }
  }

  /**
   * Get thumbnail object path
   */
  private getThumbnailPath(fileId: string, size: 'small' | 'medium' | 'large'): string {
    // Sanitize fileId (remove slashes, keep only alphanumeric and dashes)
    const sanitizedFileId = fileId.replace(/[^a-zA-Z0-9-]/g, '_');
    return `${THUMBNAIL_PREFIX}${sanitizedFileId}/${size}.png`;
  }

  /**
   * Store thumbnail in datalake
   */
  async storeThumbnail(
    fileId: string,
    imageBuffer: Buffer,
    size: 'small' | 'medium' | 'large' = 'medium'
  ): Promise<string> {
    try {
      if (!this.isInitialized) {
        throw new Error('Datalake Thumbnail Service not initialized');
      }

      const objectPath = this.getThumbnailPath(fileId, size);
      console.log('📁 Storing thumbnail in datalake:', objectPath);

      await this.minioClient.putObject(
        BUCKET_NAME,
        objectPath,
        imageBuffer,
        imageBuffer.length,
        {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400', // 24 hours
        }
      );

      // Get presigned URL for public access
      const url = await this.getThumbnailUrl(fileId, size);
      if (!url) {
        throw new Error('Failed to generate thumbnail URL');
      }

      console.log('✅ Thumbnail stored successfully:', url);
      return url;
    } catch (error) {
      console.error('❌ Error storing thumbnail:', error);
      throw error;
    }
  }

  /**
   * Get thumbnail URL from datalake
   */
  async getThumbnailUrl(
    fileId: string,
    size: 'small' | 'medium' | 'large' = 'medium'
  ): Promise<string | null> {
    try {
      if (!this.isInitialized) {
        return null;
      }

      const objectPath = this.getThumbnailPath(fileId, size);
      
      // Check if object exists
      try {
        await this.minioClient.statObject(BUCKET_NAME, objectPath);
      } catch (error) {
        console.log('📭 Thumbnail not found in datalake:', objectPath);
        return null;
      }

      // Generate presigned URL (valid for 7 days)
      const url = await this.presignedClient.presignedGetObject(
        BUCKET_NAME,
        objectPath,
        7 * 24 * 60 * 60 // 7 days
      );

      console.log('✅ Thumbnail found in datalake:', url);
      return url;
    } catch (error) {
      console.log('📭 Thumbnail not found in datalake:', error);
      return null;
    }
  }

  /**
   * Check if thumbnail exists
   */
  async thumbnailExists(
    fileId: string,
    size: 'small' | 'medium' | 'large' = 'medium'
  ): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      const objectPath = this.getThumbnailPath(fileId, size);
      await this.minioClient.statObject(BUCKET_NAME, objectPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete thumbnail
   */
  async deleteThumbnail(
    fileId: string,
    size?: 'small' | 'medium' | 'large'
  ): Promise<void> {
    try {
      if (!this.isInitialized) {
        return;
      }

      if (size) {
        const objectPath = this.getThumbnailPath(fileId, size);
        await this.minioClient.removeObject(BUCKET_NAME, objectPath);
        console.log('✅ Thumbnail deleted:', objectPath);
      } else {
        // Delete all sizes
        const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
        const deletePromises = sizes.map(async (s) => {
          try {
            const objectPath = this.getThumbnailPath(fileId, s);
            await this.minioClient.removeObject(BUCKET_NAME, objectPath);
            console.log('✅ Thumbnail deleted:', objectPath);
          } catch (error) {
            // Ignore errors for files that don't exist
            console.log('📭 Thumbnail not found for deletion:', fileId, s);
          }
        });
        
        await Promise.all(deletePromises);
      }
    } catch (error) {
      console.error('❌ Error deleting thumbnail:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const datalakeThumbnailService = new DatalakeThumbnailService();

