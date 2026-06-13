import { NextRequest, NextResponse } from 'next/server';
import { TaxonomyService } from '@stephenadei/taxonomy';

/**
 * Public Taxonomy API
 * 
 * Provides read-only access to taxonomy data for other apps
 */
export async function GET(request: NextRequest) {
  try {
    const taxonomyService = new TaxonomyService();
    const data = await taxonomyService.getTaxonomyData();

    // Return only essential data (no sensitive info)
    return NextResponse.json({
      success: true,
      version: data.version,
      lastUpdated: data.lastUpdated,
      subjects: data.subjects.map(s => ({
        id: s.id,
        name: s.name,
        displayName: s.displayName,
        description: s.description,
        color: s.color,
        icon: s.icon,
        sortOrder: s.sortOrder,
      })),
      topicGroups: data.topicGroups.map(tg => ({
        id: tg.id,
        subjectId: tg.subjectId,
        name: tg.name,
        displayName: tg.displayName,
        description: tg.description,
        sortOrder: tg.sortOrder,
      })),
      topics: data.topics.map(t => ({
        id: t.id,
        topicGroupId: t.topicGroupId,
        name: t.name,
        displayName: t.displayName,
        description: t.description,
        sortOrder: t.sortOrder,
      })),
      synonyms: data.synonyms,
    });
  } catch (error) {
    console.error('Error fetching taxonomy:', error);
    // Return a more graceful error response that won't break the UI
    // Return empty taxonomy structure instead of 500 to prevent UI errors
    return NextResponse.json({
      success: false,
      error: `Failed to fetch taxonomy: ${error instanceof Error ? error.message : 'Unknown error'}`,
      version: '0.0.0',
      lastUpdated: new Date().toISOString(),
      subjects: [],
      topicGroups: [],
      topics: [],
      synonyms: {},
    }, { status: 200 }); // Return 200 with error flag so client can handle gracefully
  }
}

