"use client";

import { useState, useEffect } from 'react';
import { Search, FileText, Calendar, User, ArrowLeft, Loader2, Share2, Download } from 'lucide-react';
import Link from 'next/link';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import { useNativeShare } from '@/hooks/useNativeShare';

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

export default function AantekeningenPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentOverview, setStudentOverview] = useState<StudentOverview | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [hasSearched, setHasSearched] = useState(false);
  
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

  // Auto-search from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const studentParam = urlParams.get('student');
    if (studentParam) {
      setSearchQuery(studentParam);
      handleSearch(studentParam);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-load files when student is selected (removed redundant logic)
  // The handleStudentSelect function is called directly when student is selected

  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setStudents([]);
    setSelectedStudent(null);
    setFiles([]);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/students/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.success) {
        setStudents(data.students);
        if (data.students.length === 1) {
          // Auto-select if only one student found
          handleStudentSelect(data.students[0]);
        }
      } else {
        // More specific error handling
        if (data.error === 'Configuration error') {
          setError('De app is momenteel niet beschikbaar. Probeer het later opnieuw.');
        } else if (data.message) {
          setError(data.message);
        } else {
          setError('Er is een fout opgetreden bij het zoeken. Probeer het opnieuw.');
        }
      }
    } catch (err) {
      setError('Er is een fout opgetreden bij het zoeken. Controleer je internetverbinding.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = async (student: Student) => {
    console.log('🔄 Loading student:', student.name, 'ID:', student.id);
    setSelectedStudent(student);
    setLoading(true);
    setCacheLoading(false);
    setError(null);
    setFiles([]); // Clear previous files

    try {
      console.log('📊 Fetching overview for student:', student.id);
      // Get overview first
      const overviewResponse = await fetch(`/api/students/${student.id}/overview`);
      const overviewData = await overviewResponse.json();

      if (overviewData.success) {
        console.log('✅ Overview loaded:', overviewData.overview);
        setStudentOverview(overviewData.overview);
      } else {
        console.log('❌ Overview failed:', overviewData);
      }

      // Show cache loading immediately when starting to fetch files
      setCacheLoading(true);
      
      console.log('📁 Fetching files for student:', student.id);
      // Get files (this is where AI analysis happens)
      const filesResponse = await fetch(`/api/students/${student.id}/files`);
      const filesData = await filesResponse.json();

      console.log('📁 Files response:', filesData);

      if (filesData.success) {
        console.log('✅ Files loaded:', filesData.files?.length || 0, 'files');
        setFiles(filesData.files || []);
        
        // Check if files need more processing
        if (filesData.files && filesData.files.length > 0) {
          const hasUncachedFiles = filesData.files.some((file: FileInfo) => 
            !file.subject || !file.topic || !file.keywords || !file.summary
          );
          
          if (hasUncachedFiles) {
            console.log('⏳ Files need processing, showing cache loading...');
            // Keep showing cache loading for a bit longer
            setTimeout(() => setCacheLoading(false), 2000);
          } else {
            console.log('✅ All files processed, hiding cache loading');
            // Hide cache loading immediately if all files are processed
            setCacheLoading(false);
          }
        } else {
          console.log('❌ No files found for student - this should not happen!');
          setError('Er zijn geen bestanden gevonden voor deze student. Dit kan een technisch probleem zijn. Probeer het opnieuw of neem contact op met de beheerder.');
          setCacheLoading(false);
        }
      } else {
        console.log('❌ Files loading failed:', filesData);
        // More specific error handling for files
        if (filesData.error === 'Configuration error') {
          setError('De app is momenteel niet beschikbaar. Probeer het later opnieuw.');
        } else if (filesData.isTemporaryError) {
          setError('Er is een tijdelijk probleem met Google Drive. Probeer het over een paar minuten opnieuw.');
        } else if (filesData.message) {
          setError(filesData.message);
        } else {
          setError('Er is een fout opgetreden bij het laden van bestanden. Probeer het opnieuw.');
        }
        setCacheLoading(false);
      }
    } catch (err) {
      console.error('❌ Student select error:', err);
      setError('Er is een fout opgetreden bij het laden van studentgegevens');
      setCacheLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSearch = () => {
    setSelectedStudent(null);
    setStudentOverview(null);
    setFiles([]);
    setError(null);
    setCacheLoading(false);
    setHasSearched(false);
  };

  const handleShareStudent = async (student: Student) => {
    try {
      const response = await fetch(`/api/students/${student.id}/share`);
      const data = await response.json();
      
      if (data.success) {
        // Try native share first (iOS/Android)
        if (isNativeShareSupported) {
          const success = await nativeShare({
            title: `Aantekeningen van ${student.name}`,
            text: `Bekijk de aantekeningen van ${student.name} op Stephen's Privelessen`,
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
            alert(`Shareable link voor ${student.name} gekopieerd naar klembord!`);
          } else {
            // Fallback: show the link in a prompt
            const userConfirmed = confirm(
              `Shareable link voor ${student.name}:\n\n${data.shareableUrl}\n\nKlik OK om de link te kopiëren, of Annuleren om te sluiten.`
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
          alert(`Shareable link voor ${student.name}:\n\n${data.shareableUrl}\n\nKopieer deze link handmatig.`);
        }
      } else {
        throw new Error(data.message || 'Failed to generate shareable link');
      }
    } catch (err) {
      console.error('Error generating shareable link:', err);
      alert('Kon shareable link niet genereren');
    }
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
    const uniqueFiles = files.filter((file, index, self) => 
      index === self.findIndex(f => f.id === file.id)
    );
    
    const filtered = uniqueFiles.filter(file => {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        {!selectedStudent ? (
          /* Search Interface */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Zoek je aantekeningen</h2>
                <DarkModeToggle />
              </div>
              
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Typ je naam om je aantekeningen te vinden..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400"
                  />
                </div>
                <button
                  onClick={() => handleSearch()}
                  disabled={loading || !searchQuery.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  <p className="text-sm text-gray-500">
                    Druk op Enter of klik op "Zoeken" om te zoeken
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {students.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-700">
                    {students.length} {students.length === 1 ? 'student gevonden' : 'studenten gevonden'}
                  </h3>
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div 
                          onClick={() => handleStudentSelect(student)}
                          className="flex-1 cursor-pointer"
                        >
                          <h4 className="font-medium text-lg">{student.name}</h4>
                          <p className="text-gray-600">{student.subject}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareStudent(student);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Deel link"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <div className="text-gray-400">
                            <User className="w-6 h-6" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {students.length === 0 && !loading && hasSearched && searchQuery && (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-2">Geen studenten gevonden</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Probeer een andere naam of controleer de spelling.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStudents([]);
                      setError(null);
                      setHasSearched(false);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    Opnieuw zoeken
                  </button>
                </div>
              )}
            </div>

            {/* Privacy Notice */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 text-xl">🔒</div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-1">Privacy</h4>
                  <p className="text-blue-700 text-sm">
                    Alleen je voornaam wordt gebruikt om je aantekeningen te vinden. 
                    Ouders kunnen de voornaam van hun kind gebruiken.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Student Files Interface */
          <div>
            {/* Student Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handleBackToSearch}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Terug naar zoeken
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 rounded text-sm ${
                      viewMode === 'list' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Lijst
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1 rounded text-sm ${
                      viewMode === 'grid' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Grid
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedStudent.name}</h2>
                    <p className="text-gray-600">{selectedStudent.subject}</p>
                    {studentOverview && (
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {studentOverview.fileCount} bestanden
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Laatste activiteit: {studentOverview.lastActivityDate}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleShareStudent(selectedStudent)}
                    disabled={isSharing}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

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

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Bestanden laden...</span>
              </div>
            ) : files.length > 0 ? (
              /* Files Display */
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {filteredAndSortedFiles().map((file) => (
                  <div
                    key={file.id}
                    className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
                      viewMode === 'list' ? 'flex items-center p-4' : 'p-4'
                    }`}
                  >
                    {viewMode === 'grid' ? (
                      <div>
                        <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative group cursor-pointer" onClick={() => window.open(file.viewUrl, '_blank')}>
                          {file.thumbnailUrl ? (
                            <img 
                              src={file.thumbnailUrl} 
                              alt={file.title}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                console.log('❌ Thumbnail failed to load for:', file.title);
                                // Try placeholder as fallback
                                const img = e.currentTarget as HTMLImageElement;
                                if (!img.src.includes('/api/placeholder/')) {
                                  img.src = `/api/placeholder/${file.id}`;
                                } else {
                                  // If placeholder also fails, show the icon
                                  img.style.display = 'none';
                                  const nextElement = img.nextElementSibling as HTMLElement;
                                  if (nextElement) {
                                    nextElement.style.display = 'flex';
                                  }
                                }
                              }}
                              onLoad={() => {
                                console.log('✅ Thumbnail loaded for:', file.title);
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full flex items-center justify-center ${file.thumbnailUrl ? 'hidden' : 'flex'}`}>
                            <div className="text-center">
                              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-500">Preview niet beschikbaar</p>
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-white bg-opacity-90 rounded-full p-2">
                                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                        <h3 className="font-medium text-lg mb-2 line-clamp-2">{file.title}</h3>
                        <p className="text-sm text-gray-500 mb-2">{file.name}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <span>{formatDate(file.modifiedTime)}</span>
                          <span>{formatFileSize(file.size)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {file.subject && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">{file.subject}</span>}
                          {file.topic && <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">{file.topic}</span>}
                          {file.level && <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">{file.level}</span>}
                          {file.schoolYear && <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">{file.schoolYear}</span>}
                        </div>
                        {file.keywords && file.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {file.keywords.slice(0, 3).map((keyword, index) => (
                              <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                        {file.summary && (
                          <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mb-3">{file.summary}</p>
                        )}
                        <div className="flex gap-2">
                          <a
                            href={file.downloadUrl}
                            className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            <Download className="h-4 w-4 inline mr-1" />
                            Downloaden
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden relative group cursor-pointer" onClick={() => window.open(file.viewUrl, '_blank')}>
                            {file.thumbnailUrl ? (
                            <img 
                              src={file.thumbnailUrl} 
                              alt={file.title}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                console.log('❌ Thumbnail failed to load for:', file.title);
                                // Try placeholder as fallback
                                const img = e.currentTarget as HTMLImageElement;
                                if (!img.src.includes('/api/placeholder/')) {
                                  img.src = `/api/placeholder/${file.id}`;
                                } else {
                                  // If placeholder also fails, show the icon
                                  img.style.display = 'none';
                                  const nextElement = img.nextElementSibling as HTMLElement;
                                  if (nextElement) {
                                    nextElement.style.display = 'flex';
                                  }
                                }
                              }}
                              onLoad={() => {
                                console.log('✅ Thumbnail loaded for:', file.title);
                              }}
                            />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center ${file.thumbnailUrl ? 'hidden' : 'flex'}`}>
                              <FileText className="w-6 h-6 text-gray-400" />
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
                          <div>
                            <h3 className="font-medium text-lg">{file.title}</h3>
                            <p className="text-sm text-gray-500">{file.name}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                              <span>{formatDate(file.modifiedTime)}</span>
                              <span>{formatFileSize(file.size)}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {file.subject && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">{file.subject}</span>}
                              {file.topic && <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">{file.topic}</span>}
                              {file.level && <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">{file.level}</span>}
                              {file.schoolYear && <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">{file.schoolYear}</span>}
                            </div>
                            {file.keywords && file.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {file.keywords.slice(0, 4).map((keyword, index) => (
                                  <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                            {file.summary && (
                              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2 max-w-md">{file.summary}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={file.downloadUrl}
                            className="bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            <Download className="h-4 w-4 inline mr-2" />
                            Downloaden
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Geen bestanden gevonden</p>
                <p className="text-gray-500 text-sm mt-2 mb-4">
                  Er zijn momenteel geen aantekeningen beschikbaar voor {selectedStudent.name}.
                </p>
                <button
                  onClick={() => {
                    setFiles([]);
                    setError(null);
                    handleStudentSelect(selectedStudent);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Opnieuw laden
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}