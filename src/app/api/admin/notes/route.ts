import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { validateTeacherEmail, sanitizeInput } from '@/lib/security';
import { canonSubject, canonLevel, canonTopic, generateTags } from '@/lib/normalization';
import { z } from 'zod';

const createNoteSchema = z.object({
  studentId: z.string().min(1),
  contentMd: z.string().min(1),
  subject: z.string().min(1),
  level: z.string().min(1),
  topic: z.string().min(1),
  driveFileId: z.string().optional(),
  driveFileName: z.string().optional(),
});

const getNotesSchema = z.object({
  studentId: z.string().optional(),
  subject: z.string().optional(),
  level: z.string().optional(),
  topic: z.string().optional(),
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
    
    const { studentId, subject, level, topic, search, page, limit } = getNotesSchema.parse(query);
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (subject) {
      where.subject = canonSubject(subject);
    }

    if (level) {
      where.level = canonLevel(level);
    }

    if (topic) {
      where.topic = canonTopic(topic);
    }

    if (search) {
      where.OR = [
        { contentMd: { contains: sanitizeInput(search), mode: 'insensitive' } },
        { subject: { contains: sanitizeInput(search), mode: 'insensitive' } },
        { level: { contains: sanitizeInput(search), mode: 'insensitive' } },
        { topic: { contains: sanitizeInput(search), mode: 'insensitive' } },
      ];
    }

    // Get notes with pagination
    const [notes, totalCount] = await Promise.all([
      prisma.note.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.note.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      notes,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
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
    const { studentId, contentMd, subject, level, topic, driveFileId, driveFileName } = createNoteSchema.parse(body);

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Normalize the tags
    const normalizedSubject = canonSubject(subject);
    const normalizedLevel = canonLevel(level);
    const normalizedTopic = canonTopic(topic);

    // Create note and tags in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the note
      const note = await tx.note.create({
        data: {
          studentId,
          contentMd: sanitizeInput(contentMd),
          subject: normalizedSubject,
          level: normalizedLevel,
          topic: normalizedTopic,
          driveFileId,
          driveFileName,
        },
      });

      // Create/update student tags
      const tags = generateTags(normalizedSubject, normalizedLevel, normalizedTopic);
      
      for (const tag of tags) {
        await tx.studentTag.upsert({
          where: {
            studentId_key_value: {
              studentId,
              key: tag.key,
              value: tag.value,
            },
          },
          update: {},
          create: {
            studentId,
            key: tag.key,
            value: tag.value,
          },
        });
      }

      return note;
    });

    // Log the creation
    await prisma.loginAudit.create({
      data: {
        who: `teacher:${session.user.email}`,
        action: 'note_created',
        studentId,
        metadata: {
          noteId: result.id,
          studentName: student.displayName,
          subject: normalizedSubject,
          level: normalizedLevel,
          topic: normalizedTopic,
        },
      },
    });

    return NextResponse.json({
      success: true,
      note: result,
    });

  } catch (error) {
    console.error('Error creating note:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
