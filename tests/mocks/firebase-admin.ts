import { vi } from 'vitest';

// Mock Firestore Timestamp
export class Timestamp {
  constructor(private _seconds: number = 0, private _nanoseconds: number = 0) {}
  
  toDate(): Date {
    return new Date(this._seconds * 1000 + this._nanoseconds / 1000000);
  }
  
  toMillis(): number {
    return this._seconds * 1000 + this._nanoseconds / 1000000;
  }
  
  static now(): Timestamp {
    const now = Date.now();
    return new Timestamp(Math.floor(now / 1000), (now % 1000) * 1000000);
  }
  
  static fromDate(date: Date): Timestamp {
    const ms = date.getTime();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1000000);
  }
}

// Mock Firestore Query
export const mockQuery = {
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue({ docs: [] }),
};

// Mock Firestore Document Reference
export const mockDocRef: {
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  collection: ReturnType<typeof vi.fn>;
} = {
  set: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
  update: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  collection: vi.fn().mockReturnValue({}),
};

// Mock Firestore Collection Reference
export const mockCollectionRef = {
  doc: vi.fn().mockReturnValue(mockDocRef),
  add: vi.fn().mockResolvedValue(mockDocRef),
  get: vi.fn().mockResolvedValue({ docs: [] }),
  where: vi.fn().mockReturnValue(mockQuery),
  orderBy: vi.fn().mockReturnValue(mockQuery),
  limit: vi.fn().mockReturnValue(mockQuery),
};

// Mock Firestore Database
export const mockDb = {
  collection: vi.fn().mockReturnValue(mockCollectionRef),
  runTransaction: vi.fn().mockImplementation((callback) => callback({})),
  batch: vi.fn().mockReturnValue({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  }),
};

// Mock Firebase Auth
export const mockAuth = {
  verifyIdToken: vi.fn().mockResolvedValue({
    uid: 'test-uid',
    email: 'test@example.com',
    email_verified: true,
  }),
  verifySessionCookie: vi.fn().mockResolvedValue({
    uid: 'test-uid',
    email: 'test@example.com',
    email_verified: true,
  }),
  createUser: vi.fn().mockResolvedValue({
    uid: 'new-uid',
    email: 'new@example.com',
  }),
  updateUser: vi.fn().mockResolvedValue({
    uid: 'test-uid',
    email: 'updated@example.com',
  }),
  deleteUser: vi.fn().mockResolvedValue(undefined),
  getUser: vi.fn().mockResolvedValue({
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    emailVerified: true,
    customClaims: {},
  }),
  setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
  createCustomToken: vi.fn().mockResolvedValue('mock-token'),
};

export const db = mockDb;
export const auth = mockAuth;

const mockFirebaseAdmin = {
  db: mockDb,
  auth: mockAuth,
};

export default mockFirebaseAdmin;
