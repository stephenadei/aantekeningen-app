import { vi, beforeAll } from 'vitest';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables for tests
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

// Global test setup
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  // Firebase — always use test values (no real Firebase in tests)
  process.env.FIREBASE_PROJECT_ID = 'test-project';
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
  // These respect CI values if already set
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/platform?schema=public';
  process.env.PLATFORM_API_URL = process.env.PLATFORM_API_URL || '';
  process.env.PLATFORM_API_KEY = process.env.PLATFORM_API_KEY || '';
  process.env.DATALAKE_BUCKET = process.env.DATALAKE_BUCKET || '';
  process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
  process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';
  process.env.MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || process.env.S3_ENDPOINT || 'localhost';
  process.env.MINIO_PORT = process.env.MINIO_PORT || '9005';
  process.env.MINIO_SECURE = process.env.MINIO_SECURE || 'false';
  process.env.MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || process.env.S3_ACCESS_KEY || 'minioadmin';
  process.env.MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || process.env.S3_SECRET_KEY || 'minioadmin';
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
