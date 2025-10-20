# Testing Guide

This document provides comprehensive information about the test suite for the Aantekeningen App.

## Overview

The test suite follows the **Test Pyramid** approach with three main layers:

- **Unit Tests (60%)** - Fast, isolated tests for individual functions and components
- **Integration Tests (30%)** - Tests for API routes and service interactions
- **E2E Tests (10%)** - Full user journey tests with real browser interactions

## Test Framework Stack

- **Vitest** - Fast unit & integration tests (better Next.js 15 support)
- **Playwright** - Reliable E2E tests with cross-browser support
- **c8/istanbul** - Code coverage reporting
- **Node fetch** - API testing utilities

## Running Tests

### All Tests
```bash
npm run test:ci
```

### Individual Test Types
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Security tests only
npm run test:security

# Performance tests only
npm run test:performance

# Smoke tests only
npm run test:smoke

# Smoke tests against production
SMOKE_TEST_URL=https://stephensprive.app npm run test:smoke

# Smoke tests against localhost (default)
npm run test:smoke
```

### Development Mode
```bash
# Watch mode for unit tests
npm run test:watch

# UI mode for interactive testing
npm run test:ui

# Coverage report
npm run test:coverage
```

## Smoke Tests

Smoke tests verify critical functionality on a **running server** (not mocked). They are:

- ✅ Designed for **local development** (against `http://localhost:3000`)
- ✅ Designed for **post-deployment verification** (against `https://stephensprive.app`)
- ❌ **NOT** run in GitHub Actions CI (no server available)

### Usage

**Local Development:**
```bash
# Start dev server
npm run dev

# In another terminal, run smoke tests
npm run test:smoke
```

**Production Testing:**
```bash
# Test against deployed application
SMOKE_TEST_URL=https://stephensprive.app npm run test:smoke
```

**Configuration:**
- Set `SMOKE_TEST_URL` environment variable to test against different endpoints
- Defaults to `http://localhost:3000` if not specified
- Skipped automatically in GitHub Actions CI pipeline

## Test Structure

```
tests/
├── setup.ts                      # Global test setup & mocks
├── smoke.test.ts                 # Critical smoke tests
├── mocks/                        # Mock implementations
│   ├── firebase-admin.ts         # Firebase Admin SDK mocks
│   ├── google-drive.ts           # Google Drive API mocks
│   └── openai.ts                 # OpenAI API mocks
├── unit/                         # Unit tests (60% of tests)
│   ├── security.test.ts          # Security helpers tests
│   ├── google-drive.test.ts      # Drive helpers tests
│   ├── ai-analysis.test.ts       # AI helpers tests
│   └── firebase-auth.test.ts     # Auth helpers tests
├── integration/                  # Integration tests (30% of tests)
│   ├── api/
│   │   ├── student-portal.test.ts # Student API tests
│   │   └── admin-portal.test.ts   # Admin API tests
│   ├── google-drive.test.ts      # Drive integration tests
│   ├── ai-analysis.test.ts       # AI integration tests
│   └── firestore.test.ts         # Firestore integration tests
├── e2e/                          # E2E tests (10% of tests)
│   ├── student-portal.spec.ts    # Student E2E flow
│   └── admin-portal.spec.ts      # Admin E2E flow
├── security/                     # Security tests
│   └── auth.test.ts              # Authentication & authorization
└── performance/                  # Performance tests
    └── load.test.ts              # Load & performance testing
```

## Test Categories

### 1. Unit Tests

Test individual functions and utilities in isolation:

- **Security helpers** - PIN validation, email validation, input sanitization
- **Google Drive helpers** - Filename cleaning, date parsing, metadata processing
- **AI analysis helpers** - Prompt generation, response parsing, content extraction
- **Firebase auth helpers** - Token verification, admin authorization, runtime detection

**Coverage Target:** 80%+

### 2. Integration Tests

Test API routes and service interactions:

- **Student portal APIs** - Search, overview, files, login
- **Admin portal APIs** - CRUD operations, authentication, audit logs
- **Google Drive integration** - API calls, file processing, caching
- **AI analysis integration** - OpenAI API, content processing, parsing
- **Firestore integration** - CRUD operations, queries, batch operations

**Coverage Target:** 70%+

### 3. E2E Tests

Test complete user journeys:

- **Student portal flow** - Search → Select → View files → Open file
- **Admin portal flow** - Login → Navigate → CRUD operations → Logout
- **Cross-browser testing** - Chrome, Firefox, Safari
- **Mobile responsiveness** - Touch interactions, responsive design

