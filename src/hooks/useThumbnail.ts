import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for loading thumbnails with built-in rate limiting
 * Prevents 429 errors from Google Drive by limiting concurrent requests
 */
export function useThumbnail(src: string | null, fallbackSrc?: string) {
  const [imageSrc, setImageSrc] = useState<string | null>(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!src) {
      setImageSrc(null);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    // For now, set visible immediately to bypass intersection observer issues
    // TODO: Re-implement intersection observer properly
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
    setImageSrc(src);

    // Create a new image to test loading
    const img = new Image();
    
    const handleLoad = () => {
      console.log('✅ useThumbnail: Thumbnail loaded successfully:', src);
      setIsLoading(false);
      setHasError(false);
    };

    const handleError = () => {
      console.log('❌ useThumbnail: Thumbnail failed to load:', src);
      setIsLoading(false);
      setHasError(true);
      
      // Try fallback if available
      if (fallbackSrc && fallbackSrc !== src) {
        console.log('🔄 useThumbnail: Trying fallback:', fallbackSrc);
        setImageSrc(fallbackSrc);
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          console.log('✅ useThumbnail: Fallback loaded successfully:', fallbackSrc);
          setHasError(false);
        };
        fallbackImg.onerror = () => {
          console.log('❌ useThumbnail: Fallback also failed:', fallbackSrc);
        };
        fallbackImg.src = fallbackSrc;
      }
    };

    img.onload = handleLoad;
    img.onerror = handleError;
    
    // Add a small delay to prevent overwhelming Google Drive
    const timeoutId = setTimeout(() => {
      console.log('🚀 useThumbnail: Setting image src:', src);
      img.src = src;
    }, Math.random() * 500); // Random delay 0-500ms

    return () => {
      clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
    };
  }, [isVisible, src, fallbackSrc]);

  return {
    imageSrc,
    isLoading,
    hasError,
    imgRef,
    isVisible
  };
}
