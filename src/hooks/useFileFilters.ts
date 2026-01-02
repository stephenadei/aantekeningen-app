import { useMemo } from 'react';
import { applyFilters } from '@/lib/filterUtils';
import { getFileDate } from '@/lib/date-extractor';
import type { FileInfo, FilterState } from '@/lib/interfaces';

export function useFileFilters(files: FileInfo[], filters: FilterState, sortBy: 'date' | 'name' | 'subject' | 'topic', sortOrder: 'asc' | 'desc') {
  const filteredAndSortedFiles = useMemo(() => {
    const filtered = applyFilters(files, filters);
    
    // Sort files
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'date':
          aValue = getFileDate(a).getTime();
          bValue = getFileDate(b).getTime();
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

  return { filteredAndSortedFiles };
}

