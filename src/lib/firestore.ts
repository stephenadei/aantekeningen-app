import { db } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { 
  FirestoreStudentId, 
  DriveFolderId, 
  TeacherId,
  NoteId,
  KeyConceptId,
  LoginAuditId,
  DriveFileId,
  TeacherEmail,
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
  CreateLoginAuditInput
} from './interfaces';

// ============================================================================
// ENTITY INTERFACES WITH BRANDED TYPES
// ============================================================================
// All interfaces are now imported from ./interfaces to avoid duplication

// Student interface is now imported from ./interfaces

// Note interface is now imported from ./interfaces

// KeyConcept interface is now imported from ./interfaces

// StudentTag interface is now imported from ./interfaces

// UnlinkedFolder interface is now imported from ./interfaces

// LoginAudit interface is now imported from ./interfaces

// ============================================================================
// INPUT TYPES FOR CREATION
// ============================================================================

// CreateTeacherInput interface is now imported from ./interfaces

// CreateStudentInput interface is now imported from ./interfaces

// CreateNoteInput interface is now imported from ./interfaces

// CreateKeyConceptInput interface is now imported from ./interfaces

// CreateStudentTagInput interface is now imported from ./interfaces

// CreateUnlinkedFolderInput interface is now imported from ./interfaces

// CreateLoginAuditInput interface is now imported from ./interfaces

// Helper function to convert Date to Timestamp
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

// Helper function to get server timestamp
export const serverTimestamp = (): FieldValue => {
  return FieldValue.serverTimestamp();
};

// ============================================================================
// TEACHER OPERATIONS
// ============================================================================

export const getTeacher = async (id: TeacherId): Promise<Result<Teacher>> => {
  try {
    const doc = await db.collection('teachers').doc(id).get();
    if (!doc.exists) {
      return Err(new Error(`Teacher not found: ${id}`));
    }
    return Ok({ id: doc.id as TeacherId, ...doc.data() } as Teacher);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get teacher'));
  }
};

export const getTeacherByEmail = async (email: TeacherEmail): Promise<Result<Teacher>> => {
  try {
    const snapshot = await db.collection('teachers').where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      return Err(new Error(`Teacher not found with email: ${email}`));
    }
    const doc = snapshot.docs[0];
    return Ok({ id: doc.id as TeacherId, ...doc.data() } as Teacher);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get teacher by email'));
  }
};

export const createTeacher = async (input: CreateTeacherInput): Promise<Result<TeacherId>> => {
  try {
    const now = new Date().toISOString();
    const docRef = await db.collection('teachers').add({
      ...input,
      createdAt: now,
      updatedAt: now,
    });
    return Ok(docRef.id as TeacherId);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to create teacher'));
  }
};

