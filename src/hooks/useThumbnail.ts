import { useState, useEffect, useRef } from 'react';
import { thumbnailService } from '@/lib/thumbnail-service';

// Global rate limiting for Google Drive thumbnails
class ThumbnailRateLimiter {
  private static instance: ThumbnailRateLimiter;
  private queue: Array<() => void> = [];
  private activeRequests = 0;
  private readonly maxConcurrent = 1; // Only 1 concurrent request to avoid 429 errors
  private readonly delayBetweenRequests = 3000; // 3 seconds between requests

  static getInstance(): ThumbnailRateLimiter {
    if (!ThumbnailRateLimiter.instance) {
      ThumbnailRateLimiter.instance = new ThumbnailRateLimiter();
    }
    return ThumbnailRateLimiter.instance;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          this.processQueue();
        }
      });
      this.processQueue();
    });
  }

  private processQueue() {
    if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const nextRequest = this.queue.shift();
    if (nextRequest) {
      this.activeRequests++;
      setTimeout(() => {
        nextRequest();
      }, this.delayBetweenRequests);
    }
  }
}

/**
 * Custom hook for loading thumbnails with built-in rate limiting
 * Prevents 429 errors from Google Drive by limiting concurrent requests
 */
export function useThumbnail(src: string | null, fallbackSrc?: string, fileId?: string, fileType?: string) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const rateLimiter = useRef(ThumbnailRateLimiter.getInstance());

  useEffect(() => {
    if (!src) {
      setImageSrc(null);
      setIsLoading(false);
      setHasError(false);
      setIsVisible(false);
      return;
    }

    // Set visible immediately to bypass intersection observer issues
    setIsVisible(true);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src]);

  useEffect(() => {
    if (!isVisible || !src) {
      console.log('🔍 useThumbnail: Skipping load - isVisible:', isVisible, 'src:', src);
      return;
    }

    console.log('🔄 useThumbnail: Starting to load thumbnail:', src);
    setIsLoading(true);
    setHasError(false);

    // Use rate limiter to control Google Drive requests
    const loadThumbnail = async () => {
      try {
        await rateLimiter.current.execute(async () => {
          // If we have a fileId, use the thumbnail service for better fallback handling
          if (fileId) {
            try {
              const thumbnailUrl = await thumbnailService.getThumbnailUrl({
                fileId: fileId,
                fileType: fileType,
                size: 'medium'
              });
              
              console.log('✅ useThumbnail: Got thumbnail URL from service:', thumbnailUrl);
              setImageSrc(thumbnailUrl);
              setIsLoading(false);
              setHasError(false);
              return;
            } catch (error) {
              console.log('❌ useThumbnail: Thumbnail service failed:', error);
              // Fall through to direct loading
            }
          }

          // Direct loading fallback
          return new Promise<void>((resolve, reject) => {
            const img = new Image();
            
            const handleLoad = () => {
              console.log('✅ useThumbnail: Thumbnail loaded successfully:', src);
              setImageSrc(src);
              setIsLoading(false);
              setHasError(false);
              resolve();
            };

            const handleError = () => {
              console.log('❌ useThumbnail: Thumbnail failed to load:', src);
              setIsLoading(false);
              setHasError(true);
              
              // Try fallback if available
              if (fallbackSrc && fallbackSrc !== src) {
                console.log('🔄 useThumbnail: Trying fallback:', fallbackSrc);
                setImageSrc(fallbackSrc);
                setHasError(false); // Reset error state for fallback
                const fallbackImg = new Image();
                fallbackImg.onload = () => {
                  console.log('✅ useThumbnail: Fallback loaded successfully:', fallbackSrc);
                  setHasError(false);
                };
                fallbackImg.onerror = () => {
                  console.log('❌ useThumbnail: Fallback also failed:', fallbackSrc);
                  setHasError(true);
                };
                fallbackImg.src = fallbackSrc;
              } else if (fileId) {
                // Use placeholder as last resort
                console.log('🔄 useThumbnail: Using placeholder for:', fileId);
                setImageSrc(`/api/placeholder/${fileId}`);
                setHasError(false);
              }
              reject(new Error('Thumbnail failed to load'));
            };

            img.onload = handleLoad;
            img.onerror = handleError;
            
            console.log('🚀 useThumbnail: Setting image src:', src);
            img.src = src;
          });
        });
      } catch (error) {
        console.log('❌ useThumbnail: Rate limited request failed:', error);
        // Fallback to placeholder immediately on rate limit
        if (fallbackSrc) {
          console.log('🔄 useThumbnail: Using fallback after rate limit error');
          setImageSrc(fallbackSrc);
          setHasError(false);
        } else if (fileId) {
          // Use placeholder service as last resort
          console.log('🔄 useThumbnail: Using placeholder after rate limit error');
          setImageSrc(`/api/placeholder/${fileId}`);
          setHasError(false);
        }
        setIsLoading(false);
      }
    };

    loadThumbnail();
  }, [isVisible, src, fallbackSrc, fileId, fileType, rateLimiter]);

  return {
    imageSrc,
    isLoading,
    hasError,
    imgRef,
    isVisible
  };
}
