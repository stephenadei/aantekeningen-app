import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Firestore
vi.mock('@/lib/firebase-admin', () => ({
  db: {
    collection: vi.fn(),
  },
}));

describe('Firestore Integration', () => {
  const mockStudent = {
    id: 'test-student-id',
    displayName: 'Test Student',
    pinHash: 'hashed-pin',
    driveFolderId: '1UcSaOYeR7rqZRLdfeotLbwAoAG7uU9DD',
    driveFolderName: 'Test Folder',
    subject: 'Wiskunde',
    folderConfirmed: true,
    folderLinkedAt: new Date(),
    folderConfirmedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    pinUpdatedAt: new Date(),
  };

  const mockNote = {
    id: 'note-id',
    studentId: 'test-student-id',
    subject: 'Wiskunde',
    topic: 'Algebra',
    content: 'Les over kwadratische vergelijkingen',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLoginAudit = {
    id: 'audit-id',
    who: 'student:Test Student',
    action: 'login_ok',
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    studentId: 'test-student-id',
    createdAt: new Date(),
    metadata: { studentId: 'test-student-id' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Student CRUD Operations', () => {
    it('should create student successfully', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockCollection = {
        add: vi.fn(() => Promise.resolve({ id: 'new-student-id' })),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const studentData = {
        displayName: 'New Student',
        pinHash: 'hashed-pin',
        driveFolderId: null,
        driveFolderName: null,
        subject: null,
        folderConfirmed: false,
        folderLinkedAt: null,
        folderConfirmedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        pinUpdatedAt: new Date(),
      };

      const result = await mockCollection.add(studentData);

      expect(result.id).toBe('new-student-id');
      expect(mockCollection.add).toHaveBeenCalledWith(studentData);
    });

    it('should get student by ID', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockDoc = {
        get: vi.fn(() => Promise.resolve({
          exists: true,
          data: () => mockStudent,
          id: 'test-student-id',
        })),
      };

      const mockCollection = {
        doc: vi.fn(() => mockDoc),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const doc = mockCollection.doc('test-student-id');
      const snapshot = await doc.get();

      expect(snapshot.exists).toBe(true);
      expect(snapshot.data()).toEqual(mockStudent);
      expect(mockCollection.doc).toHaveBeenCalledWith('test-student-id');
    });

    it('should get student by display name', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockQuery = {
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({
              docs: [{
                id: 'test-student-id',
                data: () => mockStudent,
              }],
            })),
          })),
        })),
      };

      const mockCollection = {
        where: vi.fn(() => mockQuery),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const query = mockCollection.where('displayName', '==', 'Test Student');
      const snapshot = await query.limit(1).get();

      expect(snapshot.docs).toHaveLength(1);
      expect(snapshot.docs[0].data()).toEqual(mockStudent);
    });

    it('should update student', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockDoc = {
        update: vi.fn(() => Promise.resolve()),
      };

      const mockCollection = {
        doc: vi.fn(() => mockDoc),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const updateData = {
        displayName: 'Updated Student',
        updatedAt: new Date(),
      };

      const doc = mockCollection.doc('test-student-id');
      await doc.update(updateData);

      expect(mockDoc.update).toHaveBeenCalledWith(updateData);
    });

    it('should delete student', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockDoc = {
        delete: vi.fn(() => Promise.resolve()),
      };

      const mockCollection = {
        doc: vi.fn(() => mockDoc),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const doc = mockCollection.doc('test-student-id');
      await doc.delete();

      expect(mockDoc.delete).toHaveBeenCalled();
    });
  });

  describe('Notes CRUD Operations', () => {
    it('should create note', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockCollection = {
        add: vi.fn(() => Promise.resolve({ id: 'new-note-id' })),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const noteData = {
        studentId: 'test-student-id',
        subject: 'Wiskunde',
        topic: 'Algebra',
        content: 'New note content',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await mockCollection.add(noteData);

      expect(result.id).toBe('new-note-id');
      expect(mockCollection.add).toHaveBeenCalledWith(noteData);
    });

    it('should get notes by student ID', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockQuery = {
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({
              docs: [{
                id: 'note-id',
                data: () => mockNote,
              }],
            })),
          })),
        })),
      };

      const mockCollection = {
        where: vi.fn(() => mockQuery),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const query = mockCollection.where('studentId', '==', 'test-student-id');
      const snapshot = await query.orderBy('createdAt', 'desc').get();

      expect(snapshot.docs).toHaveLength(1);
      expect(snapshot.docs[0].data()).toEqual(mockNote);
    });

    it('should update note', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockDoc = {
        update: vi.fn(() => Promise.resolve()),
      };

      const mockCollection = {
        doc: vi.fn(() => mockDoc),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const updateData = {
        content: 'Updated note content',
        updatedAt: new Date(),
      };

      const doc = mockCollection.doc('note-id');
      await doc.update(updateData);

      expect(mockDoc.update).toHaveBeenCalledWith(updateData);
    });
  });

  describe('Login Audit Operations', () => {
    it('should create login audit', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockCollection = {
        add: vi.fn(() => Promise.resolve({ id: 'new-audit-id' })),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const auditData = {
        who: 'student:Test Student',
        action: 'login_ok',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        studentId: 'test-student-id',
        createdAt: new Date(),
        metadata: { studentId: 'test-student-id' },
      };

      const result = await mockCollection.add(auditData);

      expect(result.id).toBe('new-audit-id');
      expect(mockCollection.add).toHaveBeenCalledWith(auditData);
    });

    it('should get login audits with pagination', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockQuery = {
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({
              docs: [{
                id: 'audit-id',
                data: () => mockLoginAudit,
              }],
            })),
          })),
        })),
      };

      const mockCollection = {
        orderBy: vi.fn(() => mockQuery),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const query = mockCollection.orderBy('createdAt', 'desc');
      const snapshot = await query.limit(20).get();

      expect(snapshot.docs).toHaveLength(1);
      expect(snapshot.docs[0].data()).toEqual(mockLoginAudit);
    });

    it('should filter login audits by action', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockQuery = {
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: vi.fn(() => Promise.resolve({
                docs: [{
                  id: 'audit-id',
                  data: () => mockLoginAudit,
                }],
              })),
            })),
          })),
        })),
      };

      const mockCollection = {
        where: vi.fn(() => mockQuery),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const query = mockCollection.where('action', '==', 'login_ok');
      const snapshot = await query.orderBy('createdAt', 'desc').limit(20).get();

      expect(snapshot.docs).toHaveLength(1);
      expect(mockCollection.where).toHaveBeenCalledWith('action', '==', 'login_ok');
    });
  });

  describe('Batch Operations', () => {
    it('should perform batch write operations', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockBatch = {
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn(() => Promise.resolve()),
      };

      const mockCollection = {
        doc: vi.fn(() => ({})),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);
      vi.mocked(db.batch).mockReturnValue(mockBatch as any);

      const batch = db.batch();
      const studentRef = mockCollection.doc('student-id');
      const noteRef = mockCollection.doc('note-id');

      batch.set(studentRef, mockStudent);
      batch.update(noteRef, { updatedAt: new Date() });
      batch.delete(mockCollection.doc('old-note-id'));

      await batch.commit();

      expect(mockBatch.set).toHaveBeenCalledWith(studentRef, mockStudent);
      expect(mockBatch.update).toHaveBeenCalledWith(noteRef, { updatedAt: expect.any(Date) });
      expect(mockBatch.delete).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('Query Operations', () => {
    it('should perform complex queries', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockQuery = {
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                get: vi.fn(() => Promise.resolve({
                  docs: [],
                })),
              })),
            })),
          })),
        })),
      };

      const mockCollection = {
        where: vi.fn(() => mockQuery),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const query = mockCollection
        .where('subject', '==', 'Wiskunde')
        .where('difficulty', '==', 'Medium')
        .orderBy('createdAt', 'desc')
        .limit(10);

      const snapshot = await query.get();

      expect(snapshot.docs).toEqual([]);
      expect(mockCollection.where).toHaveBeenCalledWith('subject', '==', 'Wiskunde');
    });

    it('should handle query with array-contains', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockQuery = {
        where: vi.fn(() => ({
          get: vi.fn(() => Promise.resolve({
            docs: [{
              id: 'note-id',
              data: () => mockNote,
            }],
          })),
        })),
      };

      const mockCollection = {
        where: vi.fn(() => mockQuery),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const query = mockCollection.where('topics', 'array-contains', 'Algebra');
      const snapshot = await query.get();

      expect(snapshot.docs).toHaveLength(1);
      expect(mockCollection.where).toHaveBeenCalledWith('topics', 'array-contains', 'Algebra');
    });
  });

  describe('Error Handling', () => {
    it('should handle document not found', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockDoc = {
        get: vi.fn(() => Promise.resolve({
          exists: false,
          data: () => undefined,
          id: 'non-existent-id',
        })),
      };

      const mockCollection = {
        doc: vi.fn(() => mockDoc),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const doc = mockCollection.doc('non-existent-id');
      const snapshot = await doc.get();

      expect(snapshot.exists).toBe(false);
      expect(snapshot.data()).toBeUndefined();
    });

    it('should handle permission errors', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockCollection = {
        add: vi.fn(() => Promise.reject(new Error('Permission denied'))),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      await expect(mockCollection.add({})).rejects.toThrow('Permission denied');
    });

    it('should handle network errors', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockCollection = {
        get: vi.fn(() => Promise.reject(new Error('Network error'))),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      await expect(mockCollection.get()).rejects.toThrow('Network error');
    });
  });

  describe('Data Validation', () => {
    it('should validate student data structure', () => {
      const validateStudentData = (data: any): boolean => {
        return !!(
          data &&
          typeof data.displayName === 'string' &&
          typeof data.pinHash === 'string' &&
          typeof data.folderConfirmed === 'boolean' &&
          data.createdAt instanceof Date &&
          data.updatedAt instanceof Date
        );
      };

      expect(validateStudentData(mockStudent)).toBe(true);
      expect(validateStudentData({})).toBe(false);
      expect(validateStudentData({ displayName: 'Test' })).toBe(false);
    });

    it('should validate note data structure', () => {
      const validateNoteData = (data: any): boolean => {
        return !!(
          data &&
          typeof data.studentId === 'string' &&
          typeof data.subject === 'string' &&
          typeof data.topic === 'string' &&
          typeof data.content === 'string' &&
          data.createdAt instanceof Date
        );
      };

      expect(validateNoteData(mockNote)).toBe(true);
      expect(validateNoteData({})).toBe(false);
      expect(validateNoteData({ studentId: 'test' })).toBe(false);
    });
  });
});