export const updateTeacher = async (id: TeacherId, data: Partial<CreateTeacherInput>): Promise<Result<void>> => {
  try {
    await db.collection('teachers').doc(id).update({
      ...data,
      updatedAt: new Date().toISOString(),
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
    const doc = await db.collection('students').doc(id).get();
    if (!doc.exists) {
      return Err(new Error(`Student not found: ${id}`));
    }
    return Ok({ id: doc.id as FirestoreStudentId, ...doc.data() } as Student);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get student'));
  }
};

export const getStudentByName = async (displayName: StudentName): Promise<Result<Student>> => {
  try {
    const snapshot = await db.collection('students').where('displayName', '==', displayName).limit(1).get();
    if (snapshot.empty) {
      return Err(new Error(`Student not found with name: ${displayName}`));
    }
    const doc = snapshot.docs[0];
    return Ok({ id: doc.id as FirestoreStudentId, ...doc.data() } as Student);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get student by name'));
  }
};

export const getStudentByDriveFolderId = async (driveFolderId: DriveFolderId): Promise<Result<Student>> => {
  try {
    const snapshot = await db.collection('students').where('driveFolderId', '==', driveFolderId).limit(1).get();
    if (snapshot.empty) {
      return Err(new Error(`Student not found with Drive folder ID: ${driveFolderId}`));
    }
    const doc = snapshot.docs[0];
    return Ok({ id: doc.id as FirestoreStudentId, ...doc.data() } as Student);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get student by Drive folder ID'));
  }
};

/**
 * Check if a string is a valid Firestore student ID
 */
export const isFirestoreStudentIdValid = async (id: string): Promise<boolean> => {
  if (!isFirestoreStudentId(id)) {
    return false;
  }
  
  try {
    const doc = await db.collection('students').doc(id).get();
    return doc.exists;
  } catch (error) {
    console.error('Error checking Firestore student ID:', error);
    return false;
  }
};

/**
 * Get Drive folder ID from a Firestore student ID
 */
export const getDriveFolderIdFromStudentId = async (studentId: FirestoreStudentId): Promise<Result<DriveFolderId | null>> => {
  try {
    const studentResult = await getStudent(studentId);
    if (!studentResult.success) {
      return Err(studentResult.error);
    }
    return Ok(studentResult.data.driveFolderId || null);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get Drive folder ID from student ID'));
  }
};

/**
 * Validate that a student ID exists in Firestore
 */
export const validateFirestoreStudentId = async (id: string): Promise<Result<FirestoreStudentId>> => {
  if (!isFirestoreStudentId(id)) {
    return Err(new InvalidStudentIdError(id, 'firestore'));
  }
  
  const exists = await isFirestoreStudentIdValid(id);
  if (!exists) {
    return Err(new InvalidStudentIdError(id, 'firestore'));
  }
  
  return Ok(id as FirestoreStudentId);
};

/**
 * Validate that a Drive folder ID exists and is accessible
 */
export const validateDriveFolderId = async (id: string): Promise<Result<DriveFolderId>> => {
  if (!isDriveFolderId(id)) {
    return Err(new InvalidDriveFolderIdError(id));
  }
  
  // Note: We can't easily validate Drive folder IDs without making API calls
  // This is a basic format validation - actual validation happens in the API routes
  return Ok(id as DriveFolderId);
};

export const getAllStudents = async (): Promise<Result<Student[]>> => {
  if (!db) {
    return Err(new Error('Firestore database not initialized'));
  }
  
  try {
    const snapshot = await db.collection('students').get();
    const students = snapshot.docs.map(doc => ({ id: doc.id as FirestoreStudentId, ...doc.data() } as Student));
    return Ok(students);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get all students'));
  }
};

export const createStudent = async (input: CreateStudentInput): Promise<Result<FirestoreStudentId>> => {
  try {
    const now = new Date().toISOString();
    const docRef = await db.collection('students').add({
      ...input,
      pinUpdatedAt: now,
      folderConfirmed: false,
      folderLinkedAt: null,
      folderConfirmedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    return Ok(docRef.id as FirestoreStudentId);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to create student'));
  }
};

export const updateStudent = async (id: FirestoreStudentId, data: Partial<CreateStudentInput>): Promise<Result<void>> => {
  try {
    await db.collection('students').doc(id).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to update student'));
  }
};

export const deleteStudent = async (id: FirestoreStudentId): Promise<Result<void>> => {
  try {
    await db.collection('students').doc(id).delete();
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
    const doc = await db.collection('notes').doc(id).get();
    if (!doc.exists) {
      return Err(new Error(`Note not found: ${id}`));
    }
    return Ok({ id: doc.id as NoteId, ...doc.data() } as Note);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get note'));
  }
};

export const getStudentNotes = async (studentId: FirestoreStudentId): Promise<Result<Note[]>> => {
  try {
    const snapshot = await db.collection('notes')
      .where('studentId', '==', studentId)
      .orderBy('createdAt', 'desc')
      .get();
    const notes = snapshot.docs.map(doc => ({ id: doc.id as NoteId, ...doc.data() } as Note));
    return Ok(notes);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get student notes'));
  }
};

export const getAllNotes = async (): Promise<Result<Note[]>> => {
  try {
    const snapshot = await db.collection('notes').orderBy('createdAt', 'desc').get();
    const notes = snapshot.docs.map(doc => ({ id: doc.id as NoteId, ...doc.data() } as Note));
    return Ok(notes);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get all notes'));
  }
};

export const createNote = async (input: CreateNoteInput): Promise<Result<NoteId>> => {
  try {
    const now = new Date().toISOString();
    const docRef = await db.collection('notes').add({
      ...input,
      createdAt: now,
      updatedAt: now,
    });
    return Ok(docRef.id as NoteId);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to create note'));
  }
};

export const updateNote = async (id: NoteId, data: Partial<CreateNoteInput>): Promise<Result<void>> => {
  try {
    await db.collection('notes').doc(id).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to update note'));
  }
};

export const deleteNote = async (id: NoteId): Promise<Result<void>> => {
  try {
    await db.collection('notes').doc(id).delete();
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
    const snapshot = await db.collection('keyConcepts')
      .where('driveFileId', '==', driveFileId)
      .orderBy('orderIndex', 'asc')
      .get();
    const concepts = snapshot.docs.map(doc => ({ id: doc.id as KeyConceptId, ...doc.data() } as KeyConcept));
    return Ok(concepts);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get key concepts by Drive file ID'));
  }
};

export const getAllKeyConcepts = async (): Promise<Result<KeyConcept[]>> => {
  try {
    const snapshot = await db.collection('keyConcepts').get();
    const concepts = snapshot.docs.map(doc => ({ id: doc.id as KeyConceptId, ...doc.data() } as KeyConcept));
    return Ok(concepts);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get all key concepts'));
  }
};

export const createKeyConcept = async (input: CreateKeyConceptInput): Promise<Result<KeyConceptId>> => {
  try {
    const now = new Date().toISOString();
    const docRef = await db.collection('keyConcepts').add({
      ...input,
      createdAt: now,
      updatedAt: now,
    });
    return Ok(docRef.id as KeyConceptId);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to create key concept'));
  }
};

export const updateKeyConcept = async (id: KeyConceptId, data: Partial<CreateKeyConceptInput>): Promise<Result<void>> => {
  try {
    await db.collection('keyConcepts').doc(id).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to update key concept'));
  }
};

export const deleteKeyConcept = async (id: KeyConceptId): Promise<Result<void>> => {
  try {
    await db.collection('keyConcepts').doc(id).delete();
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
    const snapshot = await db.collection('studentTags').where('studentId', '==', studentId).get();
    const tags = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentTag));
    return Ok(tags);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get student tags'));
  }
};

export const createStudentTag = async (input: CreateStudentTagInput): Promise<Result<string>> => {
  try {
    const docRef = await db.collection('studentTags').add(input);
    return Ok(docRef.id);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to create student tag'));
  }
};

export const deleteStudentTag = async (id: string): Promise<Result<void>> => {
  try {
    await db.collection('studentTags').doc(id).delete();
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
    const snapshot = await db.collection('unlinkedFolders').orderBy('createdAt', 'desc').get();
    const folders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UnlinkedFolder));
    return Ok(folders);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get unlinked folders'));
  }
};

