/**
 * Taxonomy Helpers for Client-Side
 * 
 * Provides helper functions to get display names from taxonomy
 * Uses API endpoint to fetch taxonomy data
 */

let cachedTaxonomy: any = null;
let taxonomyLoadPromise: Promise<any> | null = null;

/**
 * Load taxonomy data (cached)
 */
async function loadTaxonomy(): Promise<any> {
  if (cachedTaxonomy) {
    return cachedTaxonomy;
  }

  if (taxonomyLoadPromise) {
    return taxonomyLoadPromise;
  }

  taxonomyLoadPromise = fetch('/api/taxonomy')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        cachedTaxonomy = data;
        return cachedTaxonomy;
      }
      // If taxonomy API returns success: false, return empty structure instead of throwing
      // This allows the UI to continue working even when taxonomy fails to load
      console.warn('Taxonomy API returned success: false, using empty taxonomy structure');
      cachedTaxonomy = {
        success: false,
        version: data.version || '0.0.0',
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        subjects: [],
        topicGroups: [],
        topics: [],
        synonyms: {}
      };
      return cachedTaxonomy;
    })
    .catch(error => {
      taxonomyLoadPromise = null;
      // Return empty structure instead of throwing to prevent UI breakage
      console.warn('Failed to load taxonomy, using empty structure:', error);
      const emptyTaxonomy = {
        success: false,
        version: '0.0.0',
        lastUpdated: new Date().toISOString(),
        subjects: [],
        topicGroups: [],
        topics: [],
        synonyms: {}
      };
      cachedTaxonomy = emptyTaxonomy;
      return emptyTaxonomy;
    });

  return taxonomyLoadPromise;
}

/**
 * Get display name for subject
 */
export async function getSubjectDisplayName(subjectIdOrName: string): Promise<string> {
  try {
    const taxonomy = await loadTaxonomy();
    if (!taxonomy || !taxonomy.subjects || taxonomy.subjects.length === 0) {
      return subjectIdOrName;
    }
    const subject = taxonomy.subjects.find((s: any) => s.id === subjectIdOrName || s.name === subjectIdOrName);
    return subject?.displayName || subjectIdOrName;
  } catch {
    return subjectIdOrName;
  }
}

/**
 * Get display name for topic group
 */
export async function getTopicGroupDisplayName(topicGroupIdOrName: string): Promise<string> {
  try {
    const taxonomy = await loadTaxonomy();
    if (!taxonomy || !taxonomy.topicGroups || taxonomy.topicGroups.length === 0) {
      return topicGroupIdOrName;
    }
    const topicGroup = taxonomy.topicGroups.find((tg: any) => tg.id === topicGroupIdOrName || tg.name === topicGroupIdOrName);
    return topicGroup?.displayName || topicGroupIdOrName;
  } catch {
    return topicGroupIdOrName;
  }
}

/**
 * Get display name for topic
 */
export async function getTopicDisplayName(topicIdOrName: string): Promise<string> {
  try {
    const taxonomy = await loadTaxonomy();
    if (!taxonomy || !taxonomy.topics || taxonomy.topics.length === 0) {
      return topicIdOrName;
    }
    const topic = taxonomy.topics.find((t: any) => t.id === topicIdOrName || t.name === topicIdOrName);
    return topic?.displayName || topicIdOrName;
  } catch {
    return topicIdOrName;
  }
}

/**
 * Enhance filter items with display names from taxonomy
 */
export async function enhanceFilterItemsWithDisplayNames(
  items: Array<{ value: string; label: string; count: number }>,
  type: 'subject' | 'topicGroup' | 'topic'
): Promise<Array<{ value: string; label: string; count: number }>> {
  try {
    const taxonomy = await loadTaxonomy();
    
    // If taxonomy is empty or failed to load, return original items
    if (!taxonomy || taxonomy.success === false) {
      return items;
    }
    
    return items.map(item => {
      let displayName = item.label;
      
      if (type === 'subject' && taxonomy.subjects && taxonomy.subjects.length > 0) {
        const subject = taxonomy.subjects.find((s: any) => s.id === item.value || s.name === item.value);
        displayName = subject?.displayName || item.label;
      } else if (type === 'topicGroup' && taxonomy.topicGroups && taxonomy.topicGroups.length > 0) {
        const topicGroup = taxonomy.topicGroups.find((tg: any) => tg.id === item.value || tg.name === item.value);
        displayName = topicGroup?.displayName || item.label;
      } else if (type === 'topic' && taxonomy.topics && taxonomy.topics.length > 0) {
        const topic = taxonomy.topics.find((t: any) => t.id === item.value || t.name === item.value);
        displayName = topic?.displayName || item.label;
      }
      
      return {
        ...item,
        label: displayName,
      };
    });
  } catch (error) {
    console.warn('Failed to enhance filter items with display names:', error);
    return items; // Return original items if taxonomy load fails
  }
}

