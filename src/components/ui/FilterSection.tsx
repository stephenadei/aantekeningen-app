'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { FilterItem, FilterSectionProps } from '@/lib/interfaces';

export default function FilterSection({
  title,
  items,
  selectedValues,
  onSelectionChange,
  icon,
  defaultExpanded = false,
}: FilterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [searchText, setSearchText] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.label.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [items, searchText]);

  const toggleValue = (value: string) => {
    onSelectionChange(
      selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value]
    );
  };

  const toggleAll = () => {
    if (selectedValues.length === items.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map((item) => item.value));
    }
  };

  return (
    <div className="border-b border-gray-200 dark:border-slate-700 pb-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-3 px-0 hover:bg-gray-50 dark:hover:bg-slate-800 rounded transition"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-gray-900 dark:text-slate-200">{title}</span>
          {selectedValues.length > 0 && (
            <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold px-2 py-1 rounded">
              {selectedValues.length}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-600 dark:text-slate-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Search within section */}
          {items.length > 5 && (
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              />
            </div>
          )}

          {/* Select all option */}
          {filteredItems.length === items.length && items.length > 1 && (
            <label className="flex items-center gap-3 py-2">
              <input
                type="checkbox"
                checked={selectedValues.length === items.length}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer bg-white dark:bg-slate-800"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-slate-200">
                Select all
              </span>
            </label>
          )}

          {/* Filter options */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400 py-2">No results found</p>
            ) : (
              filteredItems.map((item) => (
                <label
                  key={item.value}
                  className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 px-2 rounded transition"
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(item.value)}
                      onChange={() => toggleValue(item.value)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer bg-white dark:bg-slate-800"
                    />
                  </div>
                  {item.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                  <span className="text-sm text-gray-900 dark:text-slate-200 flex-1">
                    {item.label}
                  </span>
                  {item.count !== undefined && (
                    <span className="text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
                      {item.count}
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
