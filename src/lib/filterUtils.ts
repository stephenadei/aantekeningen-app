import { 
  DriveFileId,
  FileName,
  CleanFileName,
  DriveUrl,
  DownloadUrl,
  ThumbnailUrl,
  ViewUrl,
  Subject,
  Topic,
  Level,
  SchoolYear
} from './types';

export interface FileInfo {
  id: DriveFileId;
  name: FileName;
  title: CleanFileName;
  url?: DriveUrl;
  downloadUrl?: DownloadUrl;
  thumbnailUrl?: ThumbnailUrl;
  viewUrl?: ViewUrl;
  modifiedTime: string;
  size?: number;
  subject?: Subject;
  topic?: Topic;
  level?: Level;
  schoolYear?: SchoolYear;
  keywords?: string[];
  summary?: string;
  summaryEn?: string;
  topicEn?: string;
  keywordsEn?: string[];
}

export interface FilterState {
  subjects: string[];
  topics: string[];
  levels: string[];
  schoolYears: string[];
  keywords: string[];
  dateRange: {
    type: 'all' | 'days' | 'weeks' | 'months' | 'years' | 'custom';
    value?: number;
    startDate?: Date;
    endDate?: Date;
  };
  searchText: string;
}

/**
 * Convert a date range type to actual start and end dates
 */
export function dateRangeToFilter(
  type: string,
  value?: number
): { start: Date; end: Date } | null {
  if (type === 'all') return null;

  const end = new Date();
  const start = new Date();

  switch (type) {
    case 'days':
      start.setDate(start.getDate() - (value || 1));
      break;
    case 'weeks':
      start.setDate(start.getDate() - (value || 1) * 7);
      break;
    case 'months':
      start.setMonth(start.getMonth() - (value || 1));
      break;
    case 'years':
      start.setFullYear(start.getFullYear() - (value || 1));
      break;
    default:
      return null;
  }

  return { start, end };
}

/**
 * Check if a file matches all active filters
 */
