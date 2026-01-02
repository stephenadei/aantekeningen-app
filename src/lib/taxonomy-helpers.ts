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
      throw new Error('Failed to load taxonomy');
    })
    .catch(error => {
      taxonomyLoadPromise = null;
      throw error;
    });

  return taxonomyLoadPromise;
}

/**
 * Get display name for subject
 */
export async function getSubjectDisplayName(subjectIdOrName: string): Promise<string> {
  try {
    const taxonomy = await loadTaxonomy();
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
    
    return items.map(item => {
      let displayName = item.label;
      
      if (type === 'subject') {
        const subject = taxonomy.subjects.find((s: any) => s.id === item.value || s.name === item.value);
        displayName = subject?.displayName || item.label;
      } else if (type === 'topicGroup') {
        const topicGroup = taxonomy.topicGroups.find((tg: any) => tg.id === item.value || tg.name === item.value);
        displayName = topicGroup?.displayName || item.label;
      } else if (type === 'topic') {
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

