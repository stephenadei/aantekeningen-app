import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { getLoginAudits } from '@/lib/firestore';
import { validateTeacherEmail } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const action = searchParams.get('action') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const exportCsv = searchParams.get('export') === 'csv';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { who: { contains: search, mode: 'insensitive' } },
        { ip: { contains: search, mode: 'insensitive' } },
        { userAgent: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (action) {
      where.action = action;
    }
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }

    // Handle CSV export
    if (exportCsv) {
      const audits = await prisma.loginAudit.findMany({
        where,
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          student: {
            select: {
              id: true,
              displayName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Generate CSV
      const csvHeaders = ['ID', 'Wie', 'Actie', 'IP', 'User Agent', 'Tijdstip', 'Metadata'];
      const csvRows = audits.map((audit: any) => [
        audit.id,
        audit.teacher ? `${audit.teacher.name} (${audit.teacher.email})` : 
         audit.student ? `Student: ${audit.student.displayName}` : audit.who,
        audit.action,
        audit.ip || '',
        audit.userAgent || '',
        new Date(audit.createdAt).toISOString(),
        JSON.stringify(audit.metadata || {})
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row: any) => row.map((field: any) => `"${field}"`).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Get total count
    const total = await prisma.loginAudit.count({ where });

    // Get audits with pagination
    const audits = await prisma.loginAudit.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        student: {
          select: {
            id: true,
            displayName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

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