"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FileText, User, Share2, Download, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import FileDetailModal from '@/components/ui/FileDetailModal';

interface Student {
  id: string;
  name: string;
  subject: string;
  url: string;
}

interface StudentOverview {
  fileCount: number;
  lastActivity: string | null;
  lastActivityDate: string;
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
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareableUrl, setShareableUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreFiles, setHasMoreFiles] = useState(false);
  
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

  useEffect(() => {
    if (studentId) {
      loadStudentData();
    }
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setCacheLoading(false);
      setError(null);

      // Load student info, overview, and share in parallel first
      const [studentResponse, overviewResponse, shareResponse] = await Promise.all([
        fetch(`/api/students/search?q=${encodeURIComponent(studentId)}`),
        fetch(`/api/students/${studentId}/overview`),
        fetch(`/api/students/${studentId}/share`)
      ]);

      if (!studentResponse.ok || !overviewResponse.ok) {
        throw new Error('Failed to load student data');
      }

      const studentData = await studentResponse.json();
      const overviewData = await overviewResponse.json();
      const shareData = await shareResponse.json();

      if (studentData.success && studentData.students.length > 0) {
        setStudent(studentData.students[0]);
      } else if (overviewData.success) {
        // If search didn't find the student but overview did, create a basic student object
        setStudent({
          id: studentId,
          name: `Student ${studentId.slice(0, 8)}...`, // Show partial ID as name
          subject: 'Onbekend',
          url: ''
        });
      }

      if (overviewData.success) {
        setStudentOverview(overviewData.overview);
      }

      if (shareData.success) {
        setShareableUrl(shareData.shareableUrl);
      }

      // Show cache loading immediately when starting to fetch files
      setCacheLoading(true);
      
      // Phase 1: Load first 3 most recent files for quick access
      const recentFilesResponse = await fetch(`/api/students/${studentId}/files?limit=3`);
      
      if (!recentFilesResponse.ok) {
        throw new Error('Failed to load recent files');
      }

      const recentFilesData = await recentFilesResponse.json();

      if (recentFilesData.success) {
        setFiles(recentFilesData.files);
        setHasMoreFiles(recentFilesData.hasMore);
        
        // Check if files need more processing
        if (recentFilesData.files && recentFilesData.files.length > 0) {
          const hasUncachedFiles = recentFilesData.files.some((file: FileInfo) => 
            !file.subject || !file.topic || !file.keywords || !file.summary
          );
          
          if (hasUncachedFiles) {
            // Keep showing cache loading for a bit longer
            setTimeout(() => setCacheLoading(false), 2000);
          } else {
            // Hide cache loading immediately if all files are processed
            setCacheLoading(false);
          }
        } else {
          setCacheLoading(false);
        }
      } else {
        setCacheLoading(false);
      }

      // Phase 2: Load remaining files in background (if there are more)
      if (recentFilesData.success && recentFilesData.hasMore) {
        loadRemainingFiles(studentId, 3);
      }

    } catch (err) {
      console.error('Error loading student data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const loadRemainingFiles = async (studentId: string, offset: number) => {
    try {
      setLoadingMore(true);
      
      const remainingFilesResponse = await fetch(`/api/students/${studentId}/files?offset=${offset}`);
      
      if (remainingFilesResponse.ok) {
        const remainingFilesData = await remainingFilesResponse.json();
        
        if (remainingFilesData.success) {
          // Append remaining files to existing files
          setFiles(prevFiles => [...prevFiles, ...remainingFilesData.files]);
          setHasMoreFiles(remainingFilesData.hasMore);
        }
      }
    } catch (error) {
      console.error('Error loading remaining files:', error);
    } finally {
      setLoadingMore(false);
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
    if (hasMoreFiles && !loadingMore && studentId) {
      loadRemainingFiles(studentId, files.length);
    }
  };

  const copyShareableLink = async () => {
    try {
      // Try to copy to clipboard
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
    const filtered = files.filter(file => {
      if (filters.subject && file.subject !== filters.subject) return false;
      if (filters.topic && file.topic !== filters.topic) return false;
      if (filters.level && file.level !== filters.level) return false;
      if (filters.schoolYear && file.schoolYear !== filters.schoolYear) return false;
      if (filters.keyword && !file.keywords?.some(k => k.toLowerCase().includes(filters.keyword.toLowerCase()))) return false;
      return true;
    });

    // Sort files
    filtered.sort((a, b) => {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Laden van studentgegevens...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Terug
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{student.name}</h1>
                <p className="text-sm text-gray-500">{student.subject}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={copyShareableLink}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Deel Link
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <User className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Student</dt>
                    <dd className="text-lg font-medium text-gray-900">{student.name}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Aantal bestanden</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {studentOverview?.fileCount || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Cache Loading Banner */}
        {cacheLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-3" />
              <div>
                <p className="text-blue-800 font-medium">Metadata wordt verwerkt...</p>
                <p className="text-blue-600 text-sm">AI analyseert de documenten voor betere zoekresultaten</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Sort */}
        {files.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Subject Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vak</label>
                <select
                  value={filters.subject}
                  onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alle vakken</option>
                  {getUniqueValues(files, 'subject').map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              {/* Topic Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Onderwerp</label>
                <select
                  value={filters.topic}
                  onChange={(e) => setFilters(prev => ({ ...prev, topic: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alle onderwerpen</option>
                  {getUniqueValues(files, 'topic').map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>

              {/* Level Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
                <select
                  value={filters.level}
                  onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alle niveaus</option>
                  {getUniqueValues(files, 'level').map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              {/* School Year Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schooljaar</label>
                <select
                  value={filters.schoolYear}
                  onChange={(e) => setFilters(prev => ({ ...prev, schoolYear: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alle schooljaren</option>
                  {getUniqueValues(files, 'schoolYear').map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Keyword Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zoek in trefwoorden</label>
                <input
                  type="text"
                  value={filters.keyword}
                  onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                  placeholder="Typ trefwoord..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sorteer op</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'subject' | 'topic')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date">Datum</option>
                  <option value="name">Naam</option>
                  <option value="subject">Vak</option>
                  <option value="topic">Onderwerp</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Volgorde</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">Nieuwste eerst</option>
                  <option value="asc">Oudste eerst</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="mt-4 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {filteredAndSortedFiles().length} van {files.length} bestanden
              </span>
              <button
                onClick={() => setFilters({ subject: '', topic: '', level: '', schoolYear: '', keyword: '' })}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Filters wissen
              </button>
            </div>
          </div>
        )}

        {/* Files List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Aantekeningen</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Alle bestanden van {student.name}
            </p>
          </div>
          
          {files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Geen bestanden</h3>
              <p className="mt-1 text-sm text-gray-500 mb-4">
                Er zijn nog geen aantekeningen beschikbaar voor deze student.
              </p>
              <button
                onClick={() => {
                  setFiles([]);
                  setError(null);
                  loadStudentData();
                }}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Opnieuw laden
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredAndSortedFiles().map((file) => (
                <li key={file.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden relative group cursor-pointer" onClick={() => handleFileClick(file)}>
                            {file.thumbnailUrl ? (
                              <Image 
                                src={file.thumbnailUrl} 
                                alt={file.title}
                                width={64}
                                height={48}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                  e.currentTarget.style.display = 'none';
                                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (nextElement) {
                                    nextElement.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center ${file.thumbnailUrl ? 'hidden' : 'flex'}`}>
                              <FileText className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="bg-white bg-opacity-90 rounded-full p-1">
                                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 min-w-0 flex-1">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {file.title}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {file.name}
                          </p>
                          <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                            <span>{formatDate(file.modifiedTime)}</span>
                            <span>{formatFileSize(file.size)}</span>
                            {file.subject && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{file.subject}</span>}
                            {file.topic && <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">{file.topic}</span>}
                            {file.level && <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">{file.level}</span>}
                            {file.schoolYear && <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full">{file.schoolYear}</span>}
                          </div>
                          {file.keywords && file.keywords.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {file.keywords.map((keyword, index) => (
                                <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          )}
                          {file.summary && (
                            <p className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">{file.summary}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={file.downloadUrl}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            
            {hasMoreFiles && (
              <div className="px-4 py-4 sm:px-6 border-t border-gray-200">
                <button
                  onClick={loadMoreFiles}
                  disabled={loadingMore}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Laden...
                    </>
                  ) : (
                    'Meer aantekeningen laden'
                  )}
                </button>
              </div>
            )}
          )
        </div>
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
