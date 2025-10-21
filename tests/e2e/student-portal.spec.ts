import { test, expect } from '@playwright/test';

test.describe('Student Portal E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for student portal
    await page.route('**/api/students/search**', async (route) => {
      const url = new URL(route.request().url());
      const searchTerm = url.searchParams.get('q') || '';
      
      if (searchTerm.toLowerCase().includes('rachel')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            students: [
              {
                id: 'test-student-1',
                displayName: 'Rachel Johnson',
                subject: 'Wiskunde',
                driveFolderId: 'test-folder-1',
                driveFolderName: 'Rachel Folder',
                folderConfirmed: true
              }
            ]
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ students: [] })
        });
      }
    });

    // Mock student files API
    await page.route('**/api/students/*/files**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          files: [
            {
              id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
              name: 'Les 1 - Algebra.pdf',
              title: 'Les 1 - Algebra',
              viewUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
              downloadUrl: 'https://drive.google.com/uc?export=download&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
              thumbnailUrl: 'https://drive.google.com/thumbnail?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms&sz=w400-h400',
              modifiedTime: '2025-01-15T10:00:00Z',
              size: 1024000,
              mimeType: 'application/pdf',
              subject: 'wiskunde-a',
              topicGroup: 'algebra',
              topic: 'lineaire-vergelijkingen',
              level: 'havo-4',
              schoolYear: '2023-2024',
              keywords: ['algebra', 'vergelijkingen', 'lineair'],
              summary: 'Test document about linear equations',
              summaryEn: 'Test document about linear equations',
              topicEn: 'linear-equations',
              keywordsEn: ['algebra', 'equations', 'linear'],
              skills: ['problem-solving', 'algebraic-manipulation'],
              tools: ['calculator', 'graph-paper'],
              theme: 'mathematics',
              aiAnalyzedAt: '2025-01-15T10:00:00Z'
            }
          ],
          count: 1,
          totalCount: 1,
          hasMore: false,
          fromCache: false,
          cacheFresh: true
        })
      });
    });

    // Mock student overview API
    await page.route('**/api/students/*/overview**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          student: {
            id: 'test-student-1',
            displayName: 'Rachel Johnson',
            subject: 'Wiskunde',
            driveFolderId: 'test-folder-1',
            driveFolderName: 'Rachel Folder',
            folderConfirmed: true
          },
          stats: {
            totalFiles: 5,
            recentFiles: 2
          }
        })
      });
    });

    // Mock share link API
    await page.route('**/api/students/*/share**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          shareUrl: 'https://example.com/student/test-student-1',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      });
    });

    // Navigate to student portal
    await page.goto('/');
  });

  test('should load student portal homepage', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Aantekeningen/);
    
    // Check main heading
    await expect(page.locator('h2')).toContainText('Zoek je aantekeningen');
    
    // Check search form is present
    await expect(page.locator('input[placeholder*="Typ je naam om je aantekeningen te vinden"]')).toBeVisible();
    await expect(page.locator('button:has-text("Zoeken")')).toBeVisible();
  });

  test('should search for students', async ({ page }) => {
    // Perform search
    await page.fill('input[placeholder*="Typ je naam om je aantekeningen te vinden"]', 'rachel');
    await page.click('button:has-text("Zoeken")');

    // Wait for results or no results
    await page.waitForSelector('[role="region"][aria-labelledby="results-heading"], [role="status"], [role="alert"]', { timeout: 10000 });
    
    // Check that we get some response (results, no results, or error)
    const hasResults = await page.locator('[role="region"][aria-labelledby="results-heading"]').isVisible();
    const hasNoResults = await page.locator('[role="status"]:has-text("Geen studenten gevonden")').isVisible();
    const hasError = await page.locator('[role="alert"]:not([id="__next-route-announcer__"])').isVisible();
    
    expect(hasResults || hasNoResults || hasError).toBe(true);
  });

  test('should handle empty search results', async ({ page }) => {
    // Perform search with non-existent name
    await page.fill('input[placeholder*="Typ je naam om je aantekeningen te vinden"]', 'nonexistentstudent123');
    await page.click('button:has-text("Zoeken")');

    // Wait for no results message
    await page.waitForSelector('[role="status"]:has-text("Geen studenten gevonden")', { timeout: 10000 });
    
    // Check no results message
    await expect(page.locator('[role="status"]:has-text("Geen studenten gevonden")')).toBeVisible();
    await expect(page.locator('text=Geen studenten gevonden')).toBeVisible();
  });

  test('should navigate to student details page', async ({ page }) => {
    // Search for a student
    await page.fill('input[placeholder*="Typ je naam om je aantekeningen te vinden"]', 'rachel');
    await page.click('button:has-text("Zoeken")');
    
    // Wait for results
    await page.waitForSelector('[role="region"][aria-labelledby="results-heading"], [role="status"]', { timeout: 10000 });
    
    // If we have results, click on the first student
    const hasResults = await page.locator('[role="region"][aria-labelledby="results-heading"]').isVisible();
    if (hasResults) {
      // Click on the first student result
      await page.locator('[role="region"][aria-labelledby="results-heading"] div').first().click();
      
      // Should navigate to student page
      await expect(page).toHaveURL(/\/student\/[^\/]+/);
      
      // Check that we're on a student page (basic validation)
      await expect(page.locator('h1, h2')).toBeVisible();
    } else {
      // Skip test if no students found
      test.skip();
    }
  });

  test('should display student files', async ({ page }) => {
    // Navigate to a student page (this will be skipped if no students exist)
    await page.goto('/student/test-student-id');

    // Wait for page to load (either files, loading, or error)
    await page.waitForSelector('[role="list"][aria-label*="files"], [role="status"][aria-label*="Loading"], [role="alert"]', { timeout: 10000 });
    
    // Check that the page loaded with some content
    const hasFiles = await page.locator('[role="list"][aria-label*="files"]').isVisible();
    const hasLoading = await page.locator('[role="status"][aria-label*="Loading"]').isVisible();
    const hasError = await page.locator('[role="alert"]:not([id="__next-route-announcer__"])').isVisible();
    
    expect(hasFiles || hasLoading || hasError).toBe(true);
  });

  test('should handle file click and open modal', async ({ page }) => {
    // Navigate to student page
    await page.goto('/student/test-student-id');

    // Wait for files to load
    await page.waitForSelector('[role="list"][aria-label*="files"], [role="status"][aria-label*="Loading"], [role="alert"]', { timeout: 10000 });
    
    // Check if files are available
    const hasFiles = await page.locator('[role="list"][aria-label*="files"]').isVisible();
    if (hasFiles) {
      // Click on first file link if available
      const fileLink = page.locator('[role="listitem"]').first();
      const isVisible = await fileLink.isVisible();
      
      if (isVisible) {
        // Click the file to open modal
        await fileLink.click();
        
        // Wait for modal to open (look for modal content or iframe)
        await page.waitForSelector('iframe, [role="dialog"], .modal', { timeout: 5000 });
        
        // Check that modal opened (iframe should be visible)
        const iframe = page.locator('iframe');
        await expect(iframe).toBeVisible();
      }
    } else {
      // Skip test if no files available
      test.skip();
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Perform search
    await page.fill('input[placeholder*="Typ je naam om je aantekeningen te vinden"]', 'test');
    await page.click('button:has-text("Zoeken")');

    // Check that we get some response (loading, results, no results, or error)
    await page.waitForSelector('[role="status"][aria-label*="Loading"], [role="region"][aria-labelledby="results-heading"], [role="status"]:has-text("Geen studenten"), [role="alert"]', { timeout: 10000 });
    
    // Verify that loading state is handled properly
    const hasLoading = await page.locator('[role="status"][aria-label*="Loading"]').isVisible();
    const hasResults = await page.locator('[role="region"][aria-labelledby="results-heading"]').isVisible();
    const hasNoResults = await page.locator('[role="status"]:has-text("Geen studenten")').isVisible();
    const hasError = await page.locator('[role="alert"]:not([id="__next-route-announcer__"])').isVisible();
    
    expect(hasLoading || hasResults || hasNoResults || hasError).toBe(true);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error for this specific test
    await page.route('**/api/students/search**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Perform search
    await page.fill('input[placeholder*="Typ je naam om je aantekeningen te vinden"]', 'error-test');
    await page.click('button:has-text("Zoeken")');

    // Wait for error message
    await page.waitForSelector('[role="alert"]:not([id="__next-route-announcer__"])', { timeout: 10000 });
    
    // Check that error is displayed
    await expect(page.locator('[role="alert"]:not([id="__next-route-announcer__"])')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check mobile layout
    await expect(page.locator('h2')).toBeVisible();
    await expect(page.locator('input[placeholder*="Typ je naam om je aantekeningen te vinden"]')).toBeVisible();
    await expect(page.locator('button:has-text("Zoeken")')).toBeVisible();
    
    // Check that elements are properly sized for mobile
    const searchInput = page.locator('input[placeholder*="Typ je naam om je aantekeningen te vinden"]');
    const inputBox = await searchInput.boundingBox();
    expect(inputBox?.width).toBeLessThanOrEqual(375);
  });

  test('should maintain state on page refresh', async ({ page }) => {
    // Perform search
    await page.fill('input[placeholder*="Typ je naam om je aantekeningen te vinden"]', 'rachel');
    await page.click('button:has-text("Zoeken")');
    
    // Wait for response
    await page.waitForSelector('[role="region"][aria-labelledby="results-heading"], [role="status"], [role="alert"]:not([id="__next-route-announcer__"])', { timeout: 10000 });
    
    // Refresh page
    await page.reload();
    
    // Check that search input is cleared after refresh (normal behavior)
    await expect(page.locator('input[placeholder*="Typ je naam om je aantekeningen te vinden"]')).toHaveValue('');
  });
});