export function fileMatchesFilters(file: FileInfo, filters: FilterState): boolean {
  // Subject filter
  if (filters.subjects.length > 0 && !filters.subjects.includes(file.subject || '')) {
    return false;
  }

  // Topic filter
  if (filters.topics.length > 0 && !filters.topics.includes(file.topic || '')) {
    return false;
  }

  // Level filter
  if (filters.levels.length > 0 && !filters.levels.includes(file.level || '')) {
    return false;
  }

  // School year filter
  if (
    filters.schoolYears.length > 0 &&
    !filters.schoolYears.includes(file.schoolYear || '')
  ) {
    return false;
  }

  // Keywords filter
  if (filters.keywords.length > 0) {
    const fileKeywords = file.keywords || [];
    const hasKeyword = filters.keywords.some((keyword) =>
      fileKeywords.some((fk) =>
        fk.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    if (!hasKeyword) return false;
  }

  // Date range filter
  if (filters.dateRange.type !== 'all') {
    const dateRange = dateRangeToFilter(filters.dateRange.type, filters.dateRange.value);
    if (dateRange) {
      const fileDate = new Date(file.modifiedTime);
      if (fileDate < dateRange.start || fileDate > dateRange.end) {
        return false;
      }
    }
  }

  // Search text filter
  if (filters.searchText) {
    const searchLower = filters.searchText.toLowerCase();
    const matches =
      file.name.toLowerCase().includes(searchLower) ||
      file.title.toLowerCase().includes(searchLower) ||
      file.subject?.toLowerCase().includes(searchLower) ||
      file.topic?.toLowerCase().includes(searchLower) ||
      file.summary?.toLowerCase().includes(searchLower);
    if (!matches) return false;
  }

  return true;
}

/**
 * Apply filters to an array of files
 */
export function applyFilters(files: FileInfo[], filters: FilterState): FileInfo[] {
  return files.filter((file) => fileMatchesFilters(file, filters));
}

/**
 * Extract unique values from files for a specific field
 */
export function extractUniqueValues(
  files: FileInfo[],
  field: keyof FileInfo
): Array<{ value: string; label: string; count: number }> {
  const valueMap = new Map<string, number>();

  files.forEach((file) => {
    const value = file[field];

    if (Array.isArray(value)) {
      value.forEach((v) => {
        const str = String(v);
        valueMap.set(str, (valueMap.get(str) || 0) + 1);
      });
    } else if (value) {
      const str = String(value);
      valueMap.set(str, (valueMap.get(str) || 0) + 1);
    }
  });

  return Array.from(valueMap.entries())
    .map(([value, count]) => ({
      value,
      label: value,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get filter counts for each filter option
 */
export function getFilterCounts(
  files: FileInfo[],
  field: keyof FileInfo,
  filters: Partial<FilterState> = {}
): Map<string, number> {
  const counts = new Map<string, number>();

  files.forEach((file) => {
    // Check if file matches other filters (excluding the current field)
    const tempFilters: FilterState = {
      subjects: filters.subjects || [],
      topics: filters.topics || [],
      levels: filters.levels || [],
      schoolYears: filters.schoolYears || [],
      keywords: filters.keywords || [],
      dateRange: filters.dateRange || { type: 'all' },
      searchText: filters.searchText || '',
    };

    if (!fileMatchesFilters(file, tempFilters)) {
      return;
    }

    const value = file[field];

    if (Array.isArray(value)) {
      value.forEach((v) => {
        const str = String(v);
        counts.set(str, (counts.get(str) || 0) + 1);
      });
    } else if (value) {
      const str = String(value);
      counts.set(str, (counts.get(str) || 0) + 1);
    }
  });

  return counts;
}

/**
 * Serialize filters to URL query params
 */
export function serializeFilters(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.subjects.length > 0) {
    params.set('subjects', filters.subjects.join(','));
  }
  if (filters.topics.length > 0) {
    params.set('topics', filters.topics.join(','));
  }
  if (filters.levels.length > 0) {
    params.set('levels', filters.levels.join(','));
  }
  if (filters.schoolYears.length > 0) {
    params.set('schoolYears', filters.schoolYears.join(','));
  }
  if (filters.keywords.length > 0) {
    params.set('keywords', filters.keywords.join(','));
  }
  if (filters.dateRange.type !== 'all') {
    params.set('dateRangeType', filters.dateRange.type);
    if (filters.dateRange.value !== undefined) {
      params.set('dateRangeValue', String(filters.dateRange.value));
    }
  }
  if (filters.searchText) {
    params.set('searchText', filters.searchText);
  }

  return params;
}

/**
 * Deserialize filters from URL query params
 */
export function deserializeFilters(params: URLSearchParams): FilterState {
  return {
    subjects: params.get('subjects')?.split(',').filter(Boolean) || [],
    topics: params.get('topics')?.split(',').filter(Boolean) || [],
    levels: params.get('levels')?.split(',').filter(Boolean) || [],
    schoolYears: params.get('schoolYears')?.split(',').filter(Boolean) || [],
    keywords: params.get('keywords')?.split(',').filter(Boolean) || [],
    dateRange: {
      type: (params.get('dateRangeType') || 'all') as 'all' | 'days' | 'weeks' | 'months' | 'years' | 'custom',
      value: params.get('dateRangeValue') ? parseInt(params.get('dateRangeValue')!) : undefined,
    },
    searchText: params.get('searchText') || '',
  };
}

/**
 * Get the number of active filters
 */
export function getActiveFilterCount(filters: FilterState): number {
  return (
    filters.subjects.length +
    filters.topics.length +
    filters.levels.length +
    filters.schoolYears.length +
    filters.keywords.length +
    (filters.dateRange.type !== 'all' ? 1 : 0)
  );
}
