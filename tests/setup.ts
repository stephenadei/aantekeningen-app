import { vi, beforeAll } from 'vitest';

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
