import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseTokenFromCookie, isAuthorizedAdmin } from '@/lib/firebase-auth';
import { getAllStudents, createStudent, createLoginAudit } from '@/lib/firestore';
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
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    const { search, page, limit } = getStudentsSchema.parse(query);
    const offset = (page - 1) * limit;

    // Get all students (Firestore doesn't have complex filtering like Prisma)
    const allStudents = await getAllStudents();
    
    // Apply search filter
    let filteredStudents = allStudents;
    if (search) {
      const searchTerm = sanitizeInput(search).toLowerCase();
      filteredStudents = allStudents.filter(student => 
        student.displayName.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply pagination
    const totalCount = filteredStudents.length;
    const students = filteredStudents
      .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())
      .slice(offset, offset + limit);

    // Transform data for response (Firestore doesn't have include/relations)
    const studentsWithStats = students.map(student => ({
      id: student.id,
      displayName: student.displayName,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      pinUpdatedAt: student.pinUpdatedAt,
      notesCount: 0, // Will be populated separately if needed
      lastNoteDate: null, // Will be populated separately if needed
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
    const { user, error } = await verifyFirebaseTokenFromCookie(request);
    
    if (error || !user || !isAuthorizedAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { displayName } = createStudentSchema.parse(body);

    // Check if student already exists
    const allStudents = await getAllStudents();
    const existingStudent = allStudents.find(s => s.displayName === displayName);

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
    const studentId = await createStudent({
      displayName: sanitizeInput(displayName),
      pinHash,
      driveFolderId: null,
      driveFolderName: null,
      subject: null,
      folderConfirmed: false,
      folderLinkedAt: null,
      folderConfirmedAt: null,
    });

    // Log the creation
    await createLoginAudit({
      who: `teacher:${user.email}`,
      action: 'student_created',
      metadata: {
        studentId: studentId,
        studentName: sanitizeInput(displayName),
      },
    });

    return NextResponse.json({
      success: true,
      student: {
        id: studentId,
        displayName: sanitizeInput(displayName),
        createdAt: new Date(),
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
