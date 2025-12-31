import { prisma } from '@stephen/database';
import { 
  FirestoreStudentId, 
  DriveFolderId, 
  TeacherId,
  NoteId,
  KeyConceptId,
  LoginAuditId,
  DriveFileId,
  TeacherEmail,
  TeacherName,
  StudentName,
  isFirestoreStudentId, 
  isDriveFolderId,
  Result,
  Ok,
  Err
} from './types';
import { InvalidStudentIdError, InvalidDriveFolderIdError } from './errors';
import type {
  Teacher,
  Student,
  Note,
  KeyConcept,
  StudentTag,
  UnlinkedFolder,
  LoginAudit,
  CreateTeacherInput,
  CreateStudentInput,
  CreateNoteInput,
  CreateKeyConceptInput,
  CreateStudentTagInput,
  CreateUnlinkedFolderInput,
  CreateLoginAuditInput,
  BatchOperation
} from './interfaces';

// Helper function to convert Date to Timestamp (ISO string)
export const toTimestamp = (date: Date): string => {
  return date.toISOString();
};

// Helper function to convert Timestamp to Date
export const toDate = (timestamp: string): Date => {
  return new Date(timestamp);
};

// Helper function to get current timestamp
export const now = (): string => {
  return new Date().toISOString();
};

// Helper function to get server timestamp (simulated)
export const serverTimestamp = (): Date => {
  return new Date();
};

// ============================================================================
// TEACHER OPERATIONS
// ============================================================================

export const getTeacher = async (id: TeacherId): Promise<Result<Teacher>> => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return Err(new Error(`Teacher not found: ${id}`));
    }
    const teacher: Teacher = {
      id: user.id as TeacherId,
      email: user.email as TeacherEmail,
      name: (user.name || '') as TeacherName,
      createdAt: user.createdAt.toISOString(),
      isActive: true,
      lastLoginAt: user.updatedAt.toISOString()
    };
    return Ok(teacher);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get teacher'));
  }
};

export const getTeacherByEmail = async (email: TeacherEmail): Promise<Result<Teacher>> => {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return Err(new Error(`Teacher not found with email: ${email}`));
    }
    const teacher: Teacher = {
      id: user.id as TeacherId,
      email: user.email as TeacherEmail,
      name: (user.name || '') as TeacherName,
      createdAt: user.createdAt.toISOString(),
      isActive: true,
      lastLoginAt: user.updatedAt.toISOString()
    };
    return Ok(teacher);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get teacher by email'));
  }
};

export const createTeacher = async (input: CreateTeacherInput): Promise<Result<TeacherId>> => {
  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: 'TUTOR'
      }
    });
    return Ok(user.id as TeacherId);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to create teacher'));
  }
};

export const updateTeacher = async (id: TeacherId, data: Partial<CreateTeacherInput>): Promise<Result<void>> => {
  try {
    await prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        name: data.name
      }
    });
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to update teacher'));
  }
};

// ============================================================================
// STUDENT OPERATIONS
// ============================================================================

export const getStudent = async (id: FirestoreStudentId): Promise<Result<Student>> => {
  try {
    const student = await prisma.student.findUnique({ 
      where: { id },
      include: { tags: true }
    });
    if (!student) {
      return Err(new Error(`Student not found: ${id}`));
    }
    // Map datalakePath to driveFolderId if driveFolderId is not available
    const studentWithDriveFolderId = {
      ...student,
      driveFolderId: (student as any).driveFolderId || student.datalakePath as DriveFolderId | undefined
    };
    return Ok(studentWithDriveFolderId as unknown as Student);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get student'));
  }
};

export const getStudentByName = async (displayName: StudentName): Promise<Result<Student>> => {
  try {
    const student = await prisma.student.findFirst({ 
      where: { name: displayName },
      include: { tags: true }
    });
    if (!student) {
      return Err(new Error(`Student not found with name: ${displayName}`));
    }
    return Ok(student as unknown as Student);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get student by name'));
  }
};

