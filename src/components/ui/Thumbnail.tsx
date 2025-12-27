import React from 'react';
import { FileText, Loader2, RefreshCw } from 'lucide-react';
import { useThumbnail } from '@/hooks/useThumbnail';
import type { ThumbnailProps } from '@/lib/interfaces';

// Shimmer loading component
function ShimmerLoader() {
  return (
    <div className="absolute inset-0 animate-pulse">
      <div className="w-full h-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-[length:200%_100%] animate-shimmer" />
    </div>
  );
}

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
  const [retryCount, setRetryCount] = React.useState(0);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryCount(prev => prev + 1);
    // Force reload by updating key
    window.location.reload();
  };

  const isClickable = onClick !== undefined;
  const hasImage = isVisible && imageSrc && !hasError;

  return (
    <div 
      className={`
        relative aspect-video 
        bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 
        dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 
        overflow-hidden rounded-lg
        ${isClickable ? 'cursor-pointer' : ''}
        ${isClickable ? 'ring-2 ring-transparent hover:ring-blue-400 dark:hover:ring-blue-500' : ''}
        ${isClickable ? 'transition-all duration-300 hover:scale-[1.02] hover:shadow-lg' : ''}
        ${className}
      `}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Open ${alt || 'file'}` : undefined}
    >
      {/* Shimmer loading effect */}
      {isLoading && !hasImage && <ShimmerLoader />}
      
      {/* Loading spinner overlay */}
      {isLoading && hasImage && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      )}

      {/* Image display */}
      {hasImage ? (
        <>
          <img
            ref={imgRef}
            src={imageSrc}
            alt={alt}
            className="w-full h-full object-cover transition-transform duration-300"
            key={retryCount}
          />
          {/* Click indicator overlay */}
          {isClickable && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="bg-white/90 dark:bg-slate-900/90 rounded-full p-2 shadow-lg transform scale-90 hover:scale-100 transition-transform duration-200">
                <svg className="w-5 h-5 text-slate-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
          )}
        </>
      ) : showFallback ? (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="text-center">
            {hasError ? (
              <>
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-red-500 dark:text-red-400" />
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 mb-2 font-medium">
                  Preview niet beschikbaar
                </p>
                {retryCount < 2 && (
                  <button
                    onClick={handleRetry}
                    className="mt-2 px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors duration-200 flex items-center gap-1.5 mx-auto"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Opnieuw proberen
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {isLoading ? 'Laden...' : 'Preview niet beschikbaar'}
                </p>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
