"use client";

import { useState, useEffect } from 'react';
import { GraduationCap } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useNativeShare } from '@/hooks/useNativeShare';
import { useStudentSearch } from '@/hooks/useStudentSearch';
import { useStudentSelection } from '@/hooks/useStudentSelection';
import { useFilters } from '@/hooks/useFilters';
import { useFileFilters } from '@/hooks/useFileFilters';
import Sidebar from '@/components/ui/Sidebar';
import FilterSidebarContent from '@/components/ui/FilterSidebarContent';
import FilterPills from '@/components/ui/FilterPill';
import { FileCardSkeleton, FileListSkeleton } from '@/components/ui/Skeleton';
import FileDetailModal from '@/components/ui/FileDetailModal';
import StudentSearch from '@/components/search/StudentSearch';
import StudentHero from '@/components/student/StudentHero';
import FileGrid from '@/components/files/FileGrid';
import FileList from '@/components/files/FileList';
import { getActiveFilterCount } from '@/lib/filterUtils';
import type { MainPageStudent, FileInfo } from '@/lib/interfaces';
import { Loader2, Filter } from 'lucide-react';

export default function AantekeningenPage() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'subject' | 'topic'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Native share functionality
  const { isSupported: isNativeShareSupported, share: nativeShare, isSharing } = useNativeShare();
  
  // Check if user is admin
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.email?.endsWith('@stephensprivelessen.nl') || false;
  
  // Student search hook
  const {
    searchQuery,
    setSearchQuery,
    students,
    loading: searchLoading,
    error: searchError,
    hasSearched,
    handleSearch,
    resetSearch,
  } = useStudentSearch();
  
  // Student selection hook
  const {
    selectedStudent,
    studentOverview,
    files,
    loading: selectionLoading,
    cacheLoading,
    error: selectionError,
    handleStudentSelect,
    handleBackToSearch,
  } = useStudentSelection();
  
  // Filters hook
  const {
    filters,
    subjectItems,
    topicGroupItems,
    topicItems,
    levelItems,
    schoolYearItems,
    keywordItems,
    filterPills,
    handleApplyFilters,
    handleClearFilters,
    handleRemovePill,
  } = useFilters(files);
  
  // File filtering and sorting
  const { filteredAndSortedFiles } = useFileFilters(files, filters, sortBy, sortOrder);
  
  // Auto-search from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const studentParam = urlParams.get('student');
    if (studentParam) {
      setSearchQuery(studentParam);
      handleSearch(studentParam);
    }
  }, []);

  // Handle share student
  const handleShareStudent = async (student: MainPageStudent) => {
    try {
      const response = await fetch(`/api/students/share/${student.id}`);
      const data = await response.json();
      
      if (data.success) {
        // Try native share first (iOS/Android)
        if (isNativeShareSupported) {
          const success = await nativeShare({
            title: `Aantekeningen van ${student.displayName}`,
            text: `Bekijk de aantekeningen van ${student.displayName} op Stephen's Privelessen`,
            url: data.shareableUrl
          });
          
          if (success) {
            return; // Native share was successful
          }
        }

        // Fallback to clipboard copy
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(data.shareableUrl);
            alert(`Shareable link voor ${student.displayName} gekopieerd naar klembord!`);
          } else {
            // Fallback: show the link in a prompt
            const userConfirmed = confirm(
              `Shareable link voor ${student.displayName}:\n\n${data.shareableUrl}\n\nKlik OK om de link te kopiëren, of Annuleren om te sluiten.`
            );
            if (userConfirmed) {
              // Try alternative clipboard method
              const textArea = document.createElement('textarea');
              textArea.value = data.shareableUrl;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              alert('Link gekopieerd naar klembord!');
            }
          }
        } catch {
          // Final fallback: just show the link
          alert(`Shareable link voor ${student.displayName}:\n\n${data.shareableUrl}\n\nKopieer deze link handmatig.`);
        }
      } else {
        throw new Error(data.message || 'Failed to generate shareable link');
      }
    } catch (err) {
      console.error('Error generating shareable link:', err);
      alert('Kon shareable link niet genereren');
    }
  };

  // Utility functions
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const handleFileClick = (file: FileInfo) => {
    setSelectedFile(file);
    setIsModalOpen(true);
  };

  const error = searchError || selectionError;
  const loading = searchLoading || selectionLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 dark:from-yellow-600 dark:via-yellow-700 dark:to-amber-700 relative">
      {/* Graduation Cap Watermark Pattern */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-16 h-16 text-blue-900 dark:text-yellow-300">
          <GraduationCap className="w-full h-full" />
        </div>
        <div className="absolute top-32 right-20 w-12 h-12 text-blue-900 dark:text-yellow-300">
          <GraduationCap className="w-full h-full" />
        </div>
        <div className="absolute bottom-20 left-1/4 w-14 h-14 text-blue-900 dark:text-yellow-300">
          <GraduationCap className="w-full h-full" />
        </div>
        <div className="absolute bottom-40 right-1/3 w-10 h-10 text-blue-900 dark:text-yellow-300">
          <GraduationCap className="w-full h-full" />
        </div>
        <div className="absolute top-1/2 left-10 w-8 h-8 text-blue-900 dark:text-yellow-300">
          <GraduationCap className="w-full h-full" />
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        {!selectedStudent ? (
          <StudentSearch
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            students={students}
            loading={searchLoading}
            error={searchError}
            hasSearched={hasSearched}
            isAdmin={isAdmin}
            onSearch={handleSearch}
            onStudentSelect={handleStudentSelect}
            onShareStudent={handleShareStudent}
            onReset={resetSearch}
          />
        ) : (
          <div>
            {/* Student Header */}
            <StudentHero
              student={selectedStudent}
              overview={studentOverview}
              isAdmin={isAdmin}
              isSharing={isSharing}
              onBack={handleBackToSearch}
              onShare={handleShareStudent}
            />

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {cacheLoading && (
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400 mr-3" />
                  <div>
                    <p className="text-blue-800 dark:text-blue-200 font-medium">Metadata wordt verwerkt...</p>
                    <p className="text-blue-600 dark:text-blue-300 text-sm">AI analyseert de documenten voor betere zoekresultaten</p>
                  </div>
                </div>
              </div>
            )}

            {/* Filters and Sort */}
            {files.length > 0 && (
              <div className="space-y-4 mb-6">
                {/* Filter Button and Pills */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setIsFilterSidebarOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 dark:bg-slate-800 text-yellow-100 dark:text-yellow-300 rounded-lg hover:bg-blue-800 dark:hover:bg-slate-700 transition-colors font-medium"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    {getActiveFilterCount(filters) > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center w-6 h-6 bg-yellow-300 text-blue-900 rounded-full text-xs font-bold">
                        {getActiveFilterCount(filters)}
                      </span>
                    )}
                  </button>

                  {/* Filter Pills */}
                  {filterPills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <FilterPills
                        pills={filterPills}
                        onRemovePill={handleRemovePill}
                        onClearAll={handleClearFilters}
                      />
                    </div>
                  )}
                </div>

                {/* File Count and View Mode Toggle */}
                <div className="flex justify-between items-center bg-blue-800/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 rounded-lg border border-blue-700/20 dark:border-slate-700/50">
                  <span className="text-sm text-yellow-200 dark:text-yellow-300">
                    {filteredAndSortedFiles.length} van {files.length} bestanden
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        viewMode === 'list' 
                          ? 'bg-yellow-500 dark:bg-yellow-600 text-blue-900 dark:text-slate-900' 
                          : 'bg-yellow-100 dark:bg-slate-700 text-blue-900 dark:text-slate-200 hover:bg-yellow-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      Lijst
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        viewMode === 'grid' 
                          ? 'bg-yellow-500 dark:bg-yellow-600 text-blue-900 dark:text-slate-900' 
                          : 'bg-yellow-100 dark:bg-slate-700 text-blue-900 dark:text-slate-200 hover:bg-yellow-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      Grid
                    </button>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'subject' | 'topic')}
                      className="px-3 py-1 text-sm border border-yellow-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-400 bg-yellow-100 dark:bg-slate-800 text-blue-900 dark:text-slate-100"
                    >
                      <option value="date">Datum</option>
                      <option value="name">Naam</option>
                      <option value="subject">Vak</option>
                      <option value="topic">Onderwerp</option>
                    </select>

                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                      className="px-3 py-1 text-sm border border-yellow-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-400 bg-yellow-100 dark:bg-slate-800 text-blue-900 dark:text-slate-100"
                    >
                      <option value="desc">Nieuwste eerst</option>
                      <option value="asc">Oudste eerst</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Sidebar */}
            <Sidebar
              isOpen={isFilterSidebarOpen}
              onClose={() => setIsFilterSidebarOpen(false)}
              title="Filters"
              width="lg"
            >
              <FilterSidebarContent
                currentFilters={filters}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
                subjectItems={subjectItems}
                topicGroupItems={topicGroupItems}
                topicItems={topicItems}
                levelItems={levelItems}
                schoolYearItems={schoolYearItems}
                keywordItems={keywordItems}
              />
            </Sidebar>

            {loading ? (
              <div className="space-y-6">
                <div className="flex items-center justify-center py-4" role="status" aria-live="polite" aria-label="Loading files">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                  <span className="ml-2 text-gray-600 dark:text-gray-400 font-medium">Bestanden laden...</span>
                </div>
                <section className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    viewMode === 'grid' ? (
                      <FileCardSkeleton key={index} />
                    ) : (
                      <FileListSkeleton key={index} />
                    )
                  ))}
                </section>
              </div>
            ) : (
              viewMode === 'grid' ? (
                <FileGrid
                  files={filteredAndSortedFiles}
                  onFileClick={handleFileClick}
                  formatDate={formatDate}
                  formatFileSize={formatFileSize}
                />
              ) : (
                <FileList
                  files={filteredAndSortedFiles}
                  onFileClick={handleFileClick}
                  formatDate={formatDate}
                  formatFileSize={formatFileSize}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* File Detail Modal */}
      {selectedFile && selectedStudent && (
        <FileDetailModal
          file={selectedFile}
          studentId={selectedStudent.id}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedFile(null);
          }}
        />
      )}
    </div>
  );
}
