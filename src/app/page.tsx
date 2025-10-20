"use client";

import { useState, useEffect, useMemo } from 'react';
import { Search, FileText, Calendar, User, ArrowLeft, Loader2, Share2, Download, Filter } from 'lucide-react';
import Link from 'next/link';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import { useNativeShare } from '@/hooks/useNativeShare';
import FilterModal from '@/components/ui/FilterModal';
import FilterSection from '@/components/ui/FilterSection';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import FilterPills from '@/components/ui/FilterPill';
import { 
  applyFilters, 
  extractUniqueValues, 
  getFilterCounts, 
  getActiveFilterCount,
  serializeFilters,
  deserializeFilters,
  type FilterState 
} from '@/lib/filterUtils';

interface Student {
  id: string;
  displayName: string;
  subject: string;
  url: string;
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
  thumbnailUrl: string;
  viewUrl: string;
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
  
  // New advanced filter states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    subjects: [],
    topics: [],
    levels: [],
    schoolYears: [],
    keywords: [],
    dateRange: { type: 'all' },
    searchText: ''
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
    
    // Load filters from URL params
    const filtersParam = urlParams.get('filters');
    if (filtersParam) {
      try {
        // Check if we have any filter params in the URL
        const hasFilterParams = 
          urlParams.get('subjects') ||
          urlParams.get('topics') ||
          urlParams.get('levels') ||
          urlParams.get('schoolYears') ||
          urlParams.get('keywords') ||
          urlParams.get('dateRangeType') ||
          urlParams.get('searchText');
        
        if (hasFilterParams) {
          // Filters are already in the URL as individual params
          const loadedFilters = deserializeFilters(urlParams);
          setFilters(loadedFilters);
        }
      } catch (e) {
        console.log('Could not parse filters from URL', e);
      }
    } else {
      // Check for individual filter params
      try {
        const loadedFilters = deserializeFilters(urlParams);
        if (loadedFilters.subjects.length > 0 || 
            loadedFilters.topics.length > 0 ||
            loadedFilters.levels.length > 0 ||
            loadedFilters.schoolYears.length > 0 ||
            loadedFilters.keywords.length > 0 ||
            loadedFilters.dateRange.type !== 'all' ||
            loadedFilters.searchText) {
          setFilters(loadedFilters);
        }
      } catch (e) {
        console.log('Could not parse filter params from URL', e);
      }
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
        } else if (data.students.length === 0 && data.message) {
          // Show helpful message when no students found
          setError(data.message);
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
    console.log('🔄 Loading student:', student.displayName, 'ID:', student.id);
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
        // Set a default overview so hero section still shows
        setStudentOverview({
          fileCount: 0,
          lastActivity: null,
          lastActivityDate: 'Onbekend',
          lastFile: undefined
        });
      }
      
      // Hide main loading and show hero section immediately after overview attempt
      setLoading(false);

      // Show cache loading for files while hero is already visible
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
          console.log('📁 Student has no files yet (empty folder)');
          // Don't set an error - empty folders are a valid state
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
      setLoading(false);
      setCacheLoading(false);
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

  // Filter and sort functions
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

  // Compute filter items with counts
  const subjectItems = useMemo(() => {
    const items = extractUniqueValues(files, 'subject');
    const counts = getFilterCounts(files, 'subject', filters);
    return items.map(item => ({
      value: item.value,
      label: item.label,
      count: counts.get(item.value) || 0
    }));
  }, [files, filters]);

  const topicItems = useMemo(() => {
    const items = extractUniqueValues(files, 'topic');
    const counts = getFilterCounts(files, 'topic', filters);
    return items.map(item => ({
      value: item.value,
      label: item.label,
      count: counts.get(item.value) || 0
    }));
  }, [files, filters]);

  const levelItems = useMemo(() => {
    const items = extractUniqueValues(files, 'level');
    const counts = getFilterCounts(files, 'level', filters);
    return items.map(item => ({
      value: item.value,
      label: item.label,
      count: counts.get(item.value) || 0
    }));
  }, [files, filters]);

  const schoolYearItems = useMemo(() => {
    const items = extractUniqueValues(files, 'schoolYear');
    const counts = getFilterCounts(files, 'schoolYear', filters);
    return items.map(item => ({
      value: item.value,
      label: item.label,
      count: counts.get(item.value) || 0
    }));
  }, [files, filters]);

  const keywordItems = useMemo(() => {
    const items = extractUniqueValues(files, 'keywords');
    const counts = getFilterCounts(files, 'keywords', filters);
    return items.map(item => ({
      value: item.value,
      label: item.label,
      count: counts.get(item.value) || 0
    }));
  }, [files, filters]);

