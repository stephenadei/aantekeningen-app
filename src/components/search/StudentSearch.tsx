"use client";

import { Search, FileText, Calendar, User, Share2, GraduationCap, Shield } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import type { MainPageStudent } from '@/lib/interfaces';

interface StudentSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  students: MainPageStudent[];
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
  isAdmin: boolean;
  onSearch: () => void;
  onStudentSelect: (student: MainPageStudent) => void;
  onShareStudent: (student: MainPageStudent) => void;
  onReset: () => void;
}

export default function StudentSearch({
  searchQuery,
  setSearchQuery,
  students,
  loading,
  error,
  hasSearched,
  isAdmin,
  onSearch,
  onStudentSelect,
  onShareStudent,
  onReset,
}: StudentSearchProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-blue-800/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-lg shadow-md p-6 border-4 border-blue-700/20 dark:border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <GraduationCap className="h-8 w-8 text-yellow-300" />
            <h2 className="text-2xl font-bold text-yellow-100 dark:text-yellow-300">Zoek je aantekeningen</h2>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 bg-blue-900/80 dark:bg-slate-800/80 hover:bg-blue-900 dark:hover:bg-slate-700 text-yellow-100 dark:text-yellow-300 rounded-lg transition-colors border border-yellow-300/30 dark:border-yellow-500/30 hover:border-yellow-300/50 dark:hover:border-yellow-500/50"
                title="Admin Dashboard"
              >
                <Shield className="w-5 h-5" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            <DarkModeToggle />
          </div>
        </div>
        
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSearch()}
              placeholder="Typ je naam om je aantekeningen te vinden..."
              className="w-full pl-10 pr-4 py-3 border border-yellow-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-400 focus:border-transparent bg-yellow-100 dark:bg-slate-800 text-blue-900 dark:text-slate-100 placeholder-blue-600 dark:placeholder-slate-400"
            />
          </div>
          <button
            onClick={onSearch}
            disabled={loading || !searchQuery.trim()}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-blue-900 font-bold rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Zoeken...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Zoeken
              </>
            )}
          </button>
        </div>
        
        {!hasSearched && searchQuery && (
          <div className="mb-4 text-center">
            <p className="text-sm text-yellow-200 dark:text-yellow-300">
              Druk op Enter of klik op &quot;Zoeken&quot; om te zoeken
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6" role="alert" aria-live="assertive">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {students.length > 0 && (
          <section className="space-y-3" role="region" aria-labelledby="results-heading">
            <h3 id="results-heading" className="font-medium text-yellow-200 dark:text-yellow-300">
              {students.length} {students.length === 1 ? 'student gevonden' : 'studenten gevonden'}
            </h3>
            {students.map((student) => (
              <div
                key={student.id}
                className="p-4 border-2 border-yellow-300 dark:border-yellow-600/50 rounded-lg hover:bg-yellow-100/20 dark:hover:bg-yellow-900/20 transition-colors bg-blue-800/90 dark:bg-slate-800/90 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <div 
                    onClick={() => onStudentSelect(student)}
                    className="flex-1 cursor-pointer"
                  >
                          <h4 className="font-bold text-lg text-yellow-100 dark:text-yellow-300">{student.displayName}</h4>
                          <p className="text-yellow-200 dark:text-yellow-400">{student.subject}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {student.hasNotes ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-300 rounded border border-green-500/30">
                          <FileText className="h-3 w-3" />
                          Aantekeningen
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-500/20 text-gray-300 rounded border border-gray-500/30">
                          <FileText className="h-3 w-3" />
                          Geen aantekeningen
                        </span>
                      )}
                      {student.hasAppointments && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                          <Calendar className="h-3 w-3" />
                          Afspraken
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShareStudent(student);
                      }}
                      className="p-2 text-yellow-300 hover:text-yellow-100 transition-colors hover:bg-yellow-500/20 rounded-full"
                      title="Deel link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <div className="text-yellow-300">
                      <User className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {students.length === 0 && !loading && hasSearched && searchQuery && (
          <div className="text-center py-8" role="status" aria-live="polite">
            <p className="text-yellow-200 dark:text-yellow-300 mb-2">Geen studenten gevonden</p>
            <p className="text-sm text-yellow-300 dark:text-yellow-400 mb-4">
              Probeer een andere naam of controleer de spelling.
            </p>
            <button
              onClick={onReset}
              className="text-yellow-300 dark:text-yellow-400 hover:text-yellow-100 dark:hover:text-yellow-200 text-sm underline"
            >
              Opnieuw zoeken
            </button>
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="mt-6 bg-blue-800/90 dark:bg-slate-900/90 backdrop-blur-xl border border-blue-700/20 dark:border-slate-700/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-yellow-300 dark:text-yellow-400 text-xl">🔒</div>
          <div>
            <h4 className="font-medium text-yellow-100 dark:text-yellow-300 mb-1">Privacy</h4>
            <p className="text-yellow-200 dark:text-yellow-400 text-sm">
              Alleen je voornaam wordt gebruikt om je aantekeningen te vinden. 
              Ouders kunnen de voornaam van hun kind gebruiken.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

