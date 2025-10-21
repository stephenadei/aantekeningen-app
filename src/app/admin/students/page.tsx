'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Filter, MoreHorizontal, Eye, Edit, Trash2, Link, Unlink } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import type { AdminStudentWithMetadata } from '@/lib/interfaces';

interface StudentsResponse {
  students: AdminStudentWithMetadata[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface FilterState {
  search: string;
  subject: string;
  active: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<AdminStudentWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    subject: '',
    active: ''
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const limit = 25;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search]);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filters.subject && { subject: filters.subject }),
        ...(filters.active && { active: filters.active })
      });

      const response = await fetch(`/api/admin/students?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }

      const data: StudentsResponse = await response.json();
      setStudents(data.students);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filters.subject, filters.active]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPage(1); // Reset to first page when searching
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filtering
  };

  const handleDelete = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete student "${studentName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete student');
      }

      // Refresh the list
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student. Please try again.');
    }
  };

  const handleAdoptStudent = async (studentId: string) => {
    const displayName = prompt('Enter the student\'s display name:');
    if (!displayName) return;

    const email = prompt('Enter the student\'s email (optional):') || undefined;
    const pin = prompt('Enter a 6-digit PIN for the student:');
    if (!pin || pin.length !== 6) {
      alert('PIN must be exactly 6 digits');
      return;
    }

    const driveFolderId = prompt('Enter the Drive folder ID (optional):') || undefined;
    const subject = prompt('Enter the subject (optional):') || undefined;

    try {
      const response = await fetch('/api/admin/students/adopt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          displayName,
          email,
          pin,
          driveFolderId,
          subject
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to adopt student');
      }

      // Refresh the list
      fetchStudents();
      alert('Student successfully adopted!');
    } catch (error) {
      console.error('Error adopting student:', error);
      alert(`Failed to adopt student: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
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

  const activeOptions = [
    { value: '', label: 'All Students' },
    { value: 'true', label: 'Active Only' },
    { value: 'false', label: 'Inactive Only' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students Management</h1>
          <p className="text-gray-600 mt-1">
            Manage students, their Drive folders, and file access
          </p>
        </div>
        <Button
          onClick={() => router.push('/admin/students/new')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Input
              placeholder="Search students..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Select
              value={filters.subject}
              onChange={(e) => handleFilterChange('subject', e.target.value)}
              options={subjectOptions}
            />
          </div>
          <div>
            <Select
              value={filters.active}
              onChange={(e) => handleFilterChange('active', e.target.value)}
              options={activeOptions}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setFilters({ search: '', subject: '', active: '' });
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          Showing {students.length} of {total} students
        </p>
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader count={5} type="list-item" />
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.subject || filters.active
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first student'
              }
            </p>
            {!filters.search && !filters.subject && !filters.active && (
              <Button onClick={() => router.push('/admin/students/new')}>
                Add Student
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Drive Folder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Files
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {student.displayName}
                          {student.displayName.startsWith('Unknown Student') && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Orphaned
                            </span>
                          )}
                        </div>
                        {student.email && (
                          <div className="text-sm text-gray-500">{student.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.subject ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSubjectColor(student.subject)}`}>
                          {student.subject}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">No subject</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {student.driveFolderId ? (
                          <>
                            <Link className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-gray-900">Linked</span>
                          </>
                        ) : (
                          <>
                            <Unlink className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">Not linked</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {student.fileCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatLastActivity(student.lastActivity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {student.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {student.displayName.startsWith('Unknown Student') ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAdoptStudent(student.id)}
                            title="Adopt Student"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Adopt
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/admin/students/${student.id}`)}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/admin/students/${student.id}/edit`)}
                              title="Edit Student"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(student.id, student.displayName)}
                              title="Delete Student"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
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
