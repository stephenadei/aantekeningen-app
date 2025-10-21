import { describe, it, expect, vi } from 'vitest';

// Mock Firebase Admin before importing
vi.mock('@/lib/firebase-admin', () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn()
      })),
      where: vi.fn(() => ({
        get: vi.fn(),
        limit: vi.fn(() => ({
          get: vi.fn()
        }))
      })),
      add: vi.fn()
    }))
  }
}));

import type { 
  FileInfo, 
  FilterState, 
  DriveStudent, 
  StudentOverview, 
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
  FirebaseUser, 
  AuthResult, 
  DriveCache, 
  FileMetadata, 
  RateLimitOptions, 
  SchoolYearInfo, 
  StudentApiParams 
} from '@/lib/interfaces';

describe('Interface Consistency', () => {
  describe('FileInfo Interface', () => {
    it('should have all required properties', () => {
      const fileInfo: FileInfo = {
        id: 'test-file-id',
        name: 'test-file.pdf',
        title: 'Test File',
        url: 'https://example.com/file',
        downloadUrl: 'https://example.com/download',
        viewUrl: 'https://example.com/view',
        thumbnailUrl: 'https://example.com/thumb',
        modifiedTime: '2024-01-15T10:30:00Z',
        size: 1024,
        subject: 'wiskunde-a',
        topicGroup: 'algebra-vergelijkingen',
        topic: 'kwadratische-vergelijkingen',
        level: 'vwo-5',
        schoolYear: '2023-2024',
        keywords: ['algebra', 'vergelijkingen'],
        summary: 'Test summary',
        summaryEn: 'Test summary in English',
        topicEn: 'quadratic-equations',
        keywordsEn: ['algebra', 'equations']
      };

      expect(fileInfo.id).toBe('test-file-id');
      expect(fileInfo.name).toBe('test-file.pdf');
      expect(fileInfo.topicGroup).toBe('algebra-vergelijkingen');
    });

    it('should allow optional properties to be undefined', () => {
      const minimalFileInfo: FileInfo = {
        id: 'test-file-id',
        name: 'test-file.pdf',
        title: 'Test File',
        url: 'https://example.com/file',
        downloadUrl: 'https://example.com/download',
        viewUrl: 'https://example.com/view',
        thumbnailUrl: 'https://example.com/thumb',
        modifiedTime: '2024-01-15T10:30:00Z',
        size: 1024
      };

      expect(minimalFileInfo.subject).toBeUndefined();
      expect(minimalFileInfo.topicGroup).toBeUndefined();
      expect(minimalFileInfo.topic).toBeUndefined();
    });
  });

  describe('FilterState Interface', () => {
    it('should have all required properties with correct types', () => {
      const filterState: FilterState = {
        subjects: ['wiskunde-a', 'natuurkunde'],
        topicGroups: ['algebra-vergelijkingen', 'mechanica'],
        topics: ['kwadratische-vergelijkingen', 'krachten'],
        levels: ['vwo-5', 'vwo-6'],
        schoolYears: ['2023-2024', '2024-2025'],
        keywords: ['algebra', 'fysica'],
        dateRange: { type: 'all' },
        sortBy: 'date',
        sortOrder: 'desc',
        searchText: 'test search'
      };

      expect(Array.isArray(filterState.subjects)).toBe(true);
      expect(Array.isArray(filterState.topicGroups)).toBe(true);
      expect(filterState.sortBy).toBe('date');
      expect(filterState.sortOrder).toBe('desc');
    });

    it('should handle different date range types', () => {
      const dateRangeTypes: FilterState['dateRange'][] = [
        { type: 'all' },
        { type: 'days', value: 7 },
        { type: 'weeks', value: 2 },
        { type: 'months', value: 3 },
        { type: 'years', value: 1 },
        { type: 'custom' }
      ];

      dateRangeTypes.forEach(dateRange => {
        expect(dateRange.type).toBeDefined();
        if (dateRange.value !== undefined) {
          expect(typeof dateRange.value).toBe('number');
        }
      });
    });
  });

  describe('FileMetadata Interface', () => {
    it('should have all required properties with string timestamps', () => {
      const fileMetadata: FileMetadata = {
        id: 'test-file-id',
        studentId: 'test-student-id',
        folderId: 'test-folder-id',
        name: 'test-file.pdf',
        title: 'Test File',
        modifiedTime: '2024-01-15T10:30:00Z',
        size: 1024,
        thumbnailUrl: 'https://example.com/thumb',
        downloadUrl: 'https://example.com/download',
        viewUrl: 'https://example.com/view',
        subject: 'wiskunde-a',
        topic: 'kwadratische-vergelijkingen',
        level: 'vwo-5',
        schoolYear: '2023-2024',
        keywords: ['algebra'],
        summary: 'Test summary',
        summaryEn: 'Test summary in English',
        topicEn: 'quadratic-equations',
        keywordsEn: ['algebra', 'equations'],
        aiAnalyzedAt: '2024-01-15T10:30:00Z',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        checksum: 'abc123'
      };

      expect(typeof fileMetadata.modifiedTime).toBe('string');
      expect(typeof fileMetadata.aiAnalyzedAt).toBe('string');
      expect(typeof fileMetadata.createdAt).toBe('string');
      expect(typeof fileMetadata.updatedAt).toBe('string');
    });
  });

  describe('DriveCache Interface', () => {
    it('should handle both string and Date timestamps', () => {
      const cacheWithString: DriveCache = {
        id: 'test-cache-id',
        type: 'student-files',
        data: { files: [] },
        createdAt: '2024-01-15T10:30:00Z',
        expiresAt: '2024-01-16T10:30:00Z',
        studentId: 'test-student-id',
        folderId: 'test-folder-id',
        lastModified: '2024-01-15T10:30:00Z'
      };

      const cacheWithDate: DriveCache = {
        id: 'test-cache-id',
        type: 'student-files',
        data: { files: [] },
        createdAt: new Date('2024-01-15T10:30:00Z'),
        expiresAt: new Date('2024-01-16T10:30:00Z'),
        studentId: 'test-student-id',
        folderId: 'test-folder-id',
        lastModified: new Date('2024-01-15T10:30:00Z')
      };

      expect(cacheWithString.createdAt).toBe('2024-01-15T10:30:00Z');
      expect(cacheWithDate.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('FirebaseUser Interface', () => {
    it('should have all required properties', () => {
      const firebaseUser: FirebaseUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        name: 'Test User',
        displayName: 'Test User Display',
        picture: 'https://example.com/picture.jpg',
        photoURL: 'https://example.com/photo.jpg',
        emailVerified: true,
        customClaims: { role: 'admin' }
      };

      expect(firebaseUser.uid).toBe('test-uid');
      expect(firebaseUser.email).toBe('test@example.com');
      expect(firebaseUser.name).toBe('Test User');
      expect(firebaseUser.picture).toBe('https://example.com/picture.jpg');
    });
  });

  describe('AuthResult Interface', () => {
    it('should handle success case', () => {
      const successResult: AuthResult = {
        success: true,
        user: {
          uid: 'test-uid',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true
        }
      };

      expect(successResult.success).toBe(true);
      expect(successResult.user).toBeDefined();
      expect(successResult.error).toBeUndefined();
    });

    it('should handle error case', () => {
      const errorResult: AuthResult = {
        success: false,
        error: 'Authentication failed'
      };

      expect(errorResult.success).toBe(false);
      expect(errorResult.user).toBeUndefined();
      expect(errorResult.error).toBe('Authentication failed');
    });
  });

  describe('CreateLoginAuditInput Interface', () => {
    it('should have correct structure for audit logging', () => {
      const auditInput: CreateLoginAuditInput = {
        who: 'teacher:test@example.com',
        action: 'login_ok',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        metadata: {
          studentId: 'test-student-id',
          timestamp: '2024-01-15T10:30:00Z'
        }
      };

      expect(auditInput.who).toBe('teacher:test@example.com');
      expect(auditInput.action).toBe('login_ok');
      expect(auditInput.ip).toBe('192.168.1.1');
      expect(auditInput.metadata).toBeDefined();
    });
  });

  describe('RateLimitOptions Interface', () => {
    it('should have all required properties', () => {
      const rateLimitOptions: RateLimitOptions = {
        windowMs: 60000,
        maxAttempts: 5,
        keyGenerator: (req) => 'test-key',
        skipSuccessfulRequests: true,
        skipFailedRequests: false
      };

      expect(rateLimitOptions.windowMs).toBe(60000);
      expect(rateLimitOptions.maxAttempts).toBe(5);
      expect(typeof rateLimitOptions.keyGenerator).toBe('function');
    });
  });

  describe('SchoolYearInfo Interface', () => {
    it('should have all required properties', () => {
      const schoolYearInfo: SchoolYearInfo = {
        schoolYear: '2023-2024',
        academicYear: '2023/2024',
        semester: 'Eerste',
        period: 'P1'
      };

      expect(schoolYearInfo.schoolYear).toBe('2023-2024');
      expect(schoolYearInfo.academicYear).toBe('2023/2024');
      expect(schoolYearInfo.semester).toBe('Eerste');
      expect(schoolYearInfo.period).toBe('P1');
    });
  });

  describe('StudentApiParams Interface', () => {
    it('should handle different parameter combinations', () => {
      const params: StudentApiParams = {
        idType: 'firestore',
        limit: 10,
        offset: 0,
        subject: 'wiskunde-a',
        level: 'vwo-5',
        schoolYear: '2023-2024',
        sortBy: 'date',
        sortOrder: 'desc',
        searchText: 'algebra'
      };

      expect(params.idType).toBe('firestore');
      expect(params.limit).toBe(10);
      expect(params.offset).toBe(0);
      expect(params.sortBy).toBe('date');
      expect(params.sortOrder).toBe('desc');
    });
  });
});
