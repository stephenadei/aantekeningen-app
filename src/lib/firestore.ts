import { db } from './firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// Type definitions for Firestore documents
export interface Teacher {
  id?: string;
  email: string;
  name: string | null;
  role: 'admin' | 'staff';
  otpSecret: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Student {
  id?: string;
  displayName: string;
  pinHash: string;
  pinUpdatedAt: Timestamp;
  driveFolderId: string | null;
  driveFolderName: string | null;
  subject: string | null;
  folderConfirmed: boolean;
  folderLinkedAt: Timestamp | null;
  folderConfirmedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Note {
  id?: string;
  studentId: string;
  contentMd: string;
  subject: string;
  level: string;
  topic: string;
  driveFileId: string | null;
  driveFileName: string | null;
  aiGenerated: boolean;
  aiConfirmed: boolean;
  manuallyEdited: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface KeyConcept {
  id?: string;
  driveFileId: string;
  term: string;
  explanation: string;
  example: string | null;
  orderIndex: number;
  isAiGenerated: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StudentTag {
  id?: string;
  studentId: string;
  key: string;
  value: string;
}

export interface UnlinkedFolder {
  id?: string;
  driveFolderId: string;
  folderName: string;
  subject: string;
  suggestedStudentId: string | null;
  createdAt: Timestamp;
}

export interface LoginAudit {
  id?: string;
  who: string;
  action: string;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  teacherId: string | null;
  studentId: string | null;
  createdAt: Timestamp;
}

// Helper function to convert Date to Timestamp
export const toTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// Helper function to convert Timestamp to Date
export const toDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
};

// Helper function to get current timestamp
export const now = (): Timestamp => {
  return Timestamp.now();
};

// Helper function to get server timestamp
export const serverTimestamp = (): FieldValue => {
  return FieldValue.serverTimestamp();
};

// TEACHER OPERATIONS
export const getTeacher = async (id: string): Promise<Teacher | null> => {
  const doc = await db.collection('teachers').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Teacher;
};

export const getTeacherByEmail = async (email: string): Promise<Teacher | null> => {
  const snapshot = await db.collection('teachers').where('email', '==', email).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Teacher;
};

export const createTeacher = async (data: Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const docRef = await db.collection('teachers').add({
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
};

export const updateTeacher = async (id: string, data: Partial<Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  await db.collection('teachers').doc(id).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
};

// STUDENT OPERATIONS
export const getStudent = async (id: string): Promise<Student | null> => {
  const doc = await db.collection('students').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Student;
};

export const getStudentByName = async (displayName: string): Promise<Student | null> => {
  const snapshot = await db.collection('students').where('displayName', '==', displayName).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Student;
};

export const getStudentByDriveFolderId = async (driveFolderId: string): Promise<Student | null> => {
  const snapshot = await db.collection('students').where('driveFolderId', '==', driveFolderId).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Student;
};

export const getAllStudents = async (): Promise<Student[]> => {
  if (!db) {
    console.error('❌ Firestore database not initialized');
    return [];
  }
  
  try {
    const snapshot = await db.collection('students').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  } catch (error) {
    console.error('Error getting all students:', error);
    return [];
  }
};

export const createStudent = async (data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const docRef = await db.collection('students').add({
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
};

export const updateStudent = async (id: string, data: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  await db.collection('students').doc(id).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteStudent = async (id: string): Promise<void> => {
  await db.collection('students').doc(id).delete();
};

// NOTE OPERATIONS
export const getNote = async (id: string): Promise<Note | null> => {
  const doc = await db.collection('notes').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Note;
};

export const getStudentNotes = async (studentId: string): Promise<Note[]> => {
  const snapshot = await db.collection('notes')
    .where('studentId', '==', studentId)
    .orderBy('createdAt', 'desc')
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
};

export const getAllNotes = async (): Promise<Note[]> => {
  const snapshot = await db.collection('notes').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
};

export const createNote = async (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const docRef = await db.collection('notes').add({
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
};

export const updateNote = async (id: string, data: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  await db.collection('notes').doc(id).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteNote = async (id: string): Promise<void> => {
  await db.collection('notes').doc(id).delete();
};

// KEY CONCEPT OPERATIONS
export const getKeyConceptsByDriveFileId = async (driveFileId: string): Promise<KeyConcept[]> => {
  const snapshot = await db.collection('keyConcepts')
    .where('driveFileId', '==', driveFileId)
    .orderBy('orderIndex', 'asc')
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KeyConcept));
};

export const getAllKeyConcepts = async (): Promise<KeyConcept[]> => {
  const snapshot = await db.collection('keyConcepts').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KeyConcept));
};

export const createKeyConcept = async (data: Omit<KeyConcept, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const docRef = await db.collection('keyConcepts').add({
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
};

export const updateKeyConcept = async (id: string, data: Partial<Omit<KeyConcept, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  await db.collection('keyConcepts').doc(id).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteKeyConcept = async (id: string): Promise<void> => {
  await db.collection('keyConcepts').doc(id).delete();
};

// STUDENT TAG OPERATIONS
export const getStudentTags = async (studentId: string): Promise<StudentTag[]> => {
  const snapshot = await db.collection('studentTags').where('studentId', '==', studentId).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentTag));
};

export const createStudentTag = async (data: Omit<StudentTag, 'id'>): Promise<string> => {
  const docRef = await db.collection('studentTags').add(data);
  return docRef.id;
};

export const deleteStudentTag = async (id: string): Promise<void> => {
  await db.collection('studentTags').doc(id).delete();
};

// UNLINKED FOLDER OPERATIONS
export const getUnlinkedFolders = async (): Promise<UnlinkedFolder[]> => {
  const snapshot = await db.collection('unlinkedFolders').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UnlinkedFolder));
};

export const getUnlinkedFolderByDriveFolderId = async (driveFolderId: string): Promise<UnlinkedFolder | null> => {
  const snapshot = await db.collection('unlinkedFolders').where('driveFolderId', '==', driveFolderId).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as UnlinkedFolder;
};

export const createUnlinkedFolder = async (data: Omit<UnlinkedFolder, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await db.collection('unlinkedFolders').add({
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateUnlinkedFolder = async (id: string, data: Partial<Omit<UnlinkedFolder, 'id' | 'createdAt'>>): Promise<void> => {
  await db.collection('unlinkedFolders').doc(id).update(data);
};

export const deleteUnlinkedFolder = async (id: string): Promise<void> => {
  await db.collection('unlinkedFolders').doc(id).delete();
};

// LOGIN AUDIT OPERATIONS
export const createLoginAudit = async (data: Omit<LoginAudit, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await db.collection('loginAudits').add({
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getLoginAudits = async (limit: number = 100): Promise<LoginAudit[]> => {
  const snapshot = await db.collection('loginAudits')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoginAudit));
};

export const getLoginAuditsByWho = async (who: string, limit: number = 50): Promise<LoginAudit[]> => {
  const snapshot = await db.collection('loginAudits')
    .where('who', '==', who)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoginAudit));
};

// TRANSACTION HELPERS
export const runTransaction = async <T>(
  updateFunction: (transaction: FirebaseFirestore.Transaction) => Promise<T>
): Promise<T> => {
  return await db.runTransaction(updateFunction);
};

// BATCH OPERATIONS
interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  collection: string;
  docId?: string;
  data?: Record<string, unknown>;
}

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

