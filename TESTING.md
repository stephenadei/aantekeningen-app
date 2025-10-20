# Testing Documentation

This document provides comprehensive information about the testing setup and strategies used in the Aantekeningen App.

## Overview

The application uses a multi-layered testing approach with different types of tests for different purposes:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test the interaction between different modules and API endpoints
- **End-to-End (E2E) Tests**: Test complete user workflows in a real browser environment
- **Smoke Tests**: Basic tests to ensure critical functionalities are working
- **Performance Tests**: Measure API response times, database query efficiency, and memory usage
- **Security Tests**: Validate authentication, authorization, and input sanitization

## Test Commands

### Run All Tests
```bash
npm run test:ci
```

### Individual Test Types
```bash
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e          # E2E tests
npm run test:security     # Security tests
npm run test:performance  # Performance tests
npm run test:smoke        # Smoke tests
```

### Development
```bash
npm run test:watch        # Watch mode
npm run test:ui           # Interactive UI
npm run test:coverage     # Coverage report
npm run test:summary      # Test summary
```

## E2E Tests

### Setup
Install Playwright browsers:
```bash
npx playwright install
```

### Running Tests
```bash
npm run test:e2e
```

### Authentication Testing
Most E2E tests use mocked authentication for speed. For real authentication testing:
```bash
REAL_AUTH=true npm run test:e2e tests/e2e/admin-auth-real.spec.ts
```

### Test Structure

#### Student Portal Tests (`tests/e2e/student-portal.spec.ts`)
- Tests the main student search functionality
- Validates UI responsiveness and user interactions
- Uses real API endpoints (no mocking)
- Includes data-testid attributes for reliable element selection

#### Admin Portal Tests (`tests/e2e/admin-portal.spec.ts`)
- Tests admin authentication and navigation
- Uses mocked Firebase authentication for speed
- Tests real UI interactions without API mocking
- Validates admin-specific functionality

#### Real Authentication Tests (`tests/e2e/admin-auth-real.spec.ts`)
- Tests actual Google OAuth flow
- Requires `REAL_AUTH=true` environment variable
- Needs `REAL_AUTH_EMAIL` and `REAL_AUTH_PASSWORD` for test credentials
- Validates complete authentication workflow

### Data Test IDs

The application uses `data-testid` attributes for reliable element selection in E2E tests:

#### Student Portal
- `data-testid="student-results"` - Search results container
- `data-testid="no-results"` - Empty state message
- `data-testid="loading"` - Loading state indicator
- `data-testid="error-message"` - Error message display
- `data-testid="files-list"` - Files list container
- `data-testid="file-link"` - Individual file download links

#### Admin Portal
- `data-testid="admin-nav"` - Main navigation component
- `data-testid="mobile-menu-button"` - Mobile menu toggle
- `data-testid="logout-button"` - Logout button

## Test Coverage

### Targets
- **Unit tests**: 80%+ coverage target
- **Integration tests**: 70%+ coverage target
- **Overall**: 75%+ coverage target

### Coverage Report
```bash
npm run test:coverage
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)
- Uses Node.js environment for server-side tests
- Includes path aliases for `@/*` imports
- Excludes E2E tests (handled by Playwright)
- Configured for TypeScript support

### Playwright Configuration (`playwright.config.ts`)
- Tests against local development server
- Includes multiple browsers (Chromium, Firefox, WebKit)
- Configured for CI/CD environments
- Includes retry logic for flaky tests

## Mocking Strategy

### Unit Tests
- Use `vi.mock()` for external dependencies
- Mock Firebase Admin SDK, Google Drive API, and OpenAI API
- Isolated testing of individual functions

### Integration Tests
- Mock external APIs but test real internal logic
- Use `mockResolvedValueOnce` for API responses
- Test actual database operations with test data

### E2E Tests
- **Student Portal**: No mocking - tests real API endpoints
- **Admin Portal**: Mock Firebase authentication, test real UI
- **Real Auth Tests**: No mocking - complete end-to-end testing

## Environment Variables

### Required for Real Authentication Tests
```bash
REAL_AUTH=true                    # Enable real auth tests
REAL_AUTH_EMAIL=test@example.com  # Test Google account email
REAL_AUTH_PASSWORD=password       # Test Google account password
```

### Test Environment
```bash
NODE_ENV=test
FIREBASE_PROJECT_ID=test-project
GOOGLE_APPLICATION_CREDENTIALS=path/to/test-credentials.json
```

## CI/CD Integration

Tests run automatically on every push and pull request via GitHub Actions. The CI pipeline:

1. Installs dependencies
2. Runs linting and type checking
3. Executes unit and integration tests
4. Runs E2E tests (with browser installation)
5. Generates coverage reports
6. Publishes test results

## Troubleshooting

### Common Issues

#### E2E Tests Failing
- Ensure browsers are installed: `npx playwright install`
- Check that the development server is running
- Verify environment variables are set correctly

#### Mock Issues
- Check that mocks are properly configured in test setup
- Ensure mock implementations match real API responses
- Verify mock cleanup between tests

#### Coverage Issues
- Check that all source files are included in coverage
- Verify test files are properly excluded
- Ensure coverage thresholds are realistic

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm run test:e2e

# Run specific test with debug
npx playwright test --debug tests/e2e/student-portal.spec.ts
```

## Best Practices

### Writing Tests
1. **Arrange-Act-Assert**: Structure tests clearly
2. **Descriptive Names**: Use clear, descriptive test names
3. **Single Responsibility**: Each test should test one thing
4. **Independent Tests**: Tests should not depend on each other
5. **Clean Setup**: Use proper setup and teardown

### E2E Testing
1. **Use Data Test IDs**: Prefer `data-testid` over CSS selectors
2. **Wait for Elements**: Use proper waiting strategies
3. **Test User Flows**: Focus on complete user journeys
4. **Handle Async Operations**: Account for loading states
5. **Clean State**: Ensure tests start with clean state

### Performance Testing
1. **Realistic Data**: Use production-like data volumes
2. **Multiple Scenarios**: Test various load conditions
3. **Monitor Resources**: Track memory and CPU usage
4. **Baseline Metrics**: Establish performance baselines
5. **Regression Detection**: Alert on performance degradation

## Contributing

When adding new features:

1. **Write Tests First**: Follow TDD principles
2. **Update Documentation**: Keep this file current
3. **Add Data Test IDs**: Include test IDs for new UI elements
4. **Test Edge Cases**: Cover error conditions and edge cases
5. **Performance Considerations**: Add performance tests for critical paths

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [Firebase Testing Guide](https://firebase.google.com/docs/emulator-suite)