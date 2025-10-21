'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Filter, MoreHorizontal, Eye, Edit, Trash2, RefreshCw, CheckSquare, Square, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import type { AdminNoteWithMetadata } from '@/lib/interfaces';

interface NotesResponse {
  notes: AdminNoteWithMetadata[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  appliedFilters: Record<string, string>;
}

interface FilterState {
  search: string;
  subject: string;
  topicGroup: string;
  topic: string;
  level: string;
  schoolYear: string;
  dateFrom: string;
  dateTo: string;
  aiAnalyzed: string;
  studentId: string;
}

interface BulkAction {
  type: 'reanalyze' | 'delete' | 'updateMetadata';
  label: string;
  icon: React.ReactNode;
  variant: 'primary' | 'secondary' | 'danger';
}

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<AdminNoteWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    subject: '',
    topicGroup: '',
    topic: '',
    level: '',
    schoolYear: '',
    dateFrom: '',
    dateTo: '',
    aiAnalyzed: '',
    studentId: ''
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const limit = 50;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search]);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filters.subject && { subject: filters.subject }),
        ...(filters.topicGroup && { topicGroup: filters.topicGroup }),
        ...(filters.topic && { topic: filters.topic }),
        ...(filters.level && { level: filters.level }),
        ...(filters.schoolYear && { schoolYear: filters.schoolYear }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.aiAnalyzed && { aiAnalyzed: filters.aiAnalyzed }),
        ...(filters.studentId && { studentId: filters.studentId })
      });

      const response = await fetch(`/api/admin/notes?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }

      const data: NotesResponse = await response.json();
      setNotes(data.notes);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filters]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPage(1);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSelectAll = () => {
    if (selectedNotes.size === notes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(notes.map(note => note.id)));
    }
  };

  const handleSelectNote = (noteId: string) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId);
    } else {
      newSelected.add(noteId);
    }
    setSelectedNotes(newSelected);
  };

  const handleBulkAction = async (action: BulkAction['type']) => {
    if (selectedNotes.size === 0) return;

    const confirmMessage = {
      reanalyze: `Re-analyze ${selectedNotes.size} notes with AI?`,
      delete: `Delete ${selectedNotes.size} notes? This action cannot be undone.`,
      updateMetadata: `Update metadata for ${selectedNotes.size} notes?`
    };

    if (!confirm(confirmMessage[action])) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const payload = {
        action,
        noteIds: Array.from(selectedNotes),
        ...(action === 'updateMetadata' && { metadata: {} }) // Could be expanded with specific metadata
      };

      const response = await fetch('/api/admin/notes/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to perform bulk action');
      }

      const result = await response.json();
      
      if (result.success) {
        setSelectedNotes(new Set());
        fetchNotes(); // Refresh the list
        alert(`Successfully processed ${result.processed} notes`);
      } else {
        alert(`Processed ${result.processed} notes with ${result.errors} errors`);
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert('Failed to perform bulk action. Please try again.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleDelete = async (noteId: string, noteTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${noteTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/notes/${noteId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSubjectColor = (subject?: string) => {
    const colors: Record<string, string> = {
      'wiskunde-a': 'bg-blue-100 text-blue-800',
      'wiskunde-b': 'bg-blue-100 text-blue-800',
      'natuurkunde': 'bg-green-100 text-green-800',
      'scheikunde': 'bg-purple-100 text-purple-800',
      'biologie': 'bg-emerald-100 text-emerald-800',
      'nederlands': 'bg-red-100 text-red-800',
      'engels': 'bg-yellow-100 text-yellow-800'
    };
    return colors[subject || ''] || 'bg-gray-100 text-gray-800';
  };

  const bulkActions: BulkAction[] = [
    {
      type: 'reanalyze',
      label: 'Re-analyze',
      icon: <RefreshCw className="w-4 h-4" />,
      variant: 'secondary'
    },
    {
      type: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'danger'
    }
  ];

  const subjectOptions = [
    { value: '', label: 'All Subjects' },
    { value: 'wiskunde-a', label: 'Wiskunde A' },
    { value: 'wiskunde-b', label: 'Wiskunde B' },
    { value: 'natuurkunde', label: 'Natuurkunde' },
    { value: 'scheikunde', label: 'Scheikunde' },
    { value: 'biologie', label: 'Biologie' },
    { value: 'nederlands', label: 'Nederlands' },
    { value: 'engels', label: 'Engels' }
  ];

  const aiAnalyzedOptions = [
    { value: '', label: 'All Notes' },
    { value: 'true', label: 'AI Analyzed' },
    { value: 'false', label: 'Not Analyzed' }
  ];

  const schoolYearOptions = [
    { value: '', label: 'All Years' },
    { value: '2023-2024', label: '2023-2024' },
    { value: '2024-2025', label: '2024-2025' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notes Management</h1>
          <p className="text-gray-600 mt-1">
            Manage notes, AI analysis, and metadata
          </p>
        </div>
        <Button
          onClick={() => router.push('/admin/notes/new')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Upload Note
        </Button>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedNotes.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedNotes.size} note{selectedNotes.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                {bulkActions.map((action) => (
                  <Button
                    key={action.type}
                    variant={action.variant}
                    size="sm"
                    onClick={() => handleBulkAction(action.type)}
                    disabled={bulkActionLoading}
                    className="flex items-center gap-2"
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedNotes(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search notes by title, keywords, or summary..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <Select
                value={filters.subject}
                onChange={(e) => handleFilterChange('subject', e.target.value)}
                options={subjectOptions}
              />
            </div>
            <div>
              <Select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                options={[
                  { value: '', label: 'All Levels' },
                  { value: 'havo-4', label: 'HAVO 4' },
                  { value: 'havo-5', label: 'HAVO 5' },
                  { value: 'vwo-4', label: 'VWO 4' },
                  { value: 'vwo-5', label: 'VWO 5' },
                  { value: 'vwo-6', label: 'VWO 6' }
                ]}
              />
            </div>
            <div>
              <Select
                value={filters.schoolYear}
                onChange={(e) => handleFilterChange('schoolYear', e.target.value)}
                options={schoolYearOptions}
              />
            </div>
            <div>
              <Select
                value={filters.aiAnalyzed}
                onChange={(e) => handleFilterChange('aiAnalyzed', e.target.value)}
                options={aiAnalyzedOptions}
              />
            </div>
            <div>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                placeholder="From date"
              />
            </div>
            <div>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                placeholder="To date"
              />
            </div>
            <div className="md:col-span-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setFilters({
                    search: '',
                    subject: '',
                    topicGroup: '',
                    topic: '',
                    level: '',
                    schoolYear: '',
                    dateFrom: '',
                    dateTo: '',
                    aiAnalyzed: '',
                    studentId: ''
                  });
                  setPage(1);
                }}
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          Showing {notes.length} of {total} notes
        </p>
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
      </div>

      {/* Notes Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader count={5} type="list-item" />
          </div>
        ) : notes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notes found</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || Object.values(filters).some(f => f)
                ? 'Try adjusting your search or filters'
                : 'Get started by uploading your first note'
              }
            </p>
            {!filters.search && !Object.values(filters).some(f => f) && (
              <Button onClick={() => router.push('/admin/notes/new')}>
                Upload Note
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center"
                    >
                      {selectedNotes.size === notes.length ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Topic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notes.map((note) => (
                  <tr key={note.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleSelectNote(note.id)}
                        className="flex items-center"
                      >
                        {selectedNotes.has(note.id) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <div className="text-sm font-medium text-gray-900 truncate" title={note.title}>
                          {note.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate" title={note.name}>
                          {note.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {note.student.displayName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {note.subject ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSubjectColor(note.subject)}`}>
                          {note.subject}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">No subject</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 max-w-32 truncate" title={note.topic}>
                        {note.topic || 'No topic'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {note.level ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {note.level}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">No level</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(note.modifiedTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {note.aiAnalyzedAt ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Analyzed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/notes/${note.id}`)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/notes/${note.id}/edit`)}
                          title="Edit Note"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(note.id, note.title)}
                          title="Delete Note"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Page {page} of {Math.ceil(total / limit)}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage(prev => prev + 1)}
              disabled={!hasMore}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
