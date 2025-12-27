/**
 * Thumbnail service with multiple fallback strategies
 * Handles Google Drive rate limiting gracefully
 */

import type { ThumbnailOptions } from './interfaces';

// Import Datalake Thumbnail service only on server-side
let datalakeThumbnailService: { getThumbnailUrl: (fileId: string, size?: 'small' | 'medium' | 'large') => Promise<string | null> } | null = null;
if (typeof window === 'undefined') {
  try {
    const { datalakeThumbnailService: service } = require('./datalake-thumbnails');
    datalakeThumbnailService = service;
  } catch (error) {
    console.log('⚠️ Datalake Thumbnail Service not available:', error);
  }
}

export class ThumbnailService {
  private static instance: ThumbnailService;
  private cache = new Map<string, string>();
  private failedThumbnails = new Set<string>();
  private readonly maxRetries = 2;
  private readonly retryDelay = 2000; // 2 seconds

  static getInstance(): ThumbnailService {
    if (!ThumbnailService.instance) {
      ThumbnailService.instance = new ThumbnailService();
    }
    return ThumbnailService.instance;
  }

  /**
   * Get thumbnail URL with fallback strategy
   */
  async getThumbnailUrl(options: ThumbnailOptions): Promise<string> {
    const { fileId, fileName, fileType, size = 'medium' } = options;
    const cacheKey = `${fileId}-${size}`;

    // Return cached result if available
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Skip if we know this thumbnail fails
    if (this.failedThumbnails.has(cacheKey)) {
      return this.getPlaceholderUrl(fileId);
    }

    // Check if this is a PDF file and try datalake first
    if (fileType && fileType.toLowerCase().includes('pdf')) {
      try {
        // First check datalake if available
        if (datalakeThumbnailService) {
          console.log('🔍 Checking datalake for PDF thumbnail:', fileId, size);
          const datalakeUrl = await datalakeThumbnailService.getThumbnailUrl(fileId, size);
          if (datalakeUrl) {
            console.log('✅ Found PDF thumbnail in datalake');
            this.cache.set(cacheKey, datalakeUrl);
            return datalakeUrl;
          }
        }
        
        // If not in datalake, try our custom PDF thumbnail API
        console.log('🖼️ Trying custom PDF thumbnail API for:', fileId);
        const pdfThumbnailUrl = `/api/thumbnail/${fileId}?size=${size}`;
        const isValid = await this.testThumbnailUrl(pdfThumbnailUrl);
        if (isValid) {
          console.log('✅ Custom PDF thumbnail API works');
          this.cache.set(cacheKey, pdfThumbnailUrl);
          return pdfThumbnailUrl;
        } else {
          console.log('❌ Custom PDF thumbnail API failed');
        }
      } catch (error) {
        console.log('🚫 PDF thumbnail services failed:', error);
      }
    } else {
      // For non-PDF files, use placeholder
      console.log('📄 Non-PDF file, using placeholder');
    }

    // Mark as failed and use placeholder
    this.failedThumbnails.add(cacheKey);
    const placeholderUrl = this.getPlaceholderUrl(fileId);
    this.cache.set(cacheKey, placeholderUrl);
    return placeholderUrl;
  }

  /**
   * Get Google Drive thumbnail URL
   */
  private getGoogleDriveThumbnailUrl(fileId: string, size: 'small' | 'medium' | 'large'): string {
    const sizeMap = {
      small: 'w200-h200',
      medium: 'w400-h400',
      large: 'w800-h800'
    };
    
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=${sizeMap[size]}`;
  }

  /**
   * Get placeholder URL
   */
  private getPlaceholderUrl(fileId: string): string {
    // Use our custom placeholder API
    return `/api/placeholder/${fileId}`;
  }

  /**
   * Test if thumbnail URL is accessible
   */
  private async testThumbnailUrl(url: string): Promise<boolean> {
    try {
      // For client-side, we can't reliably test URLs due to CORS
      // So we'll assume they work and let the actual image loading handle validation
      if (typeof window !== 'undefined') {
        return true;
      }
      
      // For server-side, we can test the URL
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Clear cache for a specific file
   */
  clearCache(fileId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(fileId));
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.failedThumbnails.delete(key);
    });
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
    this.failedThumbnails.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cached: number; failed: number } {
    return {
      cached: this.cache.size,
      failed: this.failedThumbnails.size
    };
  }
}

// Export singleton instance
export const thumbnailService = ThumbnailService.getInstance();
