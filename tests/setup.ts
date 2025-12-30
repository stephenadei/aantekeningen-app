import { vi, beforeAll } from 'vitest';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables for tests
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

// Global test setup
beforeAll(() => {
  // Set test environment variables
  Object.assign(process.env, {
    NODE_ENV: 'test',
    FIREBASE_PROJECT_ID: 'test-project',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
    NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
    GOOGLE_CLIENT_ID: 'test-google-client-id',
    GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    OPENAI_API_KEY: 'test-openai-key',
    // Database and MinIO config (use defaults if not set)
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/platform?schema=public',
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || 'localhost',
    MINIO_PORT: process.env.MINIO_PORT || '9005',
    MINIO_SECURE: process.env.MINIO_SECURE || 'false',
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || 'minioadmin',
  });
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock fetch globally
global.fetch = vi.fn();

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: () => ({
    get: vi.fn(),
  }),
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
  }),
}));