export const getStudentByDriveFolderId = async (driveFolderId: DriveFolderId): Promise<Result<Student>> => {
  try {
    const student = await prisma.student.findFirst({ 
      where: { 
        OR: [
          { datalakePath: driveFolderId },
          { datalakePath: { contains: driveFolderId } }
        ]
      },
      include: { tags: true }
    });
    if (!student) {
      return Err(new Error(`Student not found with Drive folder ID: ${driveFolderId}`));
    }
    // Map datalakePath to driveFolderId if driveFolderId is not available
    const studentWithDriveFolderId = {
      ...student,
      driveFolderId: (student as any).driveFolderId || student.datalakePath as DriveFolderId | undefined
    };
    return Ok(studentWithDriveFolderId as unknown as Student);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get student by Drive folder ID'));
  }
};

export const isFirestoreStudentIdValid = async (id: string): Promise<boolean> => {
  if (!isFirestoreStudentId(id)) {
    // Relaxed validation might accept CUIDs now, so we check DB
    // return false; 
    // Actually we should check DB regardless if regex matches
  }
  try {
    const count = await prisma.student.count({ where: { id } });
    return count > 0;
  } catch (error) {
    return false;
  }
};

export const getDriveFolderIdFromStudentId = async (studentId: FirestoreStudentId): Promise<Result<DriveFolderId | null>> => {
  try {
    const student = await prisma.student.findUnique({ 
      where: { id: studentId },
      select: { datalakePath: true } 
    });
    if (!student) {
      return Err(new Error(`Student not found: ${studentId}`));
    }
    return Ok((student.datalakePath as DriveFolderId) || null);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get Drive folder ID from student ID'));
  }
};

export const validateFirestoreStudentId = async (id: string): Promise<Result<FirestoreStudentId>> => {
  // Relaxed validation logic to check existence primarily
  try {
    const exists = await prisma.student.count({ where: { id } });
    if (exists > 0) return Ok(id as FirestoreStudentId);
    return Err(new InvalidStudentIdError(id, 'firestore'));
  } catch {
    return Err(new InvalidStudentIdError(id, 'firestore'));
  }
};

export const validateDriveFolderId = async (id: string): Promise<Result<DriveFolderId>> => {
  if (!isDriveFolderId(id)) {
    return Err(new InvalidDriveFolderIdError(id));
  }
  return Ok(id as DriveFolderId);
};

export const getAllStudents = async (): Promise<Result<Student[]>> => {
  try {
    const students = await prisma.student.findMany({
      include: { tags: true }
    });
    return Ok(students as unknown as Student[]);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get all students'));
  }
};

export const createStudent = async (input: CreateStudentInput & { pinHash?: string }, studentId?: string): Promise<Result<FirestoreStudentId>> => {
  try {
    const data: {
      name: string;
      email?: string | null;
      datalakePath?: string | null;
      pinHash?: string | null;
    } = {
      name: input.displayName,
      email: input.email,
      datalakePath: input.driveFolderId,
    };
    
    // Only add pinHash if provided (should be set by caller)
    if ('pinHash' in input && input.pinHash) {
      data.pinHash = input.pinHash;
    }

    if (studentId) {
      const student = await prisma.student.create({
        data: {
          id: studentId,
          ...data
        }
      });
      return Ok(student.id as FirestoreStudentId);
    } else {
      const student = await prisma.student.create({
        data
      });
      return Ok(student.id as FirestoreStudentId);
    }
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to create student'));
  }
};

export const updateStudent = async (id: FirestoreStudentId, data: Partial<CreateStudentInput> & { pinHash?: string }): Promise<Result<void>> => {
  try {
    const updateData: {
      name?: string;
      email?: string | null;
      datalakePath?: string | null;
      pinHash?: string | null;
    } = {
      name: data.displayName,
      email: data.email,
      datalakePath: data.driveFolderId,
    };
    
    if ('pinHash' in data && data.pinHash) {
        updateData.pinHash = data.pinHash;
    }

    // Remove undefined fields
    const cleanedData: Record<string, unknown> = {};
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanedData[key] = value;
      }
    });

    await prisma.student.update({
      where: { id },
      data: cleanedData
    });
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to update student'));
  }
};

export const deleteStudent = async (id: FirestoreStudentId): Promise<Result<void>> => {
  try {
    await prisma.student.delete({ where: { id } });
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to delete student'));
  }
};

