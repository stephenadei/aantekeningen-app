'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

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

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  onClear: () => void;
  currentFilters: FilterState;
  children: React.ReactNode;
}

export default function FilterModal({
  isOpen,
  onClose,
  onApply,
  onClear,
  currentFilters,
  children,
}: FilterModalProps) {
  const [filters, setFilters] = useState<FilterState>(currentFilters);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters: FilterState = {
      subjects: [],
      topics: [],
      levels: [],
      schoolYears: [],
      keywords: [],
      dateRange: { type: 'all' },
      searchText: '',
    };
    setFilters(clearedFilters);
    onClear();
    onClose();
  };

  if (!isOpen) return null;

  // Count active filters
  const activeFilterCount =
    filters.subjects.length +
    filters.topics.length +
    filters.levels.length +
    filters.schoolYears.length +
    filters.keywords.length +
    (filters.dateRange.type !== 'all' ? 1 : 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50">
      {/* Modal */}
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-lg">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add filters</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
            aria-label="Close filter modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="p-6 space-y-6">{children}</div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 space-y-3">
          <button
            onClick={handleApply}
            className="w-full bg-navy-900 text-white px-4 py-3 rounded-lg hover:bg-navy-800 font-semibold transition"
          >
            Apply
            {activeFilterCount > 0 && (
              <span className="ml-2 inline-block bg-white text-navy-900 px-2 py-1 rounded text-sm font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={handleClear}
            className="w-full text-navy-900 px-4 py-3 rounded-lg hover:bg-gray-100 font-semibold transition"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Overlay click to close */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ pointerEvents: 'auto' }}
      />
    </div>
  );
}
