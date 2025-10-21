import React from 'react';
import type { SkeletonLoaderProps } from '@/lib/interfaces';

/**
 * Skeleton loading component for better UX
 * This implements the unused SkeletonLoader component
 */
export default function SkeletonLoader({ 
  count = 1, 
  className = '', 
  type = 'file-card' 
}: SkeletonLoaderProps) {
  const renderSkeleton = (index: number) => {
    switch (type) {
      case 'file-card':
        return (
          <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg animate-pulse">
            <div className="aspect-video bg-slate-200 dark:bg-slate-700"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              <div className="flex space-x-2">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-16"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-20"></div>
              </div>
            </div>
          </div>
        );

      case 'list-item':
        return (
          <div key={index} className="flex items-center space-x-4 p-4 animate-pulse">
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div key={index} className="space-y-2 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
          </div>
        );

      case 'image':
        return (
          <div key={index} className="aspect-video bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
        );

      default:
        return (
          <div key={index} className="bg-slate-200 dark:bg-slate-700 rounded animate-pulse h-20"></div>
        );
    }
  };

  return (
    <div className={className}>
      {Array.from({ length: count }, (_, index) => renderSkeleton(index))}
    </div>
  );
}

// Specialized skeleton components for common use cases
export function FileCardSkeleton({ count = 6, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      <SkeletonLoader count={count} type="file-card" />
    </div>
  );
}

export function ListSkeleton({ count = 5, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <SkeletonLoader count={count} type="list-item" />
    </div>
  );
}

export function TextSkeleton({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <SkeletonLoader count={count} type="text" />
    </div>
  );
}