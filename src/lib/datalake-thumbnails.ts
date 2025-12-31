/**
 * Datalake Thumbnail Service
 * Stores and retrieves PDF thumbnails in MinIO datalake
 */

import * as MinIO from 'minio';
import { createMinioClient, getMinioConfig } from '@stephen/datalake';

import { MedallionBuckets } from '@stephen/datalake';

// Silver layer for thumbnails
const BUCKET_NAME = MedallionBuckets.SILVER_EDUCATION;
const THUMBNAIL_PREFIX = 'thumbnails/';

class DatalakeThumbnailService {
  private minioClient!: MinIO.Client;
  private presignedClient!: MinIO.Client;
  private isInitialized = false;
  private presignedEndpoint: string | null = null;
  private internalEndpoint: string | null = null;

  constructor() {
    this.initializeMinIO();
  }

  /**
   * Transform presigned URL to use public endpoint if needed
   */
  private transformPresignedUrl(url: string): string {
    if (!this.presignedEndpoint || !this.internalEndpoint) {
      return url;
    }
    
    try {
      const urlObj = new URL(url);
      const publicUrlObj = new URL(this.presignedEndpoint);
      
      urlObj.hostname = publicUrlObj.hostname;
      urlObj.port = publicUrlObj.port || '';
      urlObj.protocol = publicUrlObj.protocol;
      
      return urlObj.toString();
    } catch (error) {
      console.error('Error transforming presigned URL:', error);
      return url;
    }
  }

  private initializeMinIO() {
    try {
      if (typeof window !== 'undefined') {
        throw new Error('MinIO client can only be used server-side');
      }

      // Use shared utility for base config
      const baseConfig = getMinioConfig();
      const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
      const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT || 'localhost';

      // Internal client for operations - use shared utility but override SSL for internal connection
      const internalHostname = baseConfig.endPoint;
      const internalPort = baseConfig.port;
      this.minioClient = new MinIO.Client({
        endPoint: internalHostname,
        port: internalPort,
        useSSL: false, // Internal connection is always HTTP
        accessKey: baseConfig.accessKey,
        secretKey: baseConfig.secretKey,
      });

      // Presigned client uses same internal connection, we transform URLs later
      this.presignedClient = new MinIO.Client({
        endPoint: internalHostname,
        port: internalPort,
        useSSL: false,
        accessKey: baseConfig.accessKey,
        secretKey: baseConfig.secretKey,
      });

      // Set up endpoint transformation for presigned URLs
      const publicUrlObj = new URL(publicEndpoint.startsWith('http') ? publicEndpoint : `https://${publicEndpoint}`);
      this.presignedEndpoint = publicUrlObj.origin;
      this.internalEndpoint = `http://${internalHostname}:${internalPort}`;

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
      let url = await this.presignedClient.presignedGetObject(
        BUCKET_NAME,
        objectPath,
        7 * 24 * 60 * 60 // 7 days
      );

      // Transform URL to use public endpoint if needed
      url = this.transformPresignedUrl(url);

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