  // Apply filters and sort
  const filteredAndSortedFiles = useMemo(() => {
    const filtered = applyFilters(files, filters);
    
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
  }, [files, filters, sortBy, sortOrder]);

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    // Update URL with filters - we need to merge the serialized filters into the current URL
    try {
      const baseParams = new URLSearchParams(window.location.search);
      const filterParams = serializeFilters(newFilters);
      
      // Clear old filter params
      baseParams.delete('subjects');
      baseParams.delete('topics');
      baseParams.delete('levels');
      baseParams.delete('schoolYears');
      baseParams.delete('keywords');
      baseParams.delete('dateRangeType');
      baseParams.delete('dateRangeValue');
      baseParams.delete('searchText');
      
      // Add new filter params
      filterParams.forEach((value, key) => {
        baseParams.set(key, value);
      });
      
      window.history.replaceState({}, '', `?${baseParams.toString()}`);
    } catch (e) {
      console.error('Error updating URL with filters', e);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      subjects: [],
      topics: [],
      levels: [],
      schoolYears: [],
      keywords: [],
      dateRange: { type: 'all' },
      searchText: ''
    });
  };

  const handleRemovePill = (pillId: string) => {
    const [filterType, value] = pillId.split(':');
    
    switch (filterType) {
      case 'subject':
        setFilters(prev => ({
          ...prev,
          subjects: prev.subjects.filter(s => s !== value)
        }));
        break;
      case 'topic':
        setFilters(prev => ({
          ...prev,
          topics: prev.topics.filter(t => t !== value)
        }));
        break;
      case 'level':
        setFilters(prev => ({
          ...prev,
          levels: prev.levels.filter(l => l !== value)
        }));
        break;
      case 'schoolYear':
        setFilters(prev => ({
          ...prev,
          schoolYears: prev.schoolYears.filter(sy => sy !== value)
        }));
        break;
      case 'keyword':
        setFilters(prev => ({
          ...prev,
          keywords: prev.keywords.filter(k => k !== value)
        }));
        break;
      case 'dateRange':
        setFilters(prev => ({
          ...prev,
          dateRange: { type: 'all' }
        }));
        break;
    }
  };

  // Build filter pills
  const filterPills = useMemo(() => {
    const pills = [];
    
    filters.subjects.forEach(subject => {
      pills.push({ id: `subject:${subject}`, label: `Vak: ${subject}` });
    });
    
    filters.topics.forEach(topic => {
      pills.push({ id: `topic:${topic}`, label: `Onderwerp: ${topic}` });
    });
    
    filters.levels.forEach(level => {
      pills.push({ id: `level:${level}`, label: `Niveau: ${level}` });
    });
    
    filters.schoolYears.forEach(year => {
      pills.push({ id: `schoolYear:${year}`, label: `Schooljaar: ${year}` });
    });
    
    filters.keywords.forEach(keyword => {
      pills.push({ id: `keyword:${keyword}`, label: `Trefwoord: ${keyword}` });
    });
    
    if (filters.dateRange.type !== 'all') {
      let dateLabel = 'Datum: ';
      switch (filters.dateRange.type) {
        case 'days':
          dateLabel += `Laatste ${filters.dateRange.value} dagen`;
          break;
        case 'weeks':
          dateLabel += `Laatste ${filters.dateRange.value} weken`;
          break;
        case 'months':
          dateLabel += `Laatste ${filters.dateRange.value} maanden`;
          break;
        case 'years':
          dateLabel += `Laatste ${filters.dateRange.value} jaar`;
          break;
        case 'custom':
          dateLabel += 'Aangepast bereik';
          break;
      }
      pills.push({ id: 'dateRange:all', label: dateLabel });
    }
    
    return pills;
  }, [filters]);

  return (
    <div className="min-h-screen bg-yellow-300 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        {!selectedStudent ? (
          /* Search Interface */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border-4 border-blue-900 dark:border-yellow-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-blue-900 dark:text-yellow-300">Zoek je aantekeningen</h2>
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
                  className="px-6 py-3 bg-blue-900 text-yellow-300 font-bold rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
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
                    Druk op Enter of klik op &quot;Zoeken&quot; om te zoeken
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6" role="alert" aria-live="assertive">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {students.length > 0 && (
                <section className="space-y-3" role="region" aria-labelledby="results-heading">
                  <h3 id="results-heading" className="font-medium text-gray-700">
                    {students.length} {students.length === 1 ? 'student gevonden' : 'studenten gevonden'}
                  </h3>
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="p-4 border-2 border-blue-900 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 dark:hover:bg-opacity-10 transition-colors bg-white dark:bg-slate-800"
                    >
                      <div className="flex items-center justify-between">
                        <div 
                          onClick={() => handleStudentSelect(student)}
                          className="flex-1 cursor-pointer"
                        >
                          <h4 className="font-bold text-lg text-blue-900 dark:text-yellow-300">{student.displayName}</h4>
                          <p className="text-blue-700 dark:text-yellow-200">{student.subject}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareStudent(student);
                            }}
                            className="p-2 text-blue-900 hover:text-yellow-500 transition-colors hover:bg-yellow-100 dark:hover:bg-blue-900 rounded-full"
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
                </section>
              )}

              {students.length === 0 && !loading && hasSearched && searchQuery && (
                <div className="text-center py-8" role="status" aria-live="polite">
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
                    <h2 className="text-2xl font-bold">{selectedStudent.displayName}</h2>
                    <p className="text-gray-600">{selectedStudent.subject}</p>
                    {studentOverview && (
                      <div className="mt-2">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {studentOverview.fileCount} bestanden
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Laatste activiteit: {studentOverview.lastActivityDate}
                          </span>
                        </div>
                        
                        {/* Laatste aantekening details */}
                        {studentOverview.lastFile && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium text-blue-900 text-sm">
                                  Laatste aantekening
                                </h3>
                                <p className="text-blue-800 font-medium text-sm mt-1">
                                  {studentOverview.lastFile.title}
                                </p>
                                {studentOverview.lastFile.subject && studentOverview.lastFile.topic && (
                                  <p className="text-blue-700 text-xs mt-1">
                                    {studentOverview.lastFile.subject} • {studentOverview.lastFile.topic}
                                  </p>
                                )}
                                {studentOverview.lastFile.summary && (
                                  <p className="text-blue-600 text-xs mt-2 line-clamp-2">
                                    {studentOverview.lastFile.summary}
                                  </p>
                                )}
                              </div>
                              <div className="ml-3">
                                <FileText className="w-5 h-5 text-blue-600" />
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
              <div className="space-y-4 mb-6">
                {/* Filter Button and Pills */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-colors font-medium"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    {getActiveFilterCount(filters) > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center w-6 h-6 bg-yellow-300 text-navy-900 rounded-full text-xs font-bold">
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

                {/* Sort Options */}
                <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-4 rounded-lg">
                  <label className="text-sm font-medium text-gray-700">Sorteer:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'subject' | 'topic')}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-900"
                  >
                    <option value="date">Datum</option>
                    <option value="name">Naam</option>
                    <option value="subject">Vak</option>
                    <option value="topic">Onderwerp</option>
                  </select>

                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-900"
                  >
                    <option value="desc">Nieuwste eerst</option>
                    <option value="asc">Oudste eerst</option>
                  </select>

                  <span className="text-sm text-gray-600 ml-auto">
                    {filteredAndSortedFiles.length} van {files.length} bestanden
                  </span>
                </div>
              </div>
            )}

            {/* Filter Modal */}
            <FilterModal
              isOpen={isFilterModalOpen}
              onClose={() => setIsFilterModalOpen(false)}
              onApply={handleApplyFilters}
              onClear={handleClearFilters}
              currentFilters={filters}
            >
              {/* Subject Filter Section */}
              <FilterSection
                title="Vakken"
                items={subjectItems}
                selectedValues={filters.subjects}
                onSelectionChange={(values) => setFilters(prev => ({ ...prev, subjects: values }))}
                defaultExpanded={true}
              />

              {/* Topic Filter Section */}
              <FilterSection
                title="Onderwerpen"
                items={topicItems}
                selectedValues={filters.topics}
                onSelectionChange={(values) => setFilters(prev => ({ ...prev, topics: values }))}
              />

              {/* Level Filter Section */}
              <FilterSection
                title="Niveaus"
                items={levelItems}
                selectedValues={filters.levels}
                onSelectionChange={(values) => setFilters(prev => ({ ...prev, levels: values }))}
              />

              {/* School Year Filter Section */}
              <FilterSection
                title="Schooljaren"
                items={schoolYearItems}
                selectedValues={filters.schoolYears}
                onSelectionChange={(values) => setFilters(prev => ({ ...prev, schoolYears: values }))}
              />

              {/* Keywords Filter Section */}
              <FilterSection
                title="Trefwoorden"
                items={keywordItems}
                selectedValues={filters.keywords}
                onSelectionChange={(values) => setFilters(prev => ({ ...prev, keywords: values }))}
              />

              {/* Date Range Filter */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-3">Datumbereik</h3>
                <DateRangeFilter
                  value={filters.dateRange}
                  onChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
                />
              </div>

              {/* Search Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zoeken</label>
                <input
                  type="text"
                  placeholder="Zoek op naam, titel, onderwerp..."
                  value={filters.searchText}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </FilterModal>

            {loading ? (
              <div className="flex items-center justify-center py-12" role="status" aria-live="polite" aria-label="Loading files">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Bestanden laden...</span>
              </div>
            ) : files.length > 0 ? (
              /* Files Display */
              <section className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'} role="list" aria-label="Student files">
                {filteredAndSortedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
                      viewMode === 'list' ? 'flex items-center p-4' : 'p-4'
                    }`}
                  >
                    {viewMode === 'grid' ? (
                      <div>
                        <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative group cursor-pointer" onClick={() => window.open(file.viewUrl as string, '_blank')}>
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
                          <span>{formatFileSize(file.size ?? 0)}</span>
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
                            aria-label={`Download ${file.name}`}
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
                              <span>{formatFileSize(file.size ?? 0)}</span>
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
                            aria-label={`Download ${file.name}`}
                          >
                            <Download className="h-4 w-4 inline mr-2" />
                            Downloaden
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </section>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Geen bestanden gevonden</p>
                <p className="text-gray-500 text-sm mt-2 mb-4">
                  Er zijn momenteel geen aantekeningen beschikbaar voor {selectedStudent.displayName}.
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