"use client";

import { useState, useEffect, useMemo } from 'react';
import FilterSection from './FilterSection';
import DateRangeFilter from './DateRangeFilter';
import { type FilterState, FilterSidebarContentProps } from '@/lib/interfaces';
import { 
  subjectToGroups, 
  groupToTopics, 
  getSubjectDisplayName, 
  getTopicGroupDisplayName 
} from '@/data/taxonomy';

export default function FilterSidebarContent({
  currentFilters,
  onApply,
  onClear,
  subjectItems,
  topicGroupItems,
  topicItems,
  levelItems,
  schoolYearItems,
  keywordItems
}: FilterSidebarContentProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(currentFilters);

  // Sync local filters with current filters when they change
  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleClear = () => {
    const clearedFilters = {
      subjects: [],
      topicGroups: [],
      topics: [],
      levels: [],
      schoolYears: [],
      keywords: [],
      dateRange: { type: 'all' as const },
      sortBy: 'date' as const,
      sortOrder: 'desc' as const,
      searchText: ''
    };
    setLocalFilters(clearedFilters);
    onClear();
  };

  const updateFilters = (updates: Partial<FilterState>) => {
    setLocalFilters(prev => ({ ...prev, ...updates }));
  };

  // Cascading logic: when subject changes, filter topic groups and topics
  const availableTopicGroups = useMemo(() => {
    if (localFilters.subjects.length === 0) {
      return topicGroupItems;
    }
    
    const validTopicGroups = new Set<string>();
    localFilters.subjects.forEach(subject => {
      const groups = subjectToGroups[subject as keyof typeof subjectToGroups] || [];
      groups.forEach(group => validTopicGroups.add(group));
    });
    
    return topicGroupItems.filter(item => validTopicGroups.has(item.value));
  }, [localFilters.subjects, topicGroupItems]);

  const availableTopics = useMemo(() => {
    if (localFilters.topicGroups.length === 0) {
      return topicItems;
    }
    
    const validTopics = new Set<string>();
    localFilters.topicGroups.forEach(topicGroup => {
      const topics = groupToTopics[topicGroup as keyof typeof groupToTopics] || [];
      topics.forEach(topic => validTopics.add(topic));
    });
    
    return topicItems.filter(item => validTopics.has(item.value));
  }, [localFilters.topicGroups, topicItems]);

  // Handle subject change with cascading
  const handleSubjectChange = (values: string[]) => {
    const newFilters: Partial<FilterState> = { subjects: values };
    
    // Clear topic groups and topics that are no longer valid
    const validTopicGroups = new Set<string>();
    values.forEach(subject => {
      const groups = subjectToGroups[subject as keyof typeof subjectToGroups] || [];
      groups.forEach(group => validTopicGroups.add(group));
    });
    
    const filteredTopicGroups = localFilters.topicGroups.filter(tg => validTopicGroups.has(tg));
    const filteredTopics = localFilters.topics.filter(topic => {
      return filteredTopicGroups.some(tg => {
        const topics = groupToTopics[tg as keyof typeof groupToTopics] || [];
        return topics.includes(topic);
      });
    });
    
    newFilters.topicGroups = filteredTopicGroups;
    newFilters.topics = filteredTopics;
    
    updateFilters(newFilters);
  };

  // Handle topic group change with cascading
  const handleTopicGroupChange = (values: string[]) => {
    const newFilters: Partial<FilterState> = { topicGroups: values };
    
    // Clear topics that are no longer valid
    const validTopics = new Set<string>();
    values.forEach(topicGroup => {
      const topics = groupToTopics[topicGroup as keyof typeof groupToTopics] || [];
      topics.forEach(topic => validTopics.add(topic));
    });
    
    const filteredTopics = localFilters.topics.filter(topic => validTopics.has(topic));
    newFilters.topics = filteredTopics;
    
    updateFilters(newFilters);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Subject Filter Section */}
      <FilterSection
        title="Vakken"
        items={subjectItems}
        selectedValues={localFilters.subjects}
        onSelectionChange={handleSubjectChange}
        defaultExpanded={true}
      />

      {/* Topic Group Filter Section */}
      <FilterSection
        title="Domeinen"
        items={availableTopicGroups}
        selectedValues={localFilters.topicGroups}
        onSelectionChange={handleTopicGroupChange}
      />

      {/* Topic Filter Section */}
      <FilterSection
        title="Onderwerpen"
        items={availableTopics}
        selectedValues={localFilters.topics}
        onSelectionChange={(values) => updateFilters({ topics: values })}
      />

      {/* Level Filter Section */}
      <FilterSection
        title="Niveaus"
        items={levelItems}
        selectedValues={localFilters.levels}
        onSelectionChange={(values) => updateFilters({ levels: values })}
      />

      {/* School Year Filter Section */}
      <FilterSection
        title="Schooljaren"
        items={schoolYearItems}
        selectedValues={localFilters.schoolYears}
        onSelectionChange={(values) => updateFilters({ schoolYears: values })}
      />

      {/* Keywords Filter Section */}
      <FilterSection
        title="Trefwoorden"
        items={keywordItems}
        selectedValues={localFilters.keywords}
        onSelectionChange={(values) => updateFilters({ keywords: values })}
      />

      {/* Date Range Filter */}
      <div className="border-b border-blue-700/20 pb-6">
        <h3 className="font-semibold text-yellow-100 mb-3">Datumbereik</h3>
        <DateRangeFilter
          value={localFilters.dateRange}
          onChange={(value) => updateFilters({ dateRange: value })}
        />
      </div>

      {/* Search Text */}
      <div>
        <label className="block text-sm font-medium text-yellow-200 mb-2">Zoeken</label>
        <input
          type="text"
          placeholder="Zoek op naam, titel, onderwerp..."
          value={localFilters.searchText}
          onChange={(e) => updateFilters({ searchText: e.target.value })}
          className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-yellow-100 text-blue-900 placeholder-blue-600"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6 border-t border-blue-700/20">
        <button
          onClick={handleClear}
          className="flex-1 px-4 py-2 text-yellow-300 hover:text-yellow-100 hover:bg-yellow-500/20 rounded-lg transition-colors font-medium"
        >
          Wissen
        </button>
        <button
          onClick={handleApply}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-blue-900 rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
        >
          Toepassen
        </button>
      </div>
    </div>
  );
}
