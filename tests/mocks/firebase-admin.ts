import { vi } from 'vitest';

// Mock Firebase Admin SDK
export const mockAuth = {
  verifySessionCookie: vi.fn(),
  createSessionCookie: vi.fn(),
  verifyIdToken: vi.fn(),
  getUser: vi.fn(),
  setCustomUserClaims: vi.fn(),
  createCustomToken: vi.fn(),
  revokeSessionCookie: vi.fn(),
};

export const mockFirestore = {
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
    add: vi.fn(),
    where: vi.fn(() => ({
      limit: vi.fn(() => ({
        get: vi.fn(),
      })),
      get: vi.fn(),
    })),
    limit: vi.fn(() => ({
      get: vi.fn(),
    })),
    get: vi.fn(),
  })),
  batch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(),
  })),
};

export const mockFirebaseApp = {
  name: 'test-app',
  options: {},
};

// Mock Firebase Admin module
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(() => mockFirebaseApp),
  getApps: vi.fn(() => []),
  cert: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockFirestore),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'mock-timestamp'),
    Timestamp: {
      fromDate: vi.fn((date) => ({ toMillis: () => date.getTime() })),
    },
  },
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
}));

// Export mocks for use in tests
export { mockAuth as auth, mockFirestore as db };
