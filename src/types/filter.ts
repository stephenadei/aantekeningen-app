/**
 * Filter related types
 */

import type { FileInfo } from './file';

export interface FilterState {
  subjects: string[];
  topicGroups: string[];
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
  sortBy: 'date' | 'name' | 'subject' | 'topic';
  sortOrder: 'asc' | 'desc';
  searchText: string;
}

export interface FilterItem {
  value: string;
  label: string;
  count?: number;
  color?: string;
}

export interface AdvancedFiltersProps {
  files: FileInfo[];
  onFiltersChange: (filters: {
    subjects: string[];
    topics: string[];
    levels: string[];
    schoolYears: string[];
    keywords: string[];
  }) => void;
  className?: string;
}

export interface FilterSectionProps {
  title: string;
  items: FilterItem[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
}

export interface FilterPillProps {
  label: string;
  onRemove: () => void;
  color?: string;
}

export interface FilterPillsProps {
  pills: Array<{
    id: string;
    label: string;
    color?: string;
  }>;
  onRemovePill: (id: string) => void;
  onClearAll?: () => void;
}

export interface DateRangeFilterProps {
  value: {
    type: 'all' | 'days' | 'weeks' | 'months' | 'years' | 'custom';
    value?: number;
    startDate?: Date;
    endDate?: Date;
  };
  onChange: (value: {
    type: 'all' | 'days' | 'weeks' | 'months' | 'years' | 'custom';
    value?: number;
    startDate?: Date;
    endDate?: Date;
  }) => void;
}

export interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  onClear: () => void;
  currentFilters: FilterState;
  children: React.ReactNode;
}

export interface FilterSidebarContentProps {
  currentFilters: FilterState;
  onApply: (filters: FilterState) => void;
  onClear: () => void;
  subjectItems: Array<{ value: string; label: string; count: number }>;
  topicGroupItems: Array<{ value: string; label: string; count: number }>;
  topicItems: Array<{ value: string; label: string; count: number }>;
  levelItems: Array<{ value: string; label: string; count: number }>;
  schoolYearItems: Array<{ value: string; label: string; count: number }>;
  keywordItems: Array<{ value: string; label: string; count: number }>;
}

