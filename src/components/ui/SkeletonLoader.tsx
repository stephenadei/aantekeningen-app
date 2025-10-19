import { FileText } from 'lucide-react';

interface SkeletonLoaderProps {
  count?: number;
}

export default function SkeletonLoader({ count = 3 }: SkeletonLoaderProps) {
  return (
    <ul className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
      {Array.from({ length: count }).map((_, index) => (
        <li key={index}>
          <div className="px-6 py-6 sm:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0 flex-1">
                <div className="flex-shrink-0">
                  <div className="w-20 h-16 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                    <FileText className="h-6 w-6 text-slate-400" />
                  </div>
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  {/* Title skeleton */}
                  <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded animate-pulse mb-2 w-3/4"></div>
                  {/* Filename skeleton */}
                  <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded animate-pulse mb-3 w-1/2"></div>
                  {/* Metadata skeleton */}
                  <div className="flex items-center space-x-4">
                    <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded animate-pulse w-20"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded animate-pulse w-16"></div>
                    <div className="h-5 bg-slate-200 dark:bg-slate-600 rounded-full animate-pulse w-16"></div>
                    <div className="h-5 bg-slate-200 dark:bg-slate-600 rounded-full animate-pulse w-20"></div>
                  </div>
                  {/* Keywords skeleton */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded animate-pulse w-12"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded animate-pulse w-16"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded animate-pulse w-14"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Download button skeleton */}
                <div className="h-10 bg-slate-200 dark:bg-slate-600 rounded-xl animate-pulse w-24"></div>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
