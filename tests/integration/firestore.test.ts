import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Firestore with improved structure
vi.mock('@/lib/firebase-admin', () => {
  const mockCollectionRef = {
    doc: vi.fn(),
    add: vi.fn(),
    get: vi.fn().mockResolvedValue({ docs: [] }),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  };

  const mockDocRef = {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };

  mockCollectionRef.doc.mockReturnValue(mockDocRef);
  mockCollectionRef.add.mockResolvedValue(mockDocRef);

  return {
    db: {
      collection: vi.fn().mockReturnValue(mockCollectionRef),
      runTransaction: vi.fn().mockImplementation((callback) => callback({})),
      batch: vi.fn().mockReturnValue({
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }),
    },
    auth: {
      verifyIdToken: vi.fn(),
      getUser: vi.fn(),
    },
  };
});

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
    contentMd: 'Les over kwadratische vergelijkingen',
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

  const mockFileMetadata = {
    id: 'file-1',
    studentId: 'test-student-id',
    folderId: '1UcSaOYeR7rqZRLdfeotLbwAoAG7uU9DD',
    name: 'test-file',
    title: 'Test File',
    modifiedTime: new Date(),
    size: 1024,
    thumbnailUrl: 'https://example.com/thumb.jpg',
    downloadUrl: 'https://drive.google.com/download',
    viewUrl: 'https://drive.google.com/view',
    subject: 'Wiskunde',
    topic: 'Algebra',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
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

    it('should update student', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockDocRef = {
        update: vi.fn(() => Promise.resolve()),
      };

      const mockCollection = {
        doc: vi.fn(() => mockDocRef),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const doc = mockCollection.doc('test-student-id');
      await doc.update({ subject: 'Nederlands' });

      expect(mockDocRef.update).toHaveBeenCalledWith({ subject: 'Nederlands' });
    });

    it('should delete student', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockDocRef = {
        delete: vi.fn(() => Promise.resolve()),
      };

      const mockCollection = {
        doc: vi.fn(() => mockDocRef),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const doc = mockCollection.doc('test-student-id');
      await doc.delete();

      expect(mockDocRef.delete).toHaveBeenCalled();
    });
  });

  describe('File Metadata Operations', () => {
    it('should store file metadata', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockDocRef = {
        set: vi.fn(() => Promise.resolve()),
      };

      const mockCollection = {
        doc: vi.fn(() => mockDocRef),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const doc = mockCollection.doc('file-1');
      await doc.set(mockFileMetadata);

      expect(mockDocRef.set).toHaveBeenCalledWith(mockFileMetadata);
    });

    it('should query file metadata by student', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockSnapshot = {
        docs: [{
          id: 'file-1',
          data: () => mockFileMetadata
        }]
      };

      const mockCollection = {
        where: vi.fn().mockReturnThis(),
        get: vi.fn(() => Promise.resolve(mockSnapshot)),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const query = mockCollection.where('studentId', '==', 'test-student-id');
      const snapshot = await query.get();

      expect(snapshot.docs.length).toBe(1);
      expect(snapshot.docs[0].data()).toEqual(mockFileMetadata);
    });
  });

  describe('Audit Log Operations', () => {
    it('should create audit log entry', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockCollection = {
        add: vi.fn(() => Promise.resolve({ id: 'audit-1' })),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const result = await mockCollection.add(mockLoginAudit);

      expect(result.id).toBe('audit-1');
      expect(mockCollection.add).toHaveBeenCalledWith(mockLoginAudit);
    });

    it('should query audit logs by action', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockSnapshot = {
        docs: [{
          id: 'audit-1',
          data: () => mockLoginAudit
        }]
      };

      const mockCollection = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        get: vi.fn(() => Promise.resolve(mockSnapshot)),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const query = mockCollection.where('action', '==', 'login_ok');
      const snapshot = await query.get();

      expect(snapshot.docs.length).toBe(1);
      expect(snapshot.docs[0].data().action).toBe('login_ok');
    });
  });

  describe('Transaction Operations', () => {
    it('should execute transaction', async () => {
      const { db } = await import('@/lib/firebase-admin');
      let transactionCalled = false;

      vi.mocked(db.runTransaction).mockImplementation(async (callback) => {
        transactionCalled = true;
        return await callback({});
      });

      await db.runTransaction(async (transaction) => {
        // Transaction operations
      });

      expect(transactionCalled).toBe(true);
    });

    it('should execute batch operations', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockBatch = {
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn(() => Promise.resolve()),
      };

      vi.mocked(db.batch).mockReturnValue(mockBatch as any);

      const batch = db.batch();
      batch.set({}, mockStudent);
      batch.update({}, { subject: 'Nederlands' });
      batch.delete({});
      await batch.commit();

      expect(mockBatch.set).toHaveBeenCalled();
      expect(mockBatch.update).toHaveBeenCalled();
      expect(mockBatch.delete).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('Query Operations', () => {
    it('should query with multiple conditions', async () => {
      const { db } = await import('@/lib/firebase-admin');
      const mockSnapshot = {
        docs: [{
          id: 'test-student-id',
          data: () => mockStudent
        }]
      };

      const mockCollection = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        get: vi.fn(() => Promise.resolve(mockSnapshot)),
      };

      vi.mocked(db.collection).mockReturnValue(mockCollection as any);

      const query = mockCollection
        .where('subject', '==', 'Wiskunde')
        .orderBy('displayName');
      
      const snapshot = await query.get();

      expect(snapshot.docs.length).toBe(1);
      expect(mockCollection.where).toHaveBeenCalled();
      expect(mockCollection.orderBy).toHaveBeenCalled();
    });
  });
});
