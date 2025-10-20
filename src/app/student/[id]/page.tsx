"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FileText, User, Share2, Download, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import FileDetailModal from '@/components/ui/FileDetailModal';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { useNativeShare } from '@/hooks/useNativeShare';
import { useStudentFiles } from '@/hooks/useStudentFiles';

interface Student {
  id: string;
  displayName: string;
  subject: string;
  driveFolderId: string;
  url?: string;
}

interface StudentOverview {
  fileCount: number;
  lastActivity: string | null;
  lastActivityDate: string;
  lastFile?: {
    id: string;
    name: string;
    title: string;
    subject?: string;
    topic?: string;
    summary?: string;
    modifiedTime: string;
  };
}

interface FileInfo {
  id: string;
  name: string;
  title: string;
  url: string;
  downloadUrl: string;
  viewUrl: string;
  thumbnailUrl: string;
  modifiedTime: string;
  size: number;
  subject?: string;
  topic?: string;
  level?: string;
  schoolYear?: string;
  keywords?: string[];
  summary?: string;
  summaryEn?: string;
  topicEn?: string;
  keywordsEn?: string[];
}

export default function StudentPage() {
  const params = useParams();
  const studentId = params.id as string;
  
  const [student, setStudent] = useState<Student | null>(null);
  const [studentOverview, setStudentOverview] = useState<StudentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareableUrl, setShareableUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use React Query for files
  const {
    files,
    totalCount,
    hasMore,
    fromCache,
    cacheFresh,
    isLoading: filesLoading,
    refresh,
    loadMore,
    isLoadingMore,
  } = useStudentFiles(studentId);
  
  // Native share functionality
  const { isSupported: isNativeShareSupported, share: nativeShare, isSharing } = useNativeShare();
  
  // Filter states
  const [filters, setFilters] = useState({
    subject: '',
    topic: '',
    level: '',
    schoolYear: '',
    keyword: ''
  });
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'subject' | 'topic'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageOffset, setPageOffset] = useState(0);

  useEffect(() => {
    if (studentId) {
      loadStudentData();
    }
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load student info, overview, and share in parallel
      const [studentResponse, overviewResponse, shareResponse] = await Promise.all([
        fetch(`/api/students/${studentId}/share`), // Use share API to get student info
        fetch(`/api/students/${studentId}/overview`),
        fetch(`/api/students/${studentId}/share`) // Duplicate for consistency
      ]);

      if (!studentResponse.ok || !overviewResponse.ok) {
        throw new Error('Failed to load student data');
      }

      const shareData = await studentResponse.json();
      const overviewData = await overviewResponse.json();

      if (shareData.success && shareData.student) {
        // Use student data from share API
        setStudent({
          id: shareData.student.id,
          displayName: shareData.student.displayName,
          subject: shareData.student.subject,
          driveFolderId: shareData.student.driveFolderId
        });
      } else if (overviewData.success) {
        // Fallback: If share API didn't work but overview did, create a basic student object
        let displayName = `Student ${studentId.slice(0, 8)}...`;
        
        if (overviewData.overview.lastFile) {
          // Try to extract a name from the filename
          const fileName = overviewData.overview.lastFile.name;
          const nameMatch = fileName.match(/(?:Priveles?|Les|Note)\s+(\d+\s+\w+\s+\d{4})/i);
          if (nameMatch) {
            displayName = `Student (${nameMatch[1]})`;
          }
        }
        
        setStudent({
          id: studentId,
          displayName: displayName,
          subject: overviewData.overview.lastFile?.subject || 'Onbekend',
          driveFolderId: studentId // Use the ID as driveFolderId for hybrid approach
        });
      }

      if (overviewData.success) {
        setStudentOverview(overviewData.overview);
      }

      if (shareData.success) {
        setShareableUrl(shareData.shareableUrl);
      }

    } catch (err) {
      console.error('Error loading student data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load student data');
    } finally {
      setLoading(false);
    }
  };


  const handleFileClick = (file: FileInfo) => {
    setSelectedFile(file);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
  };

  const loadMoreFiles = () => {
    if (hasMore && !isLoadingMore && studentId) {
      loadMore(files.length);
    }
  };

  const handleShare = async () => {
    if (!student) return;

    // Try native share first (iOS/Android)
    if (isNativeShareSupported) {
      const success = await nativeShare({
        title: `Aantekeningen van ${student.displayName}`,
        text: `Bekijk de aantekeningen van ${student.displayName} voor ${student.subject} op Stephen's Privelessen`,
        url: shareableUrl
      });
      
      if (success) {
        return; // Native share was successful
      }
    }

    // Fallback to clipboard copy
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareableUrl);
        alert('Link gekopieerd naar klembord!');
      } else {
        // Fallback: show the link in a prompt
        const userConfirmed = confirm(
          `Shareable link:\n\n${shareableUrl}\n\nKlik OK om de link te kopiëren, of Annuleren om te sluiten.`
        );
        if (userConfirmed) {
          // Try alternative clipboard method
          const textArea = document.createElement('textarea');
          textArea.value = shareableUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert('Link gekopieerd naar klembord!');
        }
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Final fallback: just show the link
      alert(`Shareable link:\n\n${shareableUrl}\n\nKopieer deze link handmatig.`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter and sort functions
  const getUniqueValues = (files: FileInfo[], key: keyof FileInfo) => {
    const values = files
      .map(file => file[key])
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    return values;
  };


  const filteredAndSortedFiles = () => {
    // Remove duplicates by file.id first
    const uniqueFiles = files.filter((file: FileInfo, index: number, self: FileInfo[]) => 
      index === self.findIndex((f: FileInfo) => f.id === file.id)
    );
    
    const filtered = uniqueFiles.filter((file: FileInfo) => {
      if (filters.subject && file.subject !== filters.subject) return false;
      if (filters.topic && file.topic !== filters.topic) return false;
      if (filters.level && file.level !== filters.level) return false;
      if (filters.schoolYear && file.schoolYear !== filters.schoolYear) return false;
      if (filters.keyword && !file.keywords?.some((k: string) => k.toLowerCase().includes(filters.keyword.toLowerCase()))) return false;
      return true;
    });

    // Sort files
    filtered.sort((a: FileInfo, b: FileInfo) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.modifiedTime).getTime();
          bValue = new Date(b.modifiedTime).getTime();
          break;
        case 'name':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'subject':
          aValue = a.subject || '';
          bValue = b.subject || '';
          break;
        case 'topic':
          aValue = a.topic || '';
          bValue = b.topic || '';
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="status" aria-live="polite" aria-label="Loading student data">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Laden van studentgegevens...</p>
        </div>
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md" role="alert" aria-live="assertive">
            <h1 className="text-xl font-semibold text-gray-900 mb-4">Student niet gevonden</h1>
            <p className="text-gray-600 mb-6">{error || 'De gevraagde student kon niet worden gevonden.'}</p>
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar overzicht
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl shadow-lg border-b border-white/20 dark:border-slate-700/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-all duration-200 hover:scale-105"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Terug
              </Link>
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
              <div>
                <h1 className="text-xl font-semibold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  {student?.displayName || 'Onbekende student'}
                </h1>
                <p className="text-sm text-slate-500">{student?.subject || 'Onbekend vak'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <DarkModeToggle />
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSharing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Delen...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    {isNativeShareSupported ? 'Deel' : 'Deel Link'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section with Last File Details */}
        {studentOverview && studentOverview.lastFile && (
          <div className="mb-8">
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl overflow-hidden shadow-xl rounded-2xl border border-white/20 dark:border-slate-700/20">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900 dark:text-blue-100 text-lg mb-2">
                      Laatste aantekening
                    </h3>
                    <p className="text-blue-800 dark:text-blue-200 font-medium text-lg mb-2">
                      {studentOverview.lastFile.title}
                    </p>
                    {studentOverview.lastFile.subject && studentOverview.lastFile.topic && (
                      <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
                        {studentOverview.lastFile.subject} • {studentOverview.lastFile.topic}
                      </p>
                    )}
                    {studentOverview.lastFile.summary && (
                      <p className="text-blue-600 dark:text-blue-400 text-sm line-clamp-2">
                        {studentOverview.lastFile.summary}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl overflow-hidden shadow-xl rounded-2xl border border-white/20 dark:border-slate-700/20 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <User className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">Student</dt>
                    <dd className="text-lg font-semibold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      {student?.displayName || 'Onbekende student'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl overflow-hidden shadow-xl rounded-2xl border border-white/20 dark:border-slate-700/20 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">Aantal bestanden</dt>
                    <dd className="text-lg font-semibold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      {studentOverview?.fileCount || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && student && (
          <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 dark:from-red-500/20 dark:to-orange-500/20 backdrop-blur-xl border border-red-200/30 dark:border-red-400/30 rounded-2xl p-6 mb-6 shadow-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg mr-4">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-slate-800 font-semibold">Er is een probleem opgetreden</p>
                <p className="text-slate-600 text-sm">{error}</p>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  refresh();
                }}
                className="ml-4 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-600 text-white text-sm font-medium rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                Opnieuw proberen
              </button>
            </div>
          </div>
        )}

        {/* Cache Status Banner */}
        {fromCache && !cacheFresh && (
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 backdrop-blur-xl border border-amber-200/30 dark:border-amber-400/30 rounded-2xl p-6 mb-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg mr-4">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-slate-800 font-semibold">Cache wordt ververst...</p>
                  <p className="text-slate-600 text-sm">Nieuwe bestanden worden opgehaald in de achtergrond</p>
                </div>
              </div>
              <button
                onClick={() => refresh()}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-medium rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                Nu verversen
              </button>
            </div>
          </div>
        )}

        {/* Sticky Header with Filters and Sorting */}
        {files.length > 0 && (
          <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 shadow-md">
            <div className="px-4 sm:px-6 py-4">
              {/* File Count and Sort Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {filteredAndSortedFiles().length} van {files.length} bestanden
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {/* Sort By Dropdown */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'subject' | 'topic')}
                    className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="date">Datum</option>
                    <option value="name">Naam</option>
                    <option value="subject">Vak</option>
                    <option value="topic">Onderwerp</option>
                  </select>

                  {/* Sort Order Dropdown */}
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="desc">Nieuwste eerst</option>
                    <option value="asc">Oudste eerst</option>
                  </select>

                  {/* Clear Filters Button */}
                  {(filters.subject || filters.topic || filters.level || filters.schoolYear || filters.keyword) && (
                    <button
                      onClick={() => setFilters({ subject: '', topic: '', level: '', schoolYear: '', keyword: '' })}
                      className="text-sm px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      Filters wissen
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filter Chips */}
              {(filters.subject || filters.topic || filters.level || filters.schoolYear || filters.keyword) && (
                <div className="flex flex-wrap gap-2">
                  {filters.subject && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                      Vak: {filters.subject}
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, subject: '' }))}
                        className="ml-1 hover:text-blue-600 dark:hover:text-blue-300"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.topic && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm rounded-full">
                      Onderwerp: {filters.topic}
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, topic: '' }))}
                        className="ml-1 hover:text-green-600 dark:hover:text-green-300"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.level && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-sm rounded-full">
                      Niveau: {filters.level}
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, level: '' }))}
                        className="ml-1 hover:text-purple-600 dark:hover:text-purple-300"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.schoolYear && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 text-sm rounded-full">
                      Jaar: {filters.schoolYear}
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, schoolYear: '' }))}
                        className="ml-1 hover:text-orange-600 dark:hover:text-orange-300"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.keyword && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200 text-sm rounded-full">
                      Trefwoord: {filters.keyword}
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, keyword: '' }))}
                        className="ml-1 hover:text-pink-600 dark:hover:text-pink-300"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modern Card-Based Files Grid */}
        {filesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg animate-pulse">
                <div className="aspect-video bg-slate-200 dark:bg-slate-700"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16 mt-6">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <FileText className="h-8 w-8 text-slate-500 dark:text-slate-400" />
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Geen bestanden gevonden</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 mb-6">
              Er zijn momenteel geen aantekeningen beschikbaar voor {student?.displayName || 'deze student'}.
            </p>
            <button
              onClick={() => {
                setError(null);
                refresh();
              }}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <Loader2 className="h-4 w-4 mr-2" />
              Opnieuw laden
            </button>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6" role="list" aria-label="Student files">
            {filteredAndSortedFiles().map((file: FileInfo) => (
              <div
                key={file.id}
                onClick={() => handleFileClick(file)}
                className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group"
                role="listitem"
                aria-label={`Open ${file.name}`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 overflow-hidden">
                  {file.thumbnailUrl ? (
                    <img
                      src={file.thumbnailUrl}
                      alt={file.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const img = e.currentTarget as HTMLImageElement;
                        if (!img.src.includes('/api/placeholder/')) {
                          img.src = `/api/placeholder/${file.id}`;
                        } else {
                          img.style.display = 'none';
                        }
                      }}
                    />
                  ) : (
                    <img
                      src={`/api/placeholder/${file.id}`}
                      alt={file.title}
                      className="w-full h-full object-cover"
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.style.display = 'none';
                      }}
                    />
                  )}
                  
                  {/* Fallback Icon */}
                  <div className={`absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700 ${file.thumbnailUrl ? 'hidden' : 'flex'}`}>
                    <FileText className="h-12 w-12 text-slate-400 dark:text-slate-500" />
                  </div>

                  {/* Overlay on Hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-white/90 dark:bg-slate-900/90 rounded-full p-3">
                      <svg className="w-6 h-6 text-slate-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 line-clamp-2 mb-2">
                    {file.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                    {formatDate(file.modifiedTime)} • {formatFileSize(file.size)}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {file.subject && (
                      <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full font-medium">
                        {file.subject}
                      </span>
                    )}
                    {file.topic && (
                      <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded-full font-medium">
                        {file.topic}
                      </span>
                    )}
                    {file.level && (
                      <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-xs rounded-full font-medium">
                        {file.level}
                      </span>
                    )}
                  </div>

                  {/* Summary */}
                  {file.summary && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                      {file.summary}
                    </p>
                  )}

                  {/* Download Button */}
                  <a
                    href={file.downloadUrl}
                    onClick={(e) => e.stopPropagation()}
                    className="block w-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white font-medium py-2 px-3 rounded-lg text-center hover:shadow-lg transition-all duration-200 text-sm"
                  >
                    <Download className="h-4 w-4 inline mr-1" />
                    Downloaden
                  </a>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Load More Button */}
        {hasMore && !filesLoading && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => {
                const newOffset = pageOffset + (files.length || 10);
                setPageOffset(newOffset);
                loadMore(newOffset);
              }}
              disabled={isLoadingMore}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Laden...
                </>
              ) : (
                'Meer laden'
              )}
            </button>
          </div>
        )}
      </div>

      {/* File Detail Modal */}
      <FileDetailModal
        file={selectedFile}
        studentId={studentId}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
}