**Coverage Target:** Critical user flows only

### 4. Security Tests

Test authentication and authorization:

- **Admin route protection** - Unauthorized access blocked
- **Domain restrictions** - Only @stephensprivelessen.nl emails allowed
- **Input sanitization** - XSS, injection prevention
- **PIN security** - Validation, hashing, verification
- **Session management** - Cookie handling, expiration

### 5. Performance Tests

Test system performance under load:

- **API response times** - < 1 second for most endpoints
- **Database query performance** - Efficient pagination and search
- **Caching effectiveness** - Cache hit rates and expiration
- **Memory usage** - Handle large datasets without memory issues
- **Concurrent users** - Support multiple simultaneous users

## Mocking Strategy

### Firebase Admin SDK
- Mock authentication and Firestore operations
- Simulate different user roles and permissions
- Test error scenarios and edge cases

### Google Drive API
- Mock file listing and metadata retrieval
- Simulate different file types and sizes
- Test API errors and rate limiting

### OpenAI API
- Mock AI analysis responses
- Test different content types and lengths
- Simulate API errors and timeouts

## Coverage Reporting

Coverage reports are generated using c8/istanbul and include:

- **Line coverage** - Percentage of code lines executed
- **Branch coverage** - Percentage of code branches tested
- **Function coverage** - Percentage of functions called
- **Statement coverage** - Percentage of statements executed

**Overall Coverage Target:** 75%+

## CI/CD Integration

Tests run automatically on:

- **Every push** to any branch
- **Every pull request** to main/dev branches
- **Before deployment** to production

### GitHub Actions Workflow

The CI/CD pipeline includes:

1. **Test Job** - Unit, integration, and security tests
2. **E2E Job** - End-to-end tests with Playwright
3. **Performance Job** - Load and performance testing
4. **Smoke Job** - Critical functionality verification
5. **Security Job** - Security audit and vulnerability scanning
6. **Build Job** - Application build verification
7. **Notify Job** - Success/failure notifications

### Parallel Execution

Tests run in parallel for faster feedback:

- Unit tests: < 1 minute
- Integration tests: < 5 minutes
- E2E tests: < 10 minutes
- **Total CI/CD time: < 15 minutes**

## Best Practices

### Writing Tests

1. **Follow AAA pattern** - Arrange, Act, Assert
2. **Use descriptive test names** - Clear what is being tested
3. **Test one thing at a time** - Single responsibility per test
4. **Mock external dependencies** - Isolate units under test
5. **Test edge cases** - Null, empty, invalid inputs
6. **Test error scenarios** - Network failures, API errors

### Test Data

1. **Use realistic data** - Mimic production data structures
2. **Keep tests independent** - No shared state between tests
3. **Clean up after tests** - Reset mocks and state
4. **Use factories** - Generate test data consistently

### Performance

1. **Run tests in parallel** - Use Vitest's parallel execution
2. **Mock slow operations** - Database, API calls, file I/O
3. **Use test-specific data** - Avoid large datasets in tests
4. **Profile test performance** - Identify slow tests

## Troubleshooting

### Common Issues

1. **Test timeouts** - Increase timeout for slow operations
2. **Mock not working** - Check mock setup and imports
3. **Flaky tests** - Add proper waits and assertions
4. **Coverage gaps** - Add tests for uncovered code paths

### Debug Mode

Run tests in debug mode for detailed output:

```bash
# Debug unit tests
npm run test:unit -- --reporter=verbose

# Debug E2E tests
npm run test:e2e -- --debug

# Debug with UI
npm run test:ui
```

## Environment Variables

Tests use the following environment variables:

```bash
# Test environment
NODE_ENV=test

# Firebase (mocked in tests)
FIREBASE_PROJECT_ID=test-project
NEXT_PUBLIC_FIREBASE_PROJECT_ID=test-project

# Google OAuth (mocked in tests)
GOOGLE_CLIENT_ID=test-google-client-id
GOOGLE_CLIENT_SECRET=test-google-client-secret

# OpenAI (mocked in tests)
OPENAI_API_KEY=test-openai-key
```

## Contributing

When adding new features:

1. **Write tests first** - Follow TDD approach
2. **Update test documentation** - Document new test patterns
3. **Maintain coverage** - Keep coverage above 75%
4. **Run full test suite** - Ensure all tests pass
5. **Update CI/CD** - Add new test types if needed

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Next.js Testing](https://nextjs.org/docs/testing)
- [Firebase Testing](https://firebase.google.com/docs/emulator-suite)
- [Testing Best Practices](https://testingjavascript.com/)
