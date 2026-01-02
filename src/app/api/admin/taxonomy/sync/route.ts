import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, isAuthorizedAdmin } from '@/lib/auth';
import { TaxonomySyncService, TaxonomyService } from '@stephen/taxonomy';

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { direction } = body; // 'datalake-to-database' or 'database-to-datalake'

    const syncService = new TaxonomySyncService();

    if (direction === 'datalake-to-database') {
      await syncService.syncDatalakeToDatabase();
      return NextResponse.json({
        success: true,
        message: 'Synced datalake to database successfully',
      });
    } else if (direction === 'database-to-datalake') {
      await syncService.syncDatabaseToDatalake();
      return NextResponse.json({
        success: true,
        message: 'Synced database to datalake successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid direction. Use "datalake-to-database" or "database-to-datalake"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error syncing taxonomy:', error);
    return NextResponse.json(
      { error: `Failed to sync taxonomy: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taxonomyService = new TaxonomyService();
    const syncService = new TaxonomySyncService();
    const status = await taxonomyService.getSyncStatus();

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('Error validating taxonomy sync:', error);
    return NextResponse.json(
      { error: `Failed to validate sync: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