// ============================================================================
// NOTE OPERATIONS
// ============================================================================

export const getNote = async (id: NoteId): Promise<Result<Note>> => {
  try {
    const note = await prisma.note.findUnique({ where: { id } });
    if (!note) return Err(new Error(`Note not found: ${id}`));
    return Ok(note as unknown as Note);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get note'));
  }
};

export const getStudentNotes = async (studentId: FirestoreStudentId): Promise<Result<Note[]>> => {
  try {
    const notes = await prisma.note.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' }
    });
    return Ok(notes as unknown as Note[]);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get student notes'));
  }
};

export const getAllNotes = async (): Promise<Result<Note[]>> => {
  try {
    const notes = await prisma.note.findMany({ orderBy: { createdAt: 'desc' } });
    return Ok(notes as unknown as Note[]);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get all notes'));
  }
};

export const createNote = async (input: CreateNoteInput): Promise<Result<NoteId>> => {
  try {
    const note = await prisma.note.create({
      data: {
        studentId: input.studentId,
        datalakePath: input.driveFileId,
        title: input.fileName,
        subject: input.subject?.toString(),
        topicGroup: input.topicGroup,
        topic: input.topic,
        level: input.level,
        schoolYear: input.schoolYear,
        keywords: input.keywords || [],
      }
    });
    return Ok(note.id as NoteId);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to create note'));
  }
};

export const updateNote = async (id: NoteId, data: Partial<CreateNoteInput>): Promise<Result<void>> => {
  try {
    const updateData: any = {};
    if (data.fileName) updateData.title = data.fileName;
    if (data.subject) updateData.subject = data.subject.toString();
    // ... other fields mapping
    
    await prisma.note.update({
      where: { id },
      data: updateData
    });
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to update note'));
  }
};

export const deleteNote = async (id: NoteId): Promise<Result<void>> => {
  try {
    await prisma.note.delete({ where: { id } });
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to delete note'));
  }
};

// ============================================================================
// KEY CONCEPT OPERATIONS
// ============================================================================

export const getKeyConceptsByDriveFileId = async (driveFileId: DriveFileId): Promise<Result<KeyConcept[]>> => {
  try {
    const concepts = await prisma.keyConcept.findMany({
      where: { driveFileId },
      orderBy: { orderIndex: 'asc' }
    });
    return Ok(concepts as unknown as KeyConcept[]);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get key concepts'));
  }
};

export const getAllKeyConcepts = async (): Promise<Result<KeyConcept[]>> => {
  try {
    const concepts = await prisma.keyConcept.findMany();
    return Ok(concepts as unknown as KeyConcept[]);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get all key concepts'));
  }
};

export const createKeyConcept = async (input: CreateKeyConceptInput): Promise<Result<KeyConceptId>> => {
  try {
    const concept = await prisma.keyConcept.create({
      data: {
        noteId: input.noteId,
        concept: input.concept,
        definition: input.definition,
        examples: input.examples || [],
        importance: input.importance,
      }
    });
    return Ok(concept.id as KeyConceptId);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to create key concept'));
  }
};

export const updateKeyConcept = async (id: KeyConceptId, data: Partial<CreateKeyConceptInput>): Promise<Result<void>> => {
  try {
    await prisma.keyConcept.update({
      where: { id },
      data: {
        concept: data.concept,
        definition: data.definition,
        examples: data.examples,
        importance: data.importance
      }
    });
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to update key concept'));
  }
};

export const deleteKeyConcept = async (id: KeyConceptId): Promise<Result<void>> => {
  try {
    await prisma.keyConcept.delete({ where: { id } });
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to delete key concept'));
  }
};

// ============================================================================
// STUDENT TAG OPERATIONS
// ============================================================================

export const getStudentTags = async (studentId: FirestoreStudentId): Promise<Result<StudentTag[]>> => {
  try {
    const tags = await prisma.studentTag.findMany({ where: { studentId } });
    return Ok(tags as unknown as StudentTag[]);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get student tags'));
  }
};

export const createStudentTag = async (input: CreateStudentTagInput): Promise<Result<string>> => {
  try {
    const tag = await prisma.studentTag.create({
      data: {
        studentId: input.studentId,
        tag: input.tag,
        color: input.color
      }
    });
    return Ok(tag.id);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to create student tag'));
  }
};

