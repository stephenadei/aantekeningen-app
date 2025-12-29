import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, isAuthorizedAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { datalakeService } from '@/lib/datalake-simple';
import { datalakeMetadataService } from '@/lib/datalake-metadata';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const subject = searchParams.get('subject') || '';
    const topicGroup = searchParams.get('topicGroup') || '';
    const topic = searchParams.get('topic') || '';
    const level = searchParams.get('level') || '';
    const schoolYear = searchParams.get('schoolYear') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const aiAnalyzed = searchParams.get('aiAnalyzed') || '';
    const studentId = searchParams.get('studentId') || '';

    // Build Prisma query
    const where: Prisma.NoteWhereInput = {};

    if (subject) where.subject = subject;
    if (topicGroup) where.topicGroup = topicGroup;
    if (topic) where.topic = topic;
    if (level) where.level = level;
    if (schoolYear) where.schoolYear = schoolYear;
    if (studentId) where.studentId = studentId;

    if (dateFrom || dateTo) {
      where.updatedAt = {};
      if (dateFrom) where.updatedAt.gte = new Date(dateFrom);
      if (dateTo) where.updatedAt.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
        { keywords: { has: search } }
      ];
    }

    // Execute query
    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              subject: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.note.count({ where })
    ]);

    // Map to response format
    const formattedNotes = notes.map(note => ({
      id: note.id,
      name: note.title || 'Untitled',
      title: note.title || '',
      modifiedTime: note.updatedAt.toISOString(),
      size: 0, 
      thumbnailUrl: '', 
      downloadUrl: '',
      viewUrl: '',
      
      subject: note.subject || undefined,
      topicGroup: note.topicGroup || undefined,
      topic: note.topic || undefined,
      level: note.level || undefined,
      schoolYear: note.schoolYear || undefined,
      keywords: note.keywords,
      summary: note.body || undefined,
      
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      
      student: {
        id: note.student.id,
        displayName: note.student.name,
        subject: note.student.subject?.toString() || undefined
      },
      datalakePath: note.datalakePath
    }));

    return NextResponse.json({
      notes: formattedNotes,
      total,
      page,
      limit,
      hasMore: (page * limit) < total,
      appliedFilters: {
        search,
        subject,
        topicGroup,
        topic,
        level,
        schoolYear,
        dateFrom,
        dateTo,
        aiAnalyzed,
        studentId
      }
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
    const { user, error } = await getAuthSession();
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const studentId = formData.get('studentId') as string;
    const autoAnalyze = formData.get('autoAnalyze') === 'true';

    // Validate required fields
    if (!file || !studentId) {
      return NextResponse.json(
        { error: 'File and student ID are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      );
    }

    // Get student info from Prisma
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Construct path: prefer datalakePath, fallback to constructing it
    let studentPath = student.datalakePath;
    if (!studentPath) {
      // Fallback: notability/Priveles/VO/{Name}
      // Note: This assumes VO structure.
      studentPath = `notability/Priveles/VO/${student.name}`;
    }

    const filePath = `${studentPath}/${file.name}`;

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to MinIO
    try {
      await datalakeService.uploadFile(filePath, buffer, file.type);
    } catch (uploadError) {
      console.error('Error uploading to datalake:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Create metadata object
    const fileMetadata = datalakeMetadataService.createFileMetadata(
      {
        id: filePath,
        name: file.name,
        modifiedTime: new Date().toISOString(),
        size: file.size
      },
      student.id,
      student.datalakePath || ''
    );
    
    // Write metadata to MinIO
    await datalakeMetadataService.saveFileMetadata(filePath, fileMetadata);
    
    // Write to Prisma
    const note = await prisma.note.create({
      data: {
        studentId: student.id,
        type: 'PDF',
        title: file.name.replace('.pdf', ''),
        datalakePath: filePath,
        subject: student.subject?.toString(),
        // We initialize with basic info; sync service or manual edit can fill rest
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // TODO: If autoAnalyze is true, trigger AI analysis (via background sync or queue)

    return NextResponse.json({
      success: true,
      note: {
        id: note.id,
        ...fileMetadata,
        student: {
          id: student.id,
          displayName: student.name,
          subject: student.subject
        }
      }
    });

  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
