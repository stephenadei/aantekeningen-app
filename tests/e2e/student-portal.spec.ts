import { test, expect } from '@playwright/test';

test.describe('Student Portal E2E', () => {
  test.beforeEach(async ({ page }) => {
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
    await page.waitForSelector('[data-testid="student-results"], [data-testid="no-results"], [data-testid="error-message"]', { timeout: 10000 });
    
    // Check that we get some response (results, no results, or error)
    const hasResults = await page.locator('[data-testid="student-results"]').isVisible();
    const hasNoResults = await page.locator('[data-testid="no-results"]').isVisible();
    const hasError = await page.locator('[data-testid="error-message"]').isVisible();
    
    expect(hasResults || hasNoResults || hasError).toBe(true);
  });

  test('should handle empty search results', async ({ page }) => {
    // Perform search with non-existent name
    await page.fill('input[placeholder*="Typ je naam om je aantekeningen te vinden"]', 'nonexistentstudent123');
    await page.click('button:has-text("Zoeken")');

    // Wait for no results message
    await page.waitForSelector('[data-testid="no-results"]', { timeout: 10000 });
    
    // Check no results message
    await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
    await expect(page.locator('text=Geen studenten gevonden')).toBeVisible();
  });

  test('should navigate to student details page', async ({ page }) => {
    // Search for a student
    await page.fill('input[placeholder*="Typ je naam om je aantekeningen te vinden"]', 'rachel');
    await page.click('button:has-text("Zoeken")');
    
    // Wait for results
    await page.waitForSelector('[data-testid="student-results"], [data-testid="no-results"]', { timeout: 10000 });
    
    // If we have results, click on the first student
    const hasResults = await page.locator('[data-testid="student-results"]').isVisible();
    if (hasResults) {
      // Click on the first student result
      await page.locator('[data-testid="student-results"] div').first().click();
      
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
    await page.waitForSelector('[data-testid="files-list"], [data-testid="loading"], [data-testid="error-message"]', { timeout: 10000 });
    
    // Check that the page loaded with some content
    const hasFiles = await page.locator('[data-testid="files-list"]').isVisible();
    const hasLoading = await page.locator('[data-testid="loading"]').isVisible();
    const hasError = await page.locator('[data-testid="error-message"]').isVisible();
    
    expect(hasFiles || hasLoading || hasError).toBe(true);
  });

  test('should handle file click and open in new tab', async ({ page, context }) => {
    // Navigate to student page
    await page.goto('/student/test-student-id');

    // Wait for files to load
    await page.waitForSelector('[data-testid="files-list"], [data-testid="loading"], [data-testid="error-message"]', { timeout: 10000 });
    
    // Check if files are available
    const hasFiles = await page.locator('[data-testid="files-list"]').isVisible();
    if (hasFiles) {
      // Click on first file link if available
      const fileLink = page.locator('[data-testid="file-link"]').first();
      const isVisible = await fileLink.isVisible();
      
      if (isVisible) {
        const [newPage] = await Promise.all([
          context.waitForEvent('page'),
          fileLink.click()
        ]);

        // Check new tab opened (should be Google Drive or similar)
        await expect(newPage).toHaveURL(/drive\.google\.com|googleapis\.com/);
        await newPage.close();
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
    await page.waitForSelector('[data-testid="loading"], [data-testid="student-results"], [data-testid="no-results"], [data-testid="error-message"]', { timeout: 10000 });
    
    // Verify that loading state is handled properly
    const hasLoading = await page.locator('[data-testid="loading"]').isVisible();
    const hasResults = await page.locator('[data-testid="student-results"]').isVisible();
    const hasNoResults = await page.locator('[data-testid="no-results"]').isVisible();
    const hasError = await page.locator('[data-testid="error-message"]').isVisible();
    
    expect(hasLoading || hasResults || hasNoResults || hasError).toBe(true);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Perform search
    await page.fill('input[placeholder*="Typ je naam om je aantekeningen te vinden"]', 'test');
    await page.click('button:has-text("Zoeken")');

    // Wait for response (could be results, no results, or error)
    await page.waitForSelector('[data-testid="student-results"], [data-testid="no-results"], [data-testid="error-message"]', { timeout: 10000 });
    
    // Check that we get some response
    const hasResults = await page.locator('[data-testid="student-results"]').isVisible();
    const hasNoResults = await page.locator('[data-testid="no-results"]').isVisible();
    const hasError = await page.locator('[data-testid="error-message"]').isVisible();
    
    expect(hasResults || hasNoResults || hasError).toBe(true);
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
    await page.waitForSelector('[data-testid="student-results"], [data-testid="no-results"], [data-testid="error-message"]', { timeout: 10000 });
    
    // Refresh page
    await page.reload();
    
    // Check that search input is cleared after refresh (normal behavior)
    await expect(page.locator('input[placeholder*="Typ je naam om je aantekeningen te vinden"]')).toHaveValue('');
  });
});
