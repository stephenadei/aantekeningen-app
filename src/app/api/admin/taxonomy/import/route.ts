import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { TaxonomyService, TaxonomySyncService } from '@stephenadei/taxonomy';
import type { TaxonomyData } from '@stephenadei/taxonomy';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { taxonomy } = body as { taxonomy: TaxonomyData };

    if (!taxonomy) {
      return NextResponse.json(
        { error: 'Taxonomy data is required' },
        { status: 400 }
      );
    }

    // Validate taxonomy
    const taxonomyService = new TaxonomyService();
    const validation = taxonomyService.validate(taxonomy);

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Taxonomy validation failed',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // Save to datalake
    const { DatalakeTaxonomyLoader } = await import('@stephenadei/taxonomy');
    const loader = new DatalakeTaxonomyLoader();
    
    // Update version and timestamp
    const updatedTaxonomy = {
      ...taxonomy,
      version: taxonomy.version || '1.0.0',
      lastUpdated: new Date().toISOString(),
    };
    
    await loader.saveToDatalake(updatedTaxonomy);

    // Sync to database
    const syncService = new TaxonomySyncService();
    await syncService.syncDatalakeToDatabase();

    return NextResponse.json({
      success: true,
      message: 'Taxonomy imported successfully',
      validation,
    });
  } catch (error) {
    console.error('Error importing taxonomy:', error);
    return NextResponse.json(
      { error: `Failed to import taxonomy: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

