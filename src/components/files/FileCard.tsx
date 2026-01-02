"use client";

import { Calendar, FileText, Download } from 'lucide-react';
import Thumbnail from '@/components/ui/Thumbnail';
import { getFileDate } from '@/lib/date-extractor';
import type { FileInfo } from '@/lib/interfaces';

interface FileCardProps {
  file: FileInfo;
  viewMode: 'grid' | 'list';
  onFileClick: (file: FileInfo) => void;
  formatDate: (dateString: string) => string;
  formatFileSize: (bytes: number) => string;
}

export default function FileCard({
  file,
  viewMode,
  onFileClick,
  formatDate,
  formatFileSize,
}: FileCardProps) {
  if (viewMode === 'grid') {
    return (
      <div className="p-5">
        <div className="relative mb-4 rounded-lg overflow-hidden">
          <Thumbnail
            src={file.thumbnailUrl} 
            alt={file.title}
            fileId={file.id}
            fileType={file.mimeType}
            className="rounded-lg cursor-pointer"
            onClick={() => onFileClick(file)}
          />
        </div>
        <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2 text-yellow-50 dark:text-yellow-200 group-hover:text-yellow-100 dark:group-hover:text-yellow-100 transition-colors">
          {file.title}
        </h3>
        <p className="text-xs sm:text-sm text-yellow-200/60 dark:text-yellow-300/60 mb-2 sm:mb-3 font-mono truncate">{file.name}</p>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-yellow-300/70 dark:text-yellow-400/70 mb-3 sm:mb-4">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span className="hidden sm:inline">{formatDate(getFileDate(file).toISOString())}</span>
            <span className="sm:hidden">{formatDate(getFileDate(file).toISOString()).slice(0, 5)}</span>
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {formatFileSize(file.size ?? 0)}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3 sm:mb-4">
          {file.subject && (
            <span className="bg-yellow-100/90 dark:bg-yellow-900/50 text-blue-900 dark:text-yellow-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium shadow-sm">
              {file.subject}
            </span>
          )}
          {file.topic && (
            <span className="bg-yellow-200/90 dark:bg-yellow-800/50 text-blue-900 dark:text-yellow-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium shadow-sm">
              {file.topic}
            </span>
          )}
          {file.level && (
            <span className="bg-yellow-300/90 dark:bg-yellow-700/50 text-blue-900 dark:text-yellow-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium shadow-sm">
              {file.level}
            </span>
          )}
          {file.schoolYear && (
            <span className="bg-yellow-400/90 dark:bg-yellow-600/50 text-blue-900 dark:text-yellow-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium shadow-sm">
              {file.schoolYear}
            </span>
          )}
        </div>
        {file.keywords && file.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {file.keywords.slice(0, 3).map((keyword, index) => (
              <span key={index} className="bg-yellow-100/70 dark:bg-yellow-900/40 text-blue-900 dark:text-yellow-200 px-2 py-0.5 rounded-md text-xs">
                {keyword}
              </span>
            ))}
          </div>
        )}
        {file.summary && (
          <p className="text-[10px] sm:text-xs text-yellow-200/90 dark:text-yellow-300/90 bg-yellow-100/10 dark:bg-yellow-900/20 backdrop-blur-sm p-2 sm:p-3 rounded-lg mb-3 sm:mb-4 line-clamp-2 border border-yellow-200/20 dark:border-yellow-700/30">
            {file.summary}
          </p>
        )}
        <div className="flex gap-2">
          <a
            href={file.downloadUrl}
            className="flex-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 dark:from-yellow-600 dark:via-amber-600 dark:to-yellow-700 text-blue-900 dark:text-slate-900 text-center py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            aria-label={`Download ${file.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Downloaden</span>
            <span className="sm:hidden">Download</span>
          </a>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex-1 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div 
          className="w-20 h-14 rounded-lg overflow-hidden relative group cursor-pointer flex-shrink-0"
        >
          <Thumbnail
            src={file.thumbnailUrl} 
            alt={file.title}
            fileId={file.id}
            fileType={file.mimeType}
            className="w-full h-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base sm:text-lg text-yellow-50 dark:text-yellow-200 line-clamp-2 group-hover:text-yellow-100 dark:group-hover:text-yellow-100 transition-colors">
            {file.title}
          </h3>
          <p className="text-xs sm:text-sm text-yellow-200/60 dark:text-yellow-300/60 font-mono mt-1 truncate">{file.name}</p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-yellow-300/70 dark:text-yellow-400/70 mt-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span className="hidden sm:inline">{formatDate(getFileDate(file).toISOString())}</span>
              <span className="sm:hidden">{formatDate(getFileDate(file).toISOString()).slice(0, 5)}</span>
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {formatFileSize(file.size ?? 0)}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {file.subject && (
              <span className="bg-yellow-100/90 dark:bg-yellow-900/50 text-blue-900 dark:text-yellow-200 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">
                {file.subject}
              </span>
            )}
            {file.topic && (
              <span className="bg-yellow-200/90 dark:bg-yellow-800/50 text-blue-900 dark:text-yellow-200 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">
                {file.topic}
              </span>
            )}
            {file.level && (
              <span className="bg-yellow-300/90 dark:bg-yellow-700/50 text-blue-900 dark:text-yellow-200 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">
                {file.level}
              </span>
            )}
            {file.schoolYear && (
              <span className="bg-yellow-400/90 dark:bg-yellow-600/50 text-blue-900 dark:text-yellow-200 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">
                {file.schoolYear}
              </span>
            )}
          </div>
          {file.keywords && file.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {file.keywords.slice(0, 4).map((keyword, index) => (
                <span key={index} className="bg-yellow-100/70 dark:bg-yellow-900/40 text-blue-900 dark:text-yellow-200 px-2 py-0.5 rounded-md text-xs">
                  {keyword}
                </span>
              ))}
            </div>
          )}
          {file.summary && (
            <p className="text-xs text-yellow-200/90 dark:text-yellow-300/90 bg-yellow-100/10 dark:bg-yellow-900/20 backdrop-blur-sm p-2 rounded-lg mt-2 max-w-md line-clamp-2 border border-yellow-200/20 dark:border-yellow-700/30">
              {file.summary}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <a
          href={file.downloadUrl}
          className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 dark:from-yellow-600 dark:via-amber-600 dark:to-yellow-700 text-blue-900 dark:text-slate-900 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-1.5 sm:gap-2"
          aria-label={`Download ${file.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Downloaden</span>
          <span className="sm:hidden">DL</span>
        </a>
      </div>
    </div>
  );
}

