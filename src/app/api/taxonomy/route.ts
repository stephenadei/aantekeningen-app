import { NextRequest, NextResponse } from 'next/server';
import { TaxonomyService } from '@stephen/taxonomy';

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
    return NextResponse.json(
      { error: `Failed to fetch taxonomy: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

