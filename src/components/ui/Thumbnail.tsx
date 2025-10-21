import React from 'react';
import { FileText } from 'lucide-react';
import { useThumbnail } from '@/hooks/useThumbnail';
import type { ThumbnailProps } from '@/lib/interfaces';

export default function Thumbnail({ 
  src, 
  alt, 
  className = '', 
  onClick,
  fileId,
  fileType,
  showFallback = true 
}: ThumbnailProps) {
  const fallbackSrc = fileId ? `/api/placeholder/${fileId}` : undefined;
  const { imageSrc, isLoading, hasError, imgRef, isVisible } = useThumbnail(src || null, fallbackSrc, fileId, fileType);

  return (
    <div 
      className={`relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 overflow-hidden ${className}`}
      onClick={onClick}
    >
      {isVisible && imageSrc && !hasError ? (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
      ) : showFallback ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              {isLoading ? 'Laden...' : 'Preview niet beschikbaar'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
