/**
 * Firebase Storage service for managing thumbnails
 * Provides efficient storage and retrieval of PDF thumbnails
 */

import { getStorage } from 'firebase-admin/storage';
import { getApps } from 'firebase-admin/app';

export class FirebaseStorageService {
  private static instance: FirebaseStorageService;
  private storage: ReturnType<typeof getStorage>;

  private constructor() {
    // Get the initialized Firebase app
    const app = getApps()[0];
    if (!app) {
      throw new Error('Firebase Admin app not initialized');
    }
    
    this.storage = getStorage(app);
  }

  static getInstance(): FirebaseStorageService {
    if (!FirebaseStorageService.instance) {
      FirebaseStorageService.instance = new FirebaseStorageService();
    }
    return FirebaseStorageService.instance;
  }

  /**
   * Store a thumbnail in Firebase Storage
   */
  async storeThumbnail(
    fileId: string, 
    imageBuffer: Buffer, 
    size: 'small' | 'medium' | 'large' = 'medium'
  ): Promise<string> {
    try {
      console.log('📁 Storing thumbnail in Firebase Storage:', fileId, size);
      
      const fileName = `thumbnails/${fileId}/${size}.png`;
      const bucket = this.storage.bucket();
      const file = bucket.file(fileName);
      
      // Upload the image buffer
      await file.save(imageBuffer, {
        metadata: {
          contentType: 'image/png',
          cacheControl: 'public, max-age=86400', // Cache for 24 hours
          metadata: {
            fileId: fileId,
            size: size,
            generatedAt: new Date().toISOString()
          }
        }
      });

      // Make the file publicly accessible
      await file.makePublic();
      
      // Get the download URL
      const downloadURL = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      
      console.log('✅ Thumbnail stored successfully:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('❌ Error storing thumbnail:', error);
      throw error;
    }
  }

  /**
   * Get thumbnail URL from Firebase Storage
   */
  async getThumbnailUrl(
    fileId: string, 
    size: 'small' | 'medium' | 'large' = 'medium'
  ): Promise<string | null> {
    try {
      console.log('🔍 Getting thumbnail from Firebase Storage:', fileId, size);
      
      const fileName = `thumbnails/${fileId}/${size}.png`;
      const bucket = this.storage.bucket();
      const file = bucket.file(fileName);
      
      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        console.log('📭 Thumbnail not found in Firebase Storage:', fileId, size);
        return null;
      }
      
      // Get the download URL
      const downloadURL = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      
      console.log('✅ Thumbnail found in Firebase Storage:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.log('📭 Thumbnail not found in Firebase Storage:', fileId, size);
      return null;
    }
  }

  /**
   * Check if thumbnail exists in Firebase Storage
   */
  async thumbnailExists(
    fileId: string, 
    size: 'small' | 'medium' | 'large' = 'medium'
  ): Promise<boolean> {
    try {
      const fileName = `thumbnails/${fileId}/${size}.png`;
      const bucket = this.storage.bucket();
      const file = bucket.file(fileName);
      
      // Check if file exists
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete thumbnail from Firebase Storage
   */
  async deleteThumbnail(
    fileId: string, 
    size?: 'small' | 'medium' | 'large'
  ): Promise<void> {
    try {
      console.log('🗑️ Deleting thumbnail from Firebase Storage:', fileId, size);
      
      const bucket = this.storage.bucket();
      
      if (size) {
        // Delete specific size
        const fileName = `thumbnails/${fileId}/${size}.png`;
        const file = bucket.file(fileName);
        await file.delete();
        console.log('✅ Thumbnail deleted:', fileName);
      } else {
        // Delete all sizes for this file
        const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
        const deletePromises = sizes.map(async (s) => {
          try {
            const fileName = `thumbnails/${fileId}/${s}.png`;
            const file = bucket.file(fileName);
            await file.delete();
            console.log('✅ Thumbnail deleted:', fileName);
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

  /**
   * Get all thumbnail sizes for a file
   */
  async getAllThumbnailSizes(fileId: string): Promise<Record<string, string>> {
    const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
    const results: Record<string, string> = {};
    
    for (const size of sizes) {
      try {
        const url = await this.getThumbnailUrl(fileId, size);
        if (url) {
          results[size] = url;
        }
      } catch (error) {
        // Ignore errors for missing sizes
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const firebaseStorageService = FirebaseStorageService.getInstance();
