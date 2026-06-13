import { useState } from 'react';
import type { MainPageStudent } from '@/lib/interfaces';

export function useStudentSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<MainPageStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (query: string = searchQuery): Promise<void> => {
    // handleSearch is sometimes wired straight onto an event (onClick/onSubmit),
    // which passes the event object instead of a string. Fall back to the
    // current query so `.trim()` never throws "query.trim is not a function".
    const q = typeof query === 'string' ? query : searchQuery;
    if (!q.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setStudents([]);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/students/search?q=${encodeURIComponent(q)}`);
      const data = await response.json();

      if (data.success) {
        setStudents(data.students);
        if (data.students.length === 0 && data.message) {
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

  const resetSearch = () => {
    setSearchQuery('');
    setStudents([]);
    setError(null);
    setHasSearched(false);
  };

  return {
    searchQuery,
    setSearchQuery,
    students,
    loading,
    error,
    hasSearched,
    handleSearch,
    resetSearch,
  };
}

