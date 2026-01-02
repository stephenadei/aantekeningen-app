import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, isAuthorizedAdmin } from '@/lib/auth';
import { TaxonomyService } from '@stephen/taxonomy';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

