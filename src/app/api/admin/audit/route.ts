import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { db } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const action = searchParams.get('action') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const exportCsv = searchParams.get('export') === 'csv';

    const skip = (page - 1) * limit;

    // Build Firestore query
    let query = db.collection('loginAudits').orderBy('createdAt', 'desc');
    
    if (action) {
      query = query.where('action', '==', action);
    }
    
    if (dateFrom) {
      query = query.where('createdAt', '>=', new Date(dateFrom));
    }
    
    if (dateTo) {
      query = query.where('createdAt', '<=', new Date(dateTo + 'T23:59:59.999Z'));
    }

    // Get total count
    const snapshot = await query.get();
    const total = snapshot.size;

    // Handle CSV export
    if (exportCsv) {
      const audits = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Generate CSV
      const csvHeaders = ['ID', 'Wie', 'Actie', 'IP', 'User Agent', 'Tijdstip', 'Metadata'];
      const csvRows = audits.map((audit: Record<string, unknown>) => [
        audit.id,
        audit.who || '',
        audit.action || '',
        audit.ip || '',
        audit.userAgent || '',
        audit.createdAt instanceof Date ? audit.createdAt.toISOString() : new Date(audit.createdAt as string).toISOString(),
        JSON.stringify(audit.metadata || {})
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row: (string | unknown)[]) => row.map((field: unknown) => `"${field}"`).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Get paginated audits
    const paginatedDocs = snapshot.docs.slice(skip, skip + limit);
    const audits = paginatedDocs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      audits,
      total,
      page,
      totalPages,
      limit
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}