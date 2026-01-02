"use client";

import { ArrowLeft, User, FileText, Calendar, Share2, Shield, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { MainPageStudent, MainPageStudentOverview } from '@/lib/interfaces';
import { useNativeShare } from '@/hooks/useNativeShare';

interface StudentHeroProps {
  student: MainPageStudent;
  overview: MainPageStudentOverview | null;
  isAdmin: boolean;
  isSharing: boolean;
  onBack: () => void;
  onShare: (student: MainPageStudent) => void;
}

export default function StudentHero({
  student,
  overview,
  isAdmin,
  isSharing,
  onBack,
  onShare,
}: StudentHeroProps) {
  return (
    <div className="bg-blue-800/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-lg shadow-md p-6 mb-6 border border-blue-700/20 dark:border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-yellow-300 dark:text-yellow-400 hover:text-yellow-100 dark:hover:text-yellow-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar zoeken
        </button>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/80 dark:bg-slate-800/80 hover:bg-blue-900 dark:hover:bg-slate-700 text-yellow-100 dark:text-yellow-300 rounded-lg transition-colors border border-yellow-300/30 dark:border-yellow-500/30 hover:border-yellow-300/50 dark:hover:border-yellow-500/50 text-sm"
              title="Admin Dashboard"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-blue-900" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-yellow-100 dark:text-yellow-300">{student.displayName}</h2>
            <p className="text-yellow-200 dark:text-yellow-400">{student.subject}</p>
            {overview && (
              <div className="mt-2">
                <div className="flex items-center gap-4 text-sm text-yellow-300 dark:text-yellow-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {overview.fileCount} bestanden
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Laatste activiteit: {overview.lastActivityDate}
                  </span>
                </div>
                
                {/* Laatste aantekening details */}
                {overview.lastFile && (
                  <div className="mt-3 p-3 bg-yellow-100/20 dark:bg-yellow-900/20 rounded-lg border border-yellow-300/30 dark:border-yellow-600/30">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-yellow-100 dark:text-yellow-300 text-sm">
                          Laatste aantekening
                        </h3>
                        <p className="text-yellow-200 dark:text-yellow-300 font-medium text-sm mt-1">
                          {overview.lastFile.title}
                        </p>
                        {overview.lastFile.subject && overview.lastFile.topic && (
                          <p className="text-yellow-300 dark:text-yellow-400 text-xs mt-1">
                            {overview.lastFile.subject} • {overview.lastFile.topic}
                          </p>
                        )}
                        {overview.lastFile.summary && (
                          <p className="text-yellow-200 dark:text-yellow-300 text-xs mt-2 line-clamp-2">
                            {overview.lastFile.summary}
                          </p>
                        )}
                      </div>
                      <div className="ml-3">
                        <FileText className="w-5 h-5 text-yellow-300 dark:text-yellow-400" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onShare(student)}
            disabled={isSharing}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-blue-900 text-sm font-medium rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSharing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Delen...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 mr-2" />
                Deel Link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

