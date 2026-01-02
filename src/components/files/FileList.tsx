"use client";

import FileCard from './FileCard';
import type { FileInfo } from '@/lib/interfaces';

interface FileListProps {
  files: FileInfo[];
  onFileClick: (file: FileInfo) => void;
  formatDate: (dateString: string) => string;
  formatFileSize: (bytes: number) => string;
}

export default function FileList({
  files,
  onFileClick,
  formatDate,
  formatFileSize,
}: FileListProps) {
  return (
    <section className="space-y-4" role="list" aria-label="Student files">
      {files.map((file) => (
        <div
          key={file.id}
          onClick={() => onFileClick(file)}
          className="group relative bg-gradient-to-br from-blue-800/95 via-blue-900/90 to-indigo-900/95 dark:from-slate-800/95 dark:via-slate-900/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-blue-700/50 dark:border-slate-700/50 transition-all duration-300 ease-out hover:shadow-2xl hover:scale-[1.02] hover:border-blue-500/70 dark:hover:border-slate-600/70 flex items-center p-4 cursor-pointer"
        >
          <FileCard
            file={file}
            viewMode="list"
            onFileClick={onFileClick}
            formatDate={formatDate}
            formatFileSize={formatFileSize}
          />
        </div>
      ))}
    </section>
  );
}