export const getUnlinkedFolderByDriveFolderId = async (driveFolderId: DriveFolderId): Promise<Result<UnlinkedFolder>> => {
  try {
    const snapshot = await db.collection('unlinkedFolders').where('driveFolderId', '==', driveFolderId).limit(1).get();
    if (snapshot.empty) {
      return Err(new Error(`Unlinked folder not found with Drive folder ID: ${driveFolderId}`));
    }
    const doc = snapshot.docs[0];
    return Ok({ id: doc.id, ...doc.data() } as UnlinkedFolder);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get unlinked folder by Drive folder ID'));
  }
};

export const createUnlinkedFolder = async (input: CreateUnlinkedFolderInput): Promise<Result<string>> => {
  try {
    const docRef = await db.collection('unlinkedFolders').add({
      ...input,
      createdAt: new Date().toISOString(),
    });
    return Ok(docRef.id);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to create unlinked folder'));
  }
};

export const updateUnlinkedFolder = async (id: string, data: Partial<CreateUnlinkedFolderInput>): Promise<Result<void>> => {
  try {
    await db.collection('unlinkedFolders').doc(id).update(data);
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to update unlinked folder'));
  }
};

export const deleteUnlinkedFolder = async (id: string): Promise<Result<void>> => {
  try {
    await db.collection('unlinkedFolders').doc(id).delete();
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
    const docRef = await db.collection('loginAudits').add({
      ...input,
      createdAt: new Date().toISOString(),
    });
    return Ok(docRef.id as LoginAuditId);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to create login audit'));
  }
};

export const getLoginAudits = async (limit: number = 100): Promise<Result<LoginAudit[]>> => {
  try {
    const snapshot = await db.collection('loginAudits')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    const audits = snapshot.docs.map(doc => ({ id: doc.id as LoginAuditId, ...doc.data() } as LoginAudit));
    return Ok(audits);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get login audits'));
  }
};

