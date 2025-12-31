"use client";

import { useState, useEffect, useMemo } from 'react';
import { Search, FileText, Calendar, User, ArrowLeft, Loader2, Share2, Download, Filter, GraduationCap } from 'lucide-react';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import { useNativeShare } from '@/hooks/useNativeShare';
import Sidebar from '@/components/ui/Sidebar';
import FilterSidebarContent from '@/components/ui/FilterSidebarContent';
import FilterPills from '@/components/ui/FilterPill';
import Thumbnail from '@/components/ui/Thumbnail';
import { FileCardSkeleton, FileListSkeleton } from '@/components/ui/Skeleton';
import FileDetailModal from '@/components/ui/FileDetailModal';
import { 
  applyFilters, 
  extractUniqueValues, 
  getFilterCounts, 
  getActiveFilterCount,
  serializeFilters,
  deserializeFilters
} from '@/lib/filterUtils';
import type { FilterState, FileInfo, MainPageStudent, MainPageStudentOverview } from '@/lib/interfaces';


export default function AantekeningenPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<MainPageStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<MainPageStudent | null>(null);
  const [studentOverview, setStudentOverview] = useState<MainPageStudentOverview | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Native share functionality
  const { isSupported: isNativeShareSupported, share: nativeShare, isSharing } = useNativeShare();
  
  // New advanced filter states
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    subjects: [],
    topicGroups: [],
    topics: [],
    levels: [],
    schoolYears: [],
    keywords: [],
    dateRange: { type: 'all' },
    sortBy: 'date',
    sortOrder: 'desc',
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
  }, []);

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

  const handleStudentSelect = async (student: MainPageStudent) => {
    console.log('🔄 Loading student:', student.displayName, 'ID:', student.id);
    setSelectedStudent(student);
    setLoading(true);
    setCacheLoading(false);
    setError(null);
    setFiles([]); // Clear previous files

    try {
      console.log('📊 Fetching overview for student:', student.id);
      // Get overview first
      const apiUrl = `/api/students/overview/${student.id}`;
      const overviewResponse = await fetch(apiUrl);
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
      const filesApiUrl = `/api/students/files/${student.id}`;
      const filesResponse = await fetch(filesApiUrl);
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
          // Check if student has notes indicator
          if (selectedStudent && !selectedStudent.hasNotes) {
            console.log('ℹ️ Student has no notes (expected)');
            setError(null); // Don't show error if student has no notes (they might only have appointments)
            setCacheLoading(false);
        } else {
          // Check if student has notes indicator
          if (selectedStudent && !selectedStudent.hasNotes) {
            console.log('ℹ️ Student has no notes (expected)');
            setError(null); // Don't show error if student has no notes (they might only have appointments)
            setCacheLoading(false);
          } else {
            console.log('❌ Student has no files - this should not happen if student was found');
            setError('Er zijn geen aantekeningen gevonden voor deze student. Dit kan een tijdelijk probleem zijn.');
            setCacheLoading(false);
          }
        }
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
      const errorMessage = err instanceof Error 
        ? `Er is een fout opgetreden: ${err.message}` 
        : 'Er is een fout opgetreden bij het laden van studentgegevens';
      setError(errorMessage);
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

  const topicGroupItems = useMemo(() => {
    const items = extractUniqueValues(files, 'topicGroup');
    const counts = getFilterCounts(files, 'topicGroup', filters);
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
      topicGroups: [],
      topics: [],
      levels: [],
      schoolYears: [],
      keywords: [],
      dateRange: { type: 'all' },
      sortBy: 'date',
      sortOrder: 'desc',
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
      case 'topicGroup':
        setFilters(prev => ({
          ...prev,
          topicGroups: prev.topicGroups.filter(tg => tg !== value)
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
    
    filters.topicGroups.forEach(topicGroup => {
      pills.push({ id: `topicGroup:${topicGroup}`, label: `Domein: ${topicGroup}` });
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
      <div className="container mx-auto px-4 py-8">
        {!selectedStudent ? (
          /* Search Interface */
          <div className="max-w-2xl mx-auto">
            <div className="bg-blue-800/90 backdrop-blur-xl rounded-lg shadow-md p-6 border-4 border-blue-700/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <GraduationCap className="h-8 w-8 text-yellow-300" />
                  <h2 className="text-2xl font-bold text-yellow-100">Zoek je aantekeningen</h2>
                </div>
                <DarkModeToggle />
              </div>
              
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Typ je naam om je aantekeningen te vinden..."
                    className="w-full pl-10 pr-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-yellow-100 text-blue-900 placeholder-blue-600"
                  />
                </div>
                <button
                  onClick={() => handleSearch()}
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
                  <p className="text-sm text-yellow-200">
                    Druk op Enter of klik op &quot;Zoeken&quot; om te zoeken
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6" role="alert" aria-live="assertive">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {students.length > 0 && (
                <section className="space-y-3" role="region" aria-labelledby="results-heading">
                  <h3 id="results-heading" className="font-medium text-yellow-200">
                    {students.length} {students.length === 1 ? 'student gevonden' : 'studenten gevonden'}
                  </h3>
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="p-4 border-2 border-yellow-300 rounded-lg hover:bg-yellow-100/20 transition-colors bg-blue-800/90 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div 
                          onClick={() => handleStudentSelect(student)}
                          className="flex-1 cursor-pointer"
                        >
                          <h4 className="font-bold text-lg text-yellow-100">{student.displayName}</h4>
                          <p className="text-yellow-200">{student.subject}</p>
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
                              handleShareStudent(student);
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
                  <p className="text-yellow-200 mb-2">Geen studenten gevonden</p>
                  <p className="text-sm text-yellow-300 mb-4">
                    Probeer een andere naam of controleer de spelling.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStudents([]);
                      setError(null);
                      setHasSearched(false);
                    }}
                    className="text-yellow-300 hover:text-yellow-100 text-sm underline"
                  >
                    Opnieuw zoeken
                  </button>
                </div>
              )}
            </div>

            {/* Privacy Notice */}
            <div className="mt-6 bg-blue-800/90 backdrop-blur-xl border border-blue-700/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-yellow-300 text-xl">🔒</div>
                <div>
                  <h4 className="font-medium text-yellow-100 mb-1">Privacy</h4>
                  <p className="text-yellow-200 text-sm">
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
            <div className="bg-blue-800/90 backdrop-blur-xl rounded-lg shadow-md p-6 mb-6 border border-blue-700/20">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handleBackToSearch}
                  className="flex items-center gap-2 text-yellow-300 hover:text-yellow-100 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Terug naar zoeken
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 rounded text-sm ${
                      viewMode === 'list' 
                        ? 'bg-yellow-500 text-blue-900' 
                        : 'bg-yellow-100 text-blue-900 hover:bg-yellow-200'
                    }`}
                  >
                    Lijst
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1 rounded text-sm ${
                      viewMode === 'grid' 
                        ? 'bg-yellow-500 text-blue-900' 
                        : 'bg-yellow-100 text-blue-900 hover:bg-yellow-200'
                    }`}
                  >
                    Grid
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-blue-900" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-yellow-100">{selectedStudent.displayName}</h2>
                    <p className="text-yellow-200">{selectedStudent.subject}</p>
                    {studentOverview && (
                      <div className="mt-2">
                        <div className="flex items-center gap-4 text-sm text-yellow-300">
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
                          <div className="mt-3 p-3 bg-yellow-100/20 rounded-lg border border-yellow-300/30">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium text-yellow-100 text-sm">
                                  Laatste aantekening
                                </h3>
                                <p className="text-yellow-200 font-medium text-sm mt-1">
                                  {studentOverview.lastFile.title}
                                </p>
                                {studentOverview.lastFile.subject && studentOverview.lastFile.topic && (
                                  <p className="text-yellow-300 text-xs mt-1">
                                    {studentOverview.lastFile.subject} • {studentOverview.lastFile.topic}
                                  </p>
                                )}
                                {studentOverview.lastFile.summary && (
                                  <p className="text-yellow-200 text-xs mt-2 line-clamp-2">
                                    {studentOverview.lastFile.summary}
                                  </p>
                                )}
                              </div>
                              <div className="ml-3">
                                <FileText className="w-5 h-5 text-yellow-300" />
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
                    onClick={() => setIsFilterSidebarOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-yellow-100 rounded-lg hover:bg-blue-800 transition-colors font-medium"
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

                {/* File Count */}
                <div className="flex justify-between items-center bg-blue-800/90 backdrop-blur-sm p-4 rounded-lg border border-blue-700/20">
                  <span className="text-sm text-yellow-200">
                    {filteredAndSortedFiles.length} van {files.length} bestanden
                  </span>
                  <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'subject' | 'topic')}
                      className="px-3 py-1 text-sm border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-yellow-100 text-blue-900"
                  >
                    <option value="date">Datum</option>
                    <option value="name">Naam</option>
                    <option value="subject">Vak</option>
                    <option value="topic">Onderwerp</option>
                  </select>

                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                      className="px-3 py-1 text-sm border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-yellow-100 text-blue-900"
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
              /* Files Display */
              <section className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'} role="list" aria-label="Student files">
                {filteredAndSortedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`
                      group relative
                      bg-gradient-to-br from-blue-800/95 via-blue-900/90 to-indigo-900/95 
                      backdrop-blur-sm rounded-xl shadow-lg overflow-hidden
                      border border-blue-700/50 dark:border-blue-600/30
                      transition-all duration-300 ease-out
                      hover:shadow-2xl hover:scale-[1.02] hover:border-blue-500/70
                      ${viewMode === 'list' ? 'flex items-center p-4' : ''}
                    `}
                  >
                    {viewMode === 'grid' ? (
                      <div className="p-5">
                        <div className="relative mb-4 rounded-lg overflow-hidden">
                          <Thumbnail
                            src={file.thumbnailUrl} 
                            alt={file.title}
                            fileId={file.id}
                            fileType={file.mimeType}
                            className="rounded-lg cursor-pointer"
                            onClick={() => {
                              setSelectedFile(file);
                              setIsModalOpen(true);
                            }}
                          />
                        </div>
                        <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2 text-yellow-50 group-hover:text-yellow-100 transition-colors">
                          {file.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-yellow-200/60 mb-2 sm:mb-3 font-mono truncate">{file.name}</p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-yellow-300/70 mb-3 sm:mb-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span className="hidden sm:inline">{formatDate(file.modifiedTime)}</span>
                            <span className="sm:hidden">{formatDate(file.modifiedTime).slice(0, 5)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {formatFileSize(file.size ?? 0)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-3 sm:mb-4">
                          {file.subject && (
                            <span className="bg-yellow-100/90 text-blue-900 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium shadow-sm">
                              {file.subject}
                            </span>
                          )}
                          {file.topic && (
                            <span className="bg-yellow-200/90 text-blue-900 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium shadow-sm">
                              {file.topic}
                            </span>
                          )}
                          {file.level && (
                            <span className="bg-yellow-300/90 text-blue-900 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium shadow-sm">
                              {file.level}
                            </span>
                          )}
                          {file.schoolYear && (
                            <span className="bg-yellow-400/90 text-blue-900 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium shadow-sm">
                              {file.schoolYear}
                            </span>
                          )}
                        </div>
                        {file.keywords && file.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {file.keywords.slice(0, 3).map((keyword, index) => (
                              <span key={index} className="bg-yellow-100/70 text-blue-900 px-2 py-0.5 rounded-md text-xs">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                        {file.summary && (
                          <p className="text-[10px] sm:text-xs text-yellow-200/90 bg-yellow-100/10 backdrop-blur-sm p-2 sm:p-3 rounded-lg mb-3 sm:mb-4 line-clamp-2 border border-yellow-200/20">
                            {file.summary}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <a
                            href={file.downloadUrl}
                            className="flex-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-blue-900 text-center py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                            aria-label={`Download ${file.name}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Downloaden</span>
                            <span className="sm:hidden">Download</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div 
                            className="w-20 h-14 rounded-lg overflow-hidden relative group cursor-pointer flex-shrink-0" 
                            onClick={() => {
                              setSelectedFile(file);
                              setIsModalOpen(true);
                            }}
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
                            <h3 className="font-semibold text-base sm:text-lg text-yellow-50 line-clamp-2 group-hover:text-yellow-100 transition-colors">
                              {file.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-yellow-200/60 font-mono mt-1 truncate">{file.name}</p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-yellow-300/70 mt-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span className="hidden sm:inline">{formatDate(file.modifiedTime)}</span>
                                <span className="sm:hidden">{formatDate(file.modifiedTime).slice(0, 5)}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {formatFileSize(file.size ?? 0)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {file.subject && (
                                <span className="bg-yellow-100/90 text-blue-900 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">
                                  {file.subject}
                                </span>
                              )}
                              {file.topic && (
                                <span className="bg-yellow-200/90 text-blue-900 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">
                                  {file.topic}
                                </span>
                              )}
                              {file.level && (
                                <span className="bg-yellow-300/90 text-blue-900 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">
                                  {file.level}
                                </span>
                              )}
                              {file.schoolYear && (
                                <span className="bg-yellow-400/90 text-blue-900 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">
                                  {file.schoolYear}
                                </span>
                              )}
                            </div>
                            {file.keywords && file.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {file.keywords.slice(0, 4).map((keyword, index) => (
                                  <span key={index} className="bg-yellow-100/70 text-blue-900 px-2 py-0.5 rounded-md text-xs">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                            {file.summary && (
                              <p className="text-xs text-yellow-200/90 bg-yellow-100/10 backdrop-blur-sm p-2 rounded-lg mt-2 max-w-md line-clamp-2 border border-yellow-200/20">
                                {file.summary}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <a
                            href={file.downloadUrl}
                            className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-blue-900 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-1.5 sm:gap-2"
                            aria-label={`Download ${file.name}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Downloaden</span>
                            <span className="sm:hidden">DL</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </section>
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