export const deleteStudentTag = async (id: string): Promise<Result<void>> => {
  try {
    await prisma.studentTag.delete({ where: { id } });
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to delete student tag'));
  }
};

// ============================================================================
// UNLINKED FOLDER OPERATIONS
// ============================================================================

export const getUnlinkedFolders = async (): Promise<Result<UnlinkedFolder[]>> => {
  try {
    const folders = await prisma.unlinkedFolder.findMany({ orderBy: { createdAt: 'desc' } });
    return Ok(folders as unknown as UnlinkedFolder[]);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get unlinked folders'));
  }
};

export const getUnlinkedFolderByDriveFolderId = async (driveFolderId: DriveFolderId): Promise<Result<UnlinkedFolder>> => {
  try {
    const folder = await prisma.unlinkedFolder.findFirst({ where: { driveFolderId } });
    if (!folder) return Err(new Error(`Unlinked folder not found: ${driveFolderId}`));
    return Ok(folder as unknown as UnlinkedFolder);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get unlinked folder'));
  }
};

export const createUnlinkedFolder = async (input: CreateUnlinkedFolderInput): Promise<Result<string>> => {
  try {
    const folder = await prisma.unlinkedFolder.create({
      data: {
        driveFolderId: input.driveFolderId,
        folderName: input.folderName,
        studentName: input.studentName,
        subject: input.subject?.toString()
      }
    });
    return Ok(folder.id);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to create unlinked folder'));
  }
};

export const updateUnlinkedFolder = async (id: string, data: Partial<CreateUnlinkedFolderInput>): Promise<Result<void>> => {
  try {
    await prisma.unlinkedFolder.update({
      where: { id },
      data: {
        folderName: data.folderName,
        studentName: data.studentName,
        subject: data.subject?.toString()
      }
    });
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to update unlinked folder'));
  }
};

export const deleteUnlinkedFolder = async (id: string): Promise<Result<void>> => {
  try {
    await prisma.unlinkedFolder.delete({ where: { id } });
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to delete unlinked folder'));
  }
};

// ============================================================================
// LOGIN AUDIT OPERATIONS
// ============================================================================

export const createLoginAudit = async (input: CreateLoginAuditInput): Promise<Result<LoginAuditId>> => {
  try {
    const audit = await prisma.loginAudit.create({
      data: {
        who: input.who,
        action: input.action,
        ipAddress: input.ip,
        userAgent: input.userAgent,
        success: input.metadata?.success !== false,
        metadata: input.metadata as any
      }
    });
    return Ok(audit.id as LoginAuditId);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to create login audit'));
  }
};

export const getLoginAudits = async (limit: number = 100): Promise<Result<LoginAudit[]>> => {
  try {
    const audits = await prisma.loginAudit.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return Ok(audits as unknown as LoginAudit[]);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get login audits'));
  }
};

export const getLoginAuditsByWho = async (who: string, limit: number = 50): Promise<Result<LoginAudit[]>> => {
  try {
    const audits = await prisma.loginAudit.findMany({
      where: { who },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return Ok(audits as unknown as LoginAudit[]);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get login audits by who'));
  }
};

// TRANSACTION HELPERS
export const runTransaction = async <T>(
  updateFunction: (transaction: any) => Promise<T>
): Promise<T> => {
  return await prisma.$transaction(async (tx) => {
    return updateFunction(tx);
  });
};

// BATCH OPERATIONS
export const batchWrite = async (operations: BatchOperation[]): Promise<void> => {
  await prisma.$transaction(async (tx: any) => {
    for (const op of operations) {
      if (op.collection === 'students') {
        if (op.type === 'create') await tx.student.create({ data: op.data });
        else if (op.type === 'update' && op.docId) await tx.student.update({ where: { id: op.docId }, data: op.data });
        else if (op.type === 'delete' && op.docId) await tx.student.delete({ where: { id: op.docId } });
      }
    }
  });
};

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

export const addTopicGroupToFiles = async (): Promise<Result<{ updated: number; errors: number }>> => {
  return Ok({ updated: 0, errors: 0 });
};
