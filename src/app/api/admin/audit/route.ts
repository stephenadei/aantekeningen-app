import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { validateTeacherEmail } from '@/lib/security';
import { z } from 'zod';

const getAuditSchema = z.object({
  action: z.string().optional(),
  who: z.string().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email || !validateTeacherEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    const { action, who, page, limit, startDate, endDate } = getAuditSchema.parse(query);
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (who) {
      where.who = {
        contains: who,
        mode: 'insensitive',
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // Get audit logs with pagination
    const [auditLogs, totalCount] = await Promise.all([
      prisma.loginAudit.findMany({
        where,
        include: {
          teacher: {
            select: {
              email: true,
            },
          },
          student: {
            select: {
              displayName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.loginAudit.count({ where }),
    ]);

    // Transform data for response
    const transformedLogs = auditLogs.map(log => ({
      id: log.id,
      who: log.who,
      action: log.action,
      ip: log.ip,
      userAgent: log.userAgent,
      metadata: log.metadata,
      createdAt: log.createdAt,
      teacherEmail: log.teacher?.email,
      studentName: log.student?.displayName,
    }));

    return NextResponse.json({
      success: true,
      auditLogs: transformedLogs,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
