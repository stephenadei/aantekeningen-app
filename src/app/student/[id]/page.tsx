"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FileText, User, Share2, Download, ArrowLeft, Loader2, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import FileDetailModal from '@/components/ui/FileDetailModal';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import { useNativeShare } from '@/hooks/useNativeShare';
import Thumbnail from '@/components/ui/Thumbnail';
import { useStudentFiles } from '@/hooks/useStudentFiles';
import { 
  getSubjectDisplayNameFromString, 
  getTopicGroupDisplayNameFromString 
} from '@/data/taxonomy';
import type { ApiFileInfo, StudentPageStudent, StudentPageStudentOverview, FileInfo } from '@/lib/interfaces';

// FileInfo interface is now imported from @/lib/interfaces

export default function StudentPage() {
  const params = useParams();
  const studentId = params.id as string;
  
  const [student, setStudent] = useState<StudentPageStudent | null>(null);
  const [studentOverview, setStudentOverview] = useState<StudentPageStudentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareableUrl, setShareableUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use React Query for files
  const {
    files,
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
  }, [studentId]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load student info and overview in parallel
      const [studentResponse, overviewResponse] = await Promise.all([
        fetch(`/api/students/${studentId}/share`), // Use share API to get student info
        fetch(`/api/students/${studentId}/overview`)
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
      } else if (shareData.success && shareData.studentName) {
        // Use studentName from share API response
        setStudent({
          id: studentId,
          displayName: shareData.studentName,
          subject: overviewData.success ? (overviewData.overview.lastFile?.subject || 'Onbekend') : 'Onbekend',
          driveFolderId: studentId
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
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 dark:from-yellow-600 dark:via-yellow-700 dark:to-amber-700 relative">
      {/* Graduation Cap Watermark Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 left-10 w-16 h-16 text-blue-900">
          <GraduationCap className="w-full h-full" />
        </div>
        <div className="absolute top-32 right-20 w-12 h-12 text-blue-900">
          <GraduationCap className="w-full h-full" />
        </div>
        <div className="absolute bottom-20 left-1/4 w-14 h-14 text-blue-900">
          <GraduationCap className="w-full h-full" />
        </div>
        <div className="absolute bottom-40 right-1/3 w-10 h-10 text-blue-900">
          <GraduationCap className="w-full h-full" />
        </div>
        <div className="absolute top-1/2 left-10 w-8 h-8 text-blue-900">
          <GraduationCap className="w-full h-full" />
        </div>
      </div>
      {/* Header */}
      <div className="bg-blue-900/95 backdrop-blur-xl shadow-lg border-b border-blue-800/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center text-yellow-200 hover:text-yellow-100 transition-all duration-200 hover:scale-105"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Terug
              </Link>
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-yellow-300 to-transparent" />
              <div className="flex items-center space-x-3">
                <GraduationCap className="h-6 w-6 text-yellow-300" />
                <div>
                  <h1 className="text-xl font-semibold text-yellow-100">
                    {student?.displayName || 'Onbekende student'}
                  </h1>
                  <p className="text-sm text-yellow-200">{student?.subject || 'Onbekend vak'}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <DarkModeToggle />
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-blue-900 text-sm font-medium rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
        {/* Hero Section with Student Name */}
        <div className="mb-8">
          <div className="bg-blue-800/90 backdrop-blur-xl overflow-hidden shadow-xl rounded-2xl border border-blue-700/20">
            <div className="p-8 text-center">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <GraduationCap className="h-12 w-12 text-yellow-300" />
                <h1 className="text-4xl font-bold text-yellow-100 uppercase tracking-wide">
                  {student?.displayName || 'Onbekende student'}
                </h1>
                <GraduationCap className="h-12 w-12 text-yellow-300" />
              </div>
              <p className="text-xl text-yellow-200 font-medium">
                {student?.subject || 'Onbekend vak'}
              </p>
            </div>
          </div>
        </div>

        {/* Last File Details */}
        {studentOverview && studentOverview.lastFile && (
          <div className="mb-8">
            <div className="bg-blue-800/90 backdrop-blur-xl overflow-hidden shadow-xl rounded-2xl border border-blue-700/20">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-yellow-100 text-lg mb-2">
                      Laatste aantekening
                    </h3>
                    <p className="text-yellow-200 font-medium text-lg mb-2">
                      {studentOverview.lastFile.title}
                    </p>
                    {studentOverview.lastFile.subject && (
                      <p className="text-yellow-300 text-sm mb-3">
                        {getSubjectDisplayNameFromString(studentOverview.lastFile.subject)}
                        {studentOverview.lastFile.topicGroup && ` • ${getTopicGroupDisplayNameFromString(studentOverview.lastFile.topicGroup)}`}
                        {studentOverview.lastFile.topic && ` • ${studentOverview.lastFile.topic}`}
                      </p>
                    )}
                    {studentOverview.lastFile.summary && (
                      <p className="text-yellow-200 text-sm line-clamp-2">
                        {studentOverview.lastFile.summary}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                      <FileText className="w-6 h-6 text-blue-900" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-800/90 backdrop-blur-xl overflow-hidden shadow-xl rounded-2xl border border-blue-700/20 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                    <User className="h-6 w-6 text-blue-900" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-yellow-200 truncate">Student</dt>
                    <dd className="text-lg font-semibold text-yellow-100">
                      {student?.displayName || 'Onbekende student'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-800/90 backdrop-blur-xl overflow-hidden shadow-xl rounded-2xl border border-blue-700/20 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                    <FileText className="h-6 w-6 text-blue-900" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-yellow-200 truncate">Aantal bestanden</dt>
                    <dd className="text-lg font-semibold text-yellow-100">
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
          <div className="sticky top-0 z-40 bg-blue-900/95 backdrop-blur-md border-b border-blue-800/50 shadow-md">
            <div className="px-4 sm:px-6 py-4">
              {/* File Count and Sort Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="text-sm font-medium text-yellow-200">
                  {filteredAndSortedFiles().length} van {files.length} bestanden
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {/* Sort By Dropdown */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'subject' | 'topic')}
                    className="px-3 py-1.5 text-sm bg-yellow-100 border border-yellow-300 rounded-lg text-blue-900 focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
                    className="px-3 py-1.5 text-sm bg-yellow-100 border border-yellow-300 rounded-lg text-blue-900 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="desc">Nieuwste eerst</option>
                    <option value="asc">Oudste eerst</option>
                  </select>

                  {/* Clear Filters Button */}
                  {(filters.subject || filters.topic || filters.level || filters.schoolYear || filters.keyword) && (
                    <button
                      onClick={() => setFilters({ subject: '', topic: '', level: '', schoolYear: '', keyword: '' })}
                      className="text-sm px-3 py-1.5 text-red-300 hover:text-red-200 hover:bg-red-900/20 rounded-lg transition-colors"
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
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6" role="list" aria-label="Student files">
            {filteredAndSortedFiles().map((file: FileInfo) => (
              <div
                key={file.id}
                onClick={() => handleFileClick(file)}
                className="bg-blue-800/90 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group"
                role="listitem"
                aria-label={`Open ${file.name}`}
              >
                {/* Thumbnail */}
                <div className="relative group">
                  <Thumbnail
                    src={file.thumbnailUrl}
                    alt={file.title}
                    fileId={file.id}
                    fileType={file.mimeType}
                    className="group-hover:scale-110 transition-transform duration-300"
                  />
                  {/* Overlay on Hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                    <div className="bg-white/90 dark:bg-slate-900/90 rounded-full p-3">
                      <svg className="w-6 h-6 text-slate-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-lg text-yellow-100 line-clamp-2 mb-2">
                    {file.title}
                  </h3>
                  <p className="text-xs text-yellow-200 mb-3">
                    {formatDate(file.modifiedTime)} • {formatFileSize(file.size || 0)}
                  </p>

                  {/* Hierarchical Taxonomy Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {file.subject && (
                      <span className="inline-block px-2 py-1 bg-yellow-100 text-blue-900 text-xs rounded-full font-medium">
                        {getSubjectDisplayNameFromString(file.subject)}
                      </span>
                    )}
                    {file.topicGroup && (
                      <span className="inline-block px-2 py-1 bg-yellow-200 text-blue-900 text-xs rounded-full font-medium">
                        {getTopicGroupDisplayNameFromString(file.topicGroup)}
                      </span>
                    )}
                    {file.topic && (
                      <span className="inline-block px-2 py-1 bg-yellow-300 text-blue-900 text-xs rounded-full font-medium">
                        {file.topic}
                      </span>
                    )}
                    {file.level && (
                      <span className="inline-block px-2 py-1 bg-yellow-400 text-blue-900 text-xs rounded-full font-medium">
                        {file.level}
                      </span>
                    )}
                  </div>

                  {/* Summary */}
                  {file.summary && (
                    <p className="text-sm text-yellow-200 line-clamp-2 mb-3">
                      {file.summary}
                    </p>
                  )}

                  {/* Download Button */}
                  <a
                    href={file.downloadUrl}
                    onClick={(e) => e.stopPropagation()}
                    className="block w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-blue-900 font-medium py-2 px-3 rounded-lg text-center hover:shadow-lg transition-all duration-200 text-sm"
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
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-blue-900 font-medium rounded-xl shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
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
