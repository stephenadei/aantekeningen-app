import { useState, useEffect, useMemo } from 'react';
import { 
  extractUniqueValues, 
  getFilterCounts,
  serializeFilters,
  deserializeFilters
} from '@/lib/filterUtils';
import type { FilterState, FileInfo } from '@/lib/interfaces';

export function useFilters(files: FileInfo[]) {
  const [filters, setFilters] = useState<FilterState>({
    subjects: [],
    topicGroups: [],
    topics: [],
    levels: [],
    schoolYears: [],
    keywords: [],
    dateRange: { type: 'all' },
    sortBy: 'date',
    sortOrder: 'desc',
    searchText: ''
  });

  // Load filters from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if we have any filter params in the URL
    const hasFilterParams = 
      urlParams.get('subjects') ||
      urlParams.get('topics') ||
      urlParams.get('levels') ||
      urlParams.get('schoolYears') ||
      urlParams.get('keywords') ||
      urlParams.get('dateRangeType') ||
      urlParams.get('searchText');
    
    if (hasFilterParams) {
      try {
        const loadedFilters = deserializeFilters(urlParams);
        if (loadedFilters.subjects.length > 0 || 
            loadedFilters.topics.length > 0 ||
            loadedFilters.levels.length > 0 ||
            loadedFilters.schoolYears.length > 0 ||
            loadedFilters.keywords.length > 0 ||
            loadedFilters.dateRange.type !== 'all' ||
            loadedFilters.searchText) {
          setFilters(loadedFilters);
        }
      } catch (e) {
        console.log('Could not parse filter params from URL', e);
      }
    }
  }, []);

  // Compute filter items with counts
  const [subjectItems, setSubjectItems] = useState<Array<{ value: string; label: string; count: number }>>([]);
  const [topicGroupItems, setTopicGroupItems] = useState<Array<{ value: string; label: string; count: number }>>([]);
  const [topicItems, setTopicItems] = useState<Array<{ value: string; label: string; count: number }>>([]);

  // Update filter items with taxonomy display names
  useEffect(() => {
    const updateFilterItems = async () => {
      const { enhanceFilterItemsWithDisplayNames } = await import('@/lib/taxonomy-helpers');
      
      const subjectItemsRaw = extractUniqueValues(files, 'subject');
      const subjectCounts = getFilterCounts(files, 'subject', filters);
      const subjectItemsWithCounts = subjectItemsRaw.map(item => ({
        value: item.value,
        label: item.label,
        count: subjectCounts.get(item.value) || 0
      }));
      const enhancedSubjects = await enhanceFilterItemsWithDisplayNames(subjectItemsWithCounts, 'subject');
      setSubjectItems(enhancedSubjects);

      const topicGroupItemsRaw = extractUniqueValues(files, 'topicGroup');
      const topicGroupCounts = getFilterCounts(files, 'topicGroup', filters);
      const topicGroupItemsWithCounts = topicGroupItemsRaw.map(item => ({
        value: item.value,
        label: item.label,
        count: topicGroupCounts.get(item.value) || 0
      }));
      const enhancedTopicGroups = await enhanceFilterItemsWithDisplayNames(topicGroupItemsWithCounts, 'topicGroup');
      setTopicGroupItems(enhancedTopicGroups);

      const topicItemsRaw = extractUniqueValues(files, 'topic');
      const topicCounts = getFilterCounts(files, 'topic', filters);
      const topicItemsWithCounts = topicItemsRaw.map(item => ({
        value: item.value,
        label: item.label,
        count: topicCounts.get(item.value) || 0
      }));
      const enhancedTopics = await enhanceFilterItemsWithDisplayNames(topicItemsWithCounts, 'topic');
      setTopicItems(enhancedTopics);
    };

    if (files.length > 0) {
      updateFilterItems();
    }
  }, [files, filters]);

  const levelItems = useMemo(() => {
    const items = extractUniqueValues(files, 'level');
    const counts = getFilterCounts(files, 'level', filters);
    return items.map(item => ({
      value: item.value,
      label: item.label,
      count: counts.get(item.value) || 0
    }));
  }, [files, filters]);

  const schoolYearItems = useMemo(() => {
    const items = extractUniqueValues(files, 'schoolYear');
    const counts = getFilterCounts(files, 'schoolYear', filters);
    return items.map(item => ({
      value: item.value,
      label: item.label,
      count: counts.get(item.value) || 0
    }));
  }, [files, filters]);

  const keywordItems = useMemo(() => {
    const items = extractUniqueValues(files, 'keywords');
    const counts = getFilterCounts(files, 'keywords', filters);
    return items.map(item => ({
      value: item.value,
      label: item.label,
      count: counts.get(item.value) || 0
    }));
  }, [files, filters]);

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    // Update URL with filters
    try {
      const baseParams = new URLSearchParams(window.location.search);
      const filterParams = serializeFilters(newFilters);
      
      // Clear old filter params
      baseParams.delete('subjects');
      baseParams.delete('topics');
      baseParams.delete('levels');
      baseParams.delete('schoolYears');
      baseParams.delete('keywords');
      baseParams.delete('dateRangeType');
      baseParams.delete('dateRangeValue');
      baseParams.delete('searchText');
      
      // Add new filter params
      filterParams.forEach((value, key) => {
        baseParams.set(key, value);
      });
      
      window.history.replaceState({}, '', `?${baseParams.toString()}`);
    } catch (e) {
      console.error('Error updating URL with filters', e);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      subjects: [],
      topicGroups: [],
      topics: [],
      levels: [],
      schoolYears: [],
      keywords: [],
      dateRange: { type: 'all' },
      sortBy: 'date',
      sortOrder: 'desc',
      searchText: ''
    });
  };

  const handleRemovePill = (pillId: string) => {
    const [filterType, value] = pillId.split(':');
    
    switch (filterType) {
      case 'subject':
        setFilters(prev => ({
          ...prev,
          subjects: prev.subjects.filter(s => s !== value)
        }));
        break;
      case 'topicGroup':
        setFilters(prev => ({
          ...prev,
          topicGroups: prev.topicGroups.filter(tg => tg !== value)
        }));
        break;
      case 'topic':
        setFilters(prev => ({
          ...prev,
          topics: prev.topics.filter(t => t !== value)
        }));
        break;
      case 'level':
        setFilters(prev => ({
          ...prev,
          levels: prev.levels.filter(l => l !== value)
        }));
        break;
      case 'schoolYear':
        setFilters(prev => ({
          ...prev,
          schoolYears: prev.schoolYears.filter(sy => sy !== value)
        }));
        break;
      case 'keyword':
        setFilters(prev => ({
          ...prev,
          keywords: prev.keywords.filter(k => k !== value)
        }));
        break;
      case 'dateRange':
        setFilters(prev => ({
          ...prev,
          dateRange: { type: 'all' }
        }));
        break;
    }
  };

  // Build filter pills
  const filterPills = useMemo(() => {
    const pills = [];
    
    filters.subjects.forEach(subject => {
      pills.push({ id: `subject:${subject}`, label: `Vak: ${subject}` });
    });
    
    filters.topicGroups.forEach(topicGroup => {
      pills.push({ id: `topicGroup:${topicGroup}`, label: `Domein: ${topicGroup}` });
    });
    
    filters.topics.forEach(topic => {
      pills.push({ id: `topic:${topic}`, label: `Onderwerp: ${topic}` });
    });
    
    filters.levels.forEach(level => {
      pills.push({ id: `level:${level}`, label: `Niveau: ${level}` });
    });
    
    filters.schoolYears.forEach(year => {
      pills.push({ id: `schoolYear:${year}`, label: `Schooljaar: ${year}` });
    });
    
    filters.keywords.forEach(keyword => {
      pills.push({ id: `keyword:${keyword}`, label: `Trefwoord: ${keyword}` });
    });
    
    if (filters.dateRange.type !== 'all') {
      let dateLabel = 'Datum: ';
      switch (filters.dateRange.type) {
        case 'days':
          dateLabel += `Laatste ${filters.dateRange.value} dagen`;
          break;
        case 'weeks':
          dateLabel += `Laatste ${filters.dateRange.value} weken`;
          break;
        case 'months':
          dateLabel += `Laatste ${filters.dateRange.value} maanden`;
          break;
        case 'years':
          dateLabel += `Laatste ${filters.dateRange.value} jaar`;
          break;
        case 'custom':
          dateLabel += 'Aangepast bereik';
          break;
      }
      pills.push({ id: 'dateRange:all', label: dateLabel });
    }
    
    return pills;
  }, [filters]);

  return {
    filters,
    setFilters,
    subjectItems,
    topicGroupItems,
    topicItems,
    levelItems,
    schoolYearItems,
    keywordItems,
    filterPills,
    handleApplyFilters,
    handleClearFilters,
    handleRemovePill,
  };
}

