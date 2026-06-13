/**
 * Datalake Thumbnail Service
 * Stores and retrieves PDF thumbnails in S3 datalake (silver layer)
 */

import * as crypto from 'crypto';
import * as MinIO from 'minio';
import { createMinioClient, getMinioConfig } from '@stephenadei/datalake';

import { MedallionBuckets } from '@stephenadei/datalake';

// Silver layer for thumbnails (S3 bucket when DATALAKE_BUCKET set)
const BUCKET_NAME = process.env.DATALAKE_BUCKET || MedallionBuckets.SILVER_EDUCATION;
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
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/ad08b7f1-3612-41b2-8ac8-a7e245539c08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'datalake-thumbnails.ts:29',message:'transformPresignedUrl entry',data:{url:url.substring(0,150),presignedEndpoint:this.presignedEndpoint,internalEndpoint:this.internalEndpoint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    if (!this.presignedEndpoint || !this.internalEndpoint) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/ad08b7f1-3612-41b2-8ac8-a7e245539c08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'datalake-thumbnails.ts:33',message:'No endpoints configured',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return url;
    }
    
    try {
      const urlObj = new URL(url);
      const publicUrlObj = new URL(this.presignedEndpoint);
      
      urlObj.hostname = publicUrlObj.hostname;
      urlObj.port = publicUrlObj.port || '';
      urlObj.protocol = publicUrlObj.protocol;
      
      const transformed = urlObj.toString();
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/ad08b7f1-3612-41b2-8ac8-a7e245539c08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'datalake-thumbnails.ts:45',message:'transformPresignedUrl result',data:{original:url.substring(0,150),transformed:transformed.substring(0,150)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      return transformed;
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/ad08b7f1-3612-41b2-8ac8-a7e245539c08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'datalake-thumbnails.ts:50',message:'transformPresignedUrl error',data:{error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('Error transforming presigned URL:', error);
      return url;
    }
  }

  private initializeMinIO() {
    try {
      if (typeof window !== 'undefined') {
        throw new Error('S3/datalake client can only be used server-side');
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
   * IMPORTANT: This must match the sanitization used when thumbnails were generated.
   * Currently thumbnails are stored WITHOUT slashes (old method) to match existing thumbnails.
   * If you regenerate thumbnails, update process-thumbnails.mjs to use the same method.
   */
  private getThumbnailPath(fileId: string, size: 'small' | 'medium' | 'large'): string {
    // Sanitize fileId: replace all non-alphanumeric (except -) with _
    // This matches how thumbnails were originally stored (without slashes)
    let sanitized = fileId.replace(/[^a-zA-Z0-9-]/g, '_');
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/ad08b7f1-3612-41b2-8ac8-a7e245539c08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'datalake-thumbnails.ts:99',message:'getThumbnailPath entry',data:{fileId,size,sanitized},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // If path is too long, truncate and add hash
    const MAX_LENGTH = 900; // Leave room for /thumbnails/ and /size.png
    if (sanitized.length > MAX_LENGTH) {
      const hash = crypto.createHash('md5').update(fileId).digest('hex').substring(0, 8);
      sanitized = sanitized.substring(0, MAX_LENGTH - hash.length - 1) + '_' + hash;
    }
    
    const path = `${THUMBNAIL_PREFIX}${sanitized}/${size}.png`;
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/ad08b7f1-3612-41b2-8ac8-a7e245539c08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'datalake-thumbnails.ts:112',message:'getThumbnailPath result',data:{fileId,path},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    return path;
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
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/ad08b7f1-3612-41b2-8ac8-a7e245539c08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'datalake-thumbnails.ts:168',message:'Before statObject',data:{fileId,objectPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Check if object exists
      try {
        await this.minioClient.statObject(BUCKET_NAME, objectPath);
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/ad08b7f1-3612-41b2-8ac8-a7e245539c08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'datalake-thumbnails.ts:172',message:'statObject success',data:{objectPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      } catch (error: any) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/ad08b7f1-3612-41b2-8ac8-a7e245539c08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'datalake-thumbnails.ts:175',message:'statObject failed',data:{objectPath,error:error?.code||error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.log('📭 Thumbnail not found in datalake:', objectPath);
        return null;
      }

      // Generate presigned URL (valid for 7 days)
      let url = await this.presignedClient.presignedGetObject(
        BUCKET_NAME,
        objectPath,
        7 * 24 * 60 * 60 // 7 days
      );
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/ad08b7f1-3612-41b2-8ac8-a7e245539c08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'datalake-thumbnails.ts:179',message:'Presigned URL generated',data:{url:url.substring(0,150)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // Transform URL to use public endpoint if needed
      const originalUrl = url;
      url = this.transformPresignedUrl(url);
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/ad08b7f1-3612-41b2-8ac8-a7e245539c08',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'datalake-thumbnails.ts:186',message:'After transformPresignedUrl',data:{originalUrl:originalUrl.substring(0,150),transformedUrl:url.substring(0,150),presignedEndpoint:this.presignedEndpoint,internalEndpoint:this.internalEndpoint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

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

