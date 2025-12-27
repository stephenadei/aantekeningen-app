import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({ className = '', variant = 'rectangular' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-[length:200%_100%] animate-shimmer';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
}

export function FileCardSkeleton() {
  return (
    <div className="group relative bg-gradient-to-br from-blue-800/95 via-blue-900/90 to-indigo-900/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-blue-700/50 dark:border-blue-600/30 p-5">
      {/* Thumbnail skeleton */}
      <div className="relative mb-4 rounded-lg overflow-hidden aspect-video">
        <Skeleton className="w-full h-full" variant="rectangular" />
      </div>
      
      {/* Title skeleton */}
      <Skeleton className="h-6 w-3/4 mb-2" variant="text" />
      
      {/* Subtitle skeleton */}
      <Skeleton className="h-4 w-1/2 mb-3" variant="text" />
      
      {/* Metadata skeleton */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-3 w-24" variant="text" />
        <Skeleton className="h-3 w-16" variant="text" />
      </div>
      
      {/* Tags skeleton */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Skeleton className="h-6 w-16 rounded-full" variant="circular" />
        <Skeleton className="h-6 w-20 rounded-full" variant="circular" />
        <Skeleton className="h-6 w-14 rounded-full" variant="circular" />
      </div>
      
      {/* Button skeleton */}
      <Skeleton className="h-10 w-full rounded-lg" variant="rectangular" />
    </div>
  );
}

export function FileListSkeleton() {
  return (
    <div className="group relative bg-gradient-to-br from-blue-800/95 via-blue-900/90 to-indigo-900/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-blue-700/50 dark:border-blue-600/30 p-4 flex items-center gap-4">
      {/* Thumbnail skeleton */}
      <Skeleton className="w-20 h-14 rounded-lg flex-shrink-0" variant="rectangular" />
      
      {/* Content skeleton */}
      <div className="flex-1 min-w-0">
        <Skeleton className="h-5 w-3/4 mb-2" variant="text" />
        <Skeleton className="h-4 w-1/2 mb-2" variant="text" />
        <div className="flex gap-2 mb-2">
          <Skeleton className="h-3 w-20" variant="text" />
          <Skeleton className="h-3 w-16" variant="text" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" variant="circular" />
          <Skeleton className="h-5 w-20 rounded-full" variant="circular" />
        </div>
      </div>
      
      {/* Button skeleton */}
      <Skeleton className="h-10 w-32 rounded-lg flex-shrink-0" variant="rectangular" />
    </div>
  );
}

