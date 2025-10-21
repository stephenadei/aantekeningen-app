import React, { useState, useEffect } from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import type { FileInfo, AdvancedFiltersProps } from '@/lib/interfaces';

/**
 * Advanced filtering component that uses the getUniqueValues utility
 * This implements the unused getUniqueValues function for dynamic filter options
 */
export default function AdvancedFilters({ 
  files, 
  onFiltersChange, 
  className = '' 
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    subjects: [] as string[],
    topics: [] as string[],
    levels: [] as string[],
    schoolYears: [] as string[],
    keywords: [] as string[],
  });

  // Implement the getUniqueValues function that was previously unused
  const getUniqueValues = (key: keyof FileInfo): string[] => {
    return files
      .map(file => file[key])
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
  };

  // Get available filter options
  const availableSubjects = getUniqueValues('subject');
  const availableTopics = getUniqueValues('topic');
  const availableLevels = getUniqueValues('level');
  const availableSchoolYears = getUniqueValues('schoolYear');
  const availableKeywords = files
    .flatMap(file => file.keywords || [])
    .filter((keyword, index, self) => self.indexOf(keyword) === index)
    .sort();

  // Update parent when filters change
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleFilterChange = (category: keyof typeof filters, value: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      [category]: checked 
        ? [...prev[category], value]
        : prev[category].filter(item => item !== value)
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      subjects: [],
      topics: [],
      levels: [],
      schoolYears: [],
      keywords: [],
    });
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).reduce((total, filterArray) => total + filterArray.length, 0);
  };

  const FilterSection = ({ 
    title, 
    options, 
    category, 
    selectedValues 
  }: {
    title: string;
    options: string[];
    category: keyof typeof filters;
    selectedValues: string[];
  }) => (
    <div className="mb-4">
      <h4 className="font-medium text-gray-900 mb-2">{title}</h4>
      <div className="max-h-32 overflow-y-auto space-y-1">
        {options.map(option => (
          <label key={option} className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={selectedValues.includes(option)}
              onChange={(e) => handleFilterChange(category, option, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Filter className="h-4 w-4" />
        <span>Filters</span>
        {getActiveFilterCount() > 0 && (
          <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1">
            {getActiveFilterCount()}
          </span>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-4">
            <FilterSection
              title="Subjects"
              options={availableSubjects}
              category="subjects"
              selectedValues={filters.subjects}
            />

            <FilterSection
              title="Topics"
              options={availableTopics}
              category="topics"
              selectedValues={filters.topics}
            />

            <FilterSection
              title="Levels"
              options={availableLevels}
              category="levels"
              selectedValues={filters.levels}
            />

            <FilterSection
              title="School Years"
              options={availableSchoolYears}
              category="schoolYears"
              selectedValues={filters.schoolYears}
            />

            <FilterSection
              title="Keywords"
              options={availableKeywords}
              category="keywords"
              selectedValues={filters.keywords}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
