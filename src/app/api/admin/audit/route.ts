import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@stephenadei/database';
import { parsePageParams } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePageParams(searchParams, { defaultLimit: 20 });
    const action = searchParams.get('action') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const exportCsv = searchParams.get('export') === 'csv';

    const where = {} as any;
    
    if (action) {
      where.action = action;
    }
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const total = await prisma.loginAudit.count({ where });

    // Handle CSV export
    if (exportCsv) {
      const audits = await prisma.loginAudit.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      // Generate CSV
      const csvHeaders = ['ID', 'Wie', 'Actie', 'IP', 'User Agent', 'Tijdstip', 'Metadata'];
      const csvRows = audits.map((audit: any) => [
        audit.id,
        audit.who || '',
        audit.action || '',
        audit.ipAddress || '',
        audit.userAgent || '',
        audit.createdAt.toISOString(),
        JSON.stringify(audit.metadata || {})
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row) => row.map((field) => `"${field}"`).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Get paginated audits
    const audits = await prisma.loginAudit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      audits: audits.map(a => ({
        ...a,
        ip: a.ipAddress // Map for frontend compatibility if needed
      })),
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
