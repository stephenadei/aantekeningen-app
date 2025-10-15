'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Plus, Search, Filter, MoreVertical, Edit, Trash2, Key } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Student {
  id: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  pinUpdatedAt: string;
  notesCount: number;
  lastNoteDate: string | null;
}

interface StudentsResponse {
  success: boolean;
  students: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchStudents = async (page: number = 1, search: string = '') => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`/api/admin/students?${params}&_t=${Date.now()}`);
      const data: StudentsResponse = await response.json();

      if (data.success) {
        setStudents(data.students);
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.pages);
        setTotalStudents(data.pagination.total);
      } else {
        setError('Failed to fetch students');
      }
    } catch (err) {
      setError('Error loading students');
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchStudents(1, searchQuery);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchStudents(page, searchQuery);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Weet je zeker dat je student "${studentName}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the list
        fetchStudents(currentPage, searchQuery);
      } else {
        const errorData = await response.json();
        alert(`Fout bij verwijderen: ${errorData.error}`);
      }
    } catch (err) {
      alert('Er is een fout opgetreden bij het verwijderen van de student');
      console.error('Error deleting student:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Studenten</h1>
          <p className="mt-1 text-sm text-gray-500">
            Beheer alle studenten en hun toegangscodes
          </p>
        </div>
        <Link href="/admin/students/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Student
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Zoek op naam..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4 mr-2" />
            Zoeken
          </Button>
        </form>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>
          {totalStudents} {totalStudents === 1 ? 'student' : 'studenten'} gevonden
        </span>
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              fetchStudents(1, '');
            }}
            className="text-blue-600 hover:text-blue-500"
          >
            Wis zoekopdracht
          </button>
        )}
      </div>

      {/* Students List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Laden...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Button
              variant="secondary"
              className="mt-2"
              onClick={() => fetchStudents(currentPage, searchQuery)}
            >
              Opnieuw proberen
            </Button>
          </div>
        ) : students.length === 0 ? (
          <div className="p-6 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Geen studenten gevonden
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? 'Probeer een andere zoekterm.'
                : 'Voeg je eerste student toe om te beginnen.'}
            </p>
            {!searchQuery && (
              <Link href="/admin/students/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Eerste Student Toevoegen
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {students.map((student) => (
              <li key={student.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="flex items-center">
                          <Link
                            href={`/admin/students/${student.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-500 truncate"
                          >
                            {student.displayName}
                          </Link>
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                          <span>{student.notesCount} notities</span>
                          <span>
                            Aangemaakt: {formatDate(student.createdAt)}
                          </span>
                          {student.lastNoteDate && (
                            <span>
                              Laatste notitie: {formatDate(student.lastNoteDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link href={`/admin/students/${student.id}`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <button
                        onClick={() => handleDeleteStudent(student.id, student.displayName)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Verwijder student"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Pagina {currentPage} van {totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Vorige
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Volgende
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