export const getLoginAuditsByWho = async (who: string, limit: number = 50): Promise<Result<LoginAudit[]>> => {
  try {
    const snapshot = await db.collection('loginAudits')
      .where('who', '==', who)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    const audits = snapshot.docs.map(doc => ({ id: doc.id as LoginAuditId, ...doc.data() } as LoginAudit));
    return Ok(audits);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get login audits by who'));
  }
};

// TRANSACTION HELPERS
export const runTransaction = async <T>(
  updateFunction: (transaction: FirebaseFirestore.Transaction) => Promise<T>
): Promise<T> => {
  return await db.runTransaction(updateFunction);
};

// BATCH OPERATIONS
import type { BatchOperation } from './interfaces';

export const batchWrite = async (operations: BatchOperation[]): Promise<void> => {
  const batch = db.batch();
  
  for (const op of operations) {
    const docRef = op.docId ? db.collection(op.collection).doc(op.docId) : db.collection(op.collection).doc();
    
    switch (op.type) {
      case 'create':
        batch.set(docRef, op.data);
        break;
      case 'update':
        batch.update(docRef, op.data || {});
        break;
      case 'delete':
        batch.delete(docRef);
        break;
    }
  }
  
  await batch.commit();
};

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Add topic group to existing files (migration helper)
 * This function can be used to backfill topicGroup field for existing files
 */
export const addTopicGroupToFiles = async (): Promise<Result<{ updated: number; errors: number }>> => {
  try {
    console.log('🔄 Starting topic group migration...');
    
    // Get all students
    const studentsResult = await getAllStudents();
    if (studentsResult.success === false) {
      return Err(new Error('Failed to get students: ' + studentsResult.error.message));
    }
    
    const students = studentsResult.data;
    let updated = 0;
    let errors = 0;
    
    for (const student of students) {
      try {
        // Get all notes for this student
        const notesSnapshot = await db
          .collection('notes')
          .where('studentId', '==', student.id)
          .get();
        
        const batch = db.batch();
        let batchCount = 0;
        
        for (const doc of notesSnapshot.docs) {
          const note = doc.data() as Note;
          
          // Only update if topicGroup is missing
          if (!note.topicGroup) {
            // Try to infer topic group from subject and topic
            // This is a simple heuristic - in practice, you might want more sophisticated logic
            let inferredTopicGroup: string | undefined;
            
            if (note.subject && note.topic) {
              // Simple mapping based on common patterns
              const subject = note.subject.toLowerCase();
              const topic = note.topic.toLowerCase();
              
              if (subject.includes('wiskunde')) {
                if (topic.includes('breuk') || topic.includes('reken')) {
                  inferredTopicGroup = 'rekenen-getallen';
                } else if (topic.includes('algebra') || topic.includes('vergelijking')) {
                  inferredTopicGroup = 'algebra-vergelijkingen';
                } else if (topic.includes('functie') || topic.includes('grafiek')) {
                  inferredTopicGroup = 'functies-grafieken';
                } else if (topic.includes('meetkunde') || topic.includes('pythagoras')) {
                  inferredTopicGroup = 'meetkunde-ruimtelijk';
                }
              } else if (subject.includes('natuurkunde')) {
                if (topic.includes('mechanica') || topic.includes('kracht')) {
                  inferredTopicGroup = 'mechanica';
                } else if (topic.includes('elektriciteit') || topic.includes('stroom')) {
                  inferredTopicGroup = 'elektriciteit-magnetisme';
                }
              }
              // Add more mappings as needed
            }
            
            if (inferredTopicGroup) {
              batch.update(doc.ref, { topicGroup: inferredTopicGroup });
              batchCount++;
            }
          }
          
          // Commit batch every 500 operations
          if (batchCount >= 500) {
            await batch.commit();
            updated += batchCount;
            batchCount = 0;
          }
        }
        
        // Commit remaining operations
        if (batchCount > 0) {
          await batch.commit();
          updated += batchCount;
        }
        
        console.log(`✅ Updated ${updated} files for student ${student.displayName}`);
        
      } catch (error) {
        console.error(`❌ Error updating files for student ${student.displayName}:`, error);
        errors++;
      }
    }
    
    console.log(`🎉 Migration completed: ${updated} files updated, ${errors} errors`);
    return Ok({ updated, errors });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return Err(error instanceof Error ? error : new Error('Migration failed'));
  }
};

