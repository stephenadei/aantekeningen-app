import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { TaxonomyService } from '@stephenadei/taxonomy';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const taxonomyService = new TaxonomyService();
    const data = await taxonomyService.getTaxonomyData();

    return NextResponse.json({
      success: true,
      taxonomy: data,
    });
  } catch (error) {
    console.error('Error exporting taxonomy:', error);
    return NextResponse.json(
      { error: `Failed to export taxonomy: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

