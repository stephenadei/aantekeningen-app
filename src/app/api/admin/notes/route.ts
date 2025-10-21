import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { db } from '@/lib/firebase-admin';
import { getAllStudents } from '@/lib/firestore';
import { isErr } from '@/lib/types';
import type { AdminNoteWithMetadata, BulkOperationRequest, BulkOperationResponse } from '@/lib/interfaces';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
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

    // Build Firestore query
    let query = db.collection('fileMetadata').orderBy('modifiedTime', 'desc');

    // Apply filters (Firestore allows up to 10 compound filters)
    const filters: Array<[string, FirebaseFirestore.WhereFilterOp, unknown]> = [];

    if (subject) {
      filters.push(['subject', '==', subject]);
    }
    if (topicGroup) {
      filters.push(['topicGroup', '==', topicGroup]);
    }
    if (topic) {
      filters.push(['topic', '==', topic]);
    }
    if (level) {
      filters.push(['level', '==', level]);
    }
    if (schoolYear) {
      filters.push(['schoolYear', '==', schoolYear]);
    }
    if (studentId) {
      filters.push(['studentId', '==', studentId]);
    }
    if (aiAnalyzed === 'true') {
      filters.push(['aiAnalyzedAt', '!=', null]);
    } else if (aiAnalyzed === 'false') {
      filters.push(['aiAnalyzedAt', '==', null]);
    }
    if (dateFrom) {
      filters.push(['modifiedTime', '>=', dateFrom]);
    }
    if (dateTo) {
      filters.push(['modifiedTime', '<=', dateTo]);
    }

    // Apply filters to query (max 10 for Firestore)
    filters.slice(0, 10).forEach(([field, op, value]) => {
      query = query.where(field, op, value);
    });

    // Execute query
    const snapshot = await query.get();
    let notes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AdminNoteWithMetadata[];

    // Get students for metadata
    const studentsResult = await getAllStudents();
    if (isErr(studentsResult)) {
      return NextResponse.json({ error: studentsResult.error.message }, { status: 500 });
    }

    const studentsMap = new Map(studentsResult.data.map(s => [s.id, s]));

    // Add student metadata to notes
    notes = notes.map(note => ({
      ...note,
      student: {
        id: note.studentId,
        displayName: studentsMap.get(note.studentId)?.displayName || 'Unknown Student',
        subject: studentsMap.get(note.studentId)?.subject
      }
    }));

    // Apply text search in memory (after Firestore query)
    if (search) {
      const searchLower = search.toLowerCase();
      notes = notes.filter(note => 
        note.name.toLowerCase().includes(searchLower) ||
        note.title.toLowerCase().includes(searchLower) ||
        (note.keywords && note.keywords.some(k => k.toLowerCase().includes(searchLower))) ||
        (note.summary && note.summary.toLowerCase().includes(searchLower))
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNotes = notes.slice(startIndex, endIndex);

    return NextResponse.json({
      notes: paginatedNotes,
      total: notes.length,
      page,
      limit,
      hasMore: endIndex < notes.length,
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
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
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

    // Get student info
    const studentsResult = await getAllStudents();
    if (isErr(studentsResult)) {
      return NextResponse.json({ error: studentsResult.error.message }, { status: 500 });
    }

    const student = studentsResult.data.find(s => s.id === studentId);
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    if (!student.driveFolderId) {
      return NextResponse.json(
        { error: 'Student does not have a linked Drive folder' },
        { status: 400 }
      );
    }

    // TODO: Upload to Google Drive
    // This would require implementing the Google Drive upload functionality
    // For now, we'll create a placeholder file metadata entry

    const fileMetadata = {
      studentId,
      folderId: student.driveFolderId,
      name: file.name,
      title: file.name.replace('.pdf', ''),
      modifiedTime: new Date().toISOString(),
      size: file.size,
      thumbnailUrl: '', // Will be generated
      downloadUrl: '', // Will be set after Drive upload
      viewUrl: '', // Will be set after Drive upload
      subject: student.subject,
      aiAnalyzedAt: autoAnalyze ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create file metadata in Firestore
    const docRef = await db.collection('fileMetadata').add(fileMetadata);

    // TODO: If autoAnalyze is true, trigger AI analysis
    // This would call the background sync service

    return NextResponse.json({
      success: true,
      note: {
        id: docRef.id,
        ...fileMetadata,
        student: {
          id: student.id,
          displayName: student.displayName,
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