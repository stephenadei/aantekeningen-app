import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { validateTeacherEmail, sanitizeInput } from '@/lib/security';
import { generatePin, hashPin } from '@/lib/security';
import { z } from 'zod';

// Validation schemas
const createStudentSchema = z.object({
  displayName: z.string().min(2).max(50),
});

const getStudentsSchema = z.object({
  search: z.string().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email || !validateTeacherEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    const { search, page, limit } = getStudentsSchema.parse(query);
    const offset = (page - 1) * limit;

    // Build where clause
    const where = search ? {
      displayName: {
        contains: sanitizeInput(search),
        mode: 'insensitive' as const,
      },
    } : {};

    // Get students with pagination
    const [students, totalCount] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          notes: {
            select: {
              id: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
          _count: {
            select: {
              notes: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.student.count({ where }),
    ]);

    // Transform data for response
    const studentsWithStats = students.map(student => ({
      id: student.id,
      displayName: student.displayName,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      pinUpdatedAt: student.pinUpdatedAt,
      notesCount: student._count.notes,
      lastNoteDate: student.notes[0]?.createdAt || null,
    }));

    return NextResponse.json({
      success: true,
      students: studentsWithStats,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email || !validateTeacherEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { displayName } = createStudentSchema.parse(body);

    // Check if student already exists
    const existingStudent = await prisma.student.findUnique({
      where: { displayName },
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: 'Student met deze naam bestaat al' },
        { status: 400 }
      );
    }

    // Generate PIN and hash it
    const pin = generatePin();
    const pinHash = await hashPin(pin);

    // Create student
    const student = await prisma.student.create({
      data: {
        displayName: sanitizeInput(displayName),
        pinHash,
      },
    });

    // Log the creation
    await prisma.loginAudit.create({
      data: {
        who: `teacher:${session.user.email}`,
        action: 'student_created',
        metadata: {
          studentId: student.id,
          studentName: student.displayName,
        },
      },
    });

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        displayName: student.displayName,
        createdAt: student.createdAt,
      },
      pin, // Return PIN only once during creation
    });

  } catch (error) {
    console.error('Error creating student:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    );
  }
}
