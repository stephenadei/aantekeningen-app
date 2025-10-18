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
    await expect(page.locator('h1')).toContainText('Studentenportaal');
    
    // Check search form is present
    await expect(page.locator('input[placeholder*="zoek"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should search for students', async ({ page }) => {
    // Mock API response
    await page.route('**/api/students/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          students: [
            {
              id: 'test-student-id',
              displayName: 'Rachel',
              driveFolderId: '1UcSaOYeR7rqZRLdfeotLbwAoAG7uU9DD',
              driveFolderName: 'Rachel Folder',
              subject: 'Wiskunde',
              folderConfirmed: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          ]
        })
      });
    });

    // Perform search
    await page.fill('input[placeholder*="zoek"]', 'rachel');
    await page.click('button[type="submit"]');

    // Wait for results
    await page.waitForSelector('[data-testid="student-results"]');
    
    // Check results
    await expect(page.locator('[data-testid="student-results"]')).toBeVisible();
    await expect(page.locator('text=Rachel')).toBeVisible();
  });

  test('should handle empty search results', async ({ page }) => {
    // Mock empty API response
    await page.route('**/api/students/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          students: []
        })
      });
    });

    // Perform search
    await page.fill('input[placeholder*="zoek"]', 'nonexistent');
    await page.click('button[type="submit"]');

    // Wait for results
    await page.waitForSelector('[data-testid="no-results"]');
    
    // Check no results message
    await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
    await expect(page.locator('text=Geen studenten gevonden')).toBeVisible();
  });

  test('should navigate to student details page', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/students/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          students: [
            {
              id: 'test-student-id',
              displayName: 'Rachel',
              driveFolderId: '1UcSaOYeR7rqZRLdfeotLbwAoAG7uU9DD',
              driveFolderName: 'Rachel Folder',
              subject: 'Wiskunde',
              folderConfirmed: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          ]
        })
      });
    });

    await page.route('**/api/students/test-student-id/overview*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          fileCount: 3,
          lastActivity: '2025-10-08T12:39:30.000Z',
          lastActivityDate: '8 okt 2025',
          files: [
            {
              id: '1O6UaU3MBWt_o0fq_qkGkK2IC0eWzR4Q-',
              name: 'Priveles 8 Oct 2025 12_39_30.pdf',
              cleanedName: 'Les 8 Oct 2025',
              modifiedTime: '2025-10-08T12:39:30.000Z',
              size: '1024000',
              webViewLink: 'https://drive.google.com/file/d/1O6UaU3MBWt_o0fq_qkGkK2IC0eWzR4Q-/view',
            }
          ]
        })
      });
    });

    // Search and click on student
    await page.fill('input[placeholder*="zoek"]', 'rachel');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('[data-testid="student-results"]');
    await page.click('text=Rachel');

    // Should navigate to student page
    await expect(page).toHaveURL(/\/student\/test-student-id/);
    
    // Check student details are displayed
    await expect(page.locator('h1')).toContainText('Rachel');
    await expect(page.locator('text=3 bestanden')).toBeVisible();
    await expect(page.locator('text=8 okt 2025')).toBeVisible();
  });

  test('should display student files', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/students/test-student-id/files*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          files: [
            {
              id: '1O6UaU3MBWt_o0fq_qkGkK2IC0eWzR4Q-',
              name: 'Priveles 8 Oct 2025 12_39_30.pdf',
              cleanedName: 'Les 8 Oct 2025',
              modifiedTime: '2025-10-08T12:39:30.000Z',
              size: '1024000',
              webViewLink: 'https://drive.google.com/file/d/1O6UaU3MBWt_o0fq_qkGkK2IC0eWzR4Q-/view',
            },
            {
              id: '1hvVkVwSBtlIB9BgT6sEWAIrwawBnUPYt',
              name: 'Priveles 2 Oct 2025 18_04_59.pdf',
              cleanedName: 'Les 2 Oct 2025',
              modifiedTime: '2025-10-02T18:04:59.000Z',
              size: '2048000',
              webViewLink: 'https://drive.google.com/file/d/1hvVkVwSBtlIB9BgT6sEWAIrwawBnUPYt/view',
            }
          ]
        })
      });
    });

    // Navigate to student page
    await page.goto('/student/test-student-id');

    // Wait for files to load
    await page.waitForSelector('[data-testid="files-list"]');
    
    // Check files are displayed
    await expect(page.locator('[data-testid="files-list"]')).toBeVisible();
    await expect(page.locator('text=Les 8 Oct 2025')).toBeVisible();
    await expect(page.locator('text=Les 2 Oct 2025')).toBeVisible();
    
    // Check file links
    const fileLinks = page.locator('[data-testid="file-link"]');
    await expect(fileLinks).toHaveCount(2);
  });

  test('should handle file click and open in new tab', async ({ page, context }) => {
    // Mock API response
    await page.route('**/api/students/test-student-id/files*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          files: [
            {
              id: '1O6UaU3MBWt_o0fq_qkGkK2IC0eWzR4Q-',
              name: 'Priveles 8 Oct 2025 12_39_30.pdf',
              cleanedName: 'Les 8 Oct 2025',
              modifiedTime: '2025-10-08T12:39:30.000Z',
              size: '1024000',
              webViewLink: 'https://drive.google.com/file/d/1O6UaU3MBWt_o0fq_qkGkK2IC0eWzR4Q-/view',
            }
          ]
        })
      });
    });

    // Navigate to student page
    await page.goto('/student/test-student-id');

    // Wait for files to load
    await page.waitForSelector('[data-testid="files-list"]');
    
    // Click on file link
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('[data-testid="file-link"]')
    ]);

    // Check new tab opened with correct URL
    await expect(newPage).toHaveURL(/drive\.google\.com/);
  });

  test('should handle loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/students/search*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          students: []
        })
      });
    });

    // Perform search
    await page.fill('input[placeholder*="zoek"]', 'test');
    await page.click('button[type="submit"]');

    // Check loading state
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();
    
    // Wait for loading to complete
    await page.waitForSelector('[data-testid="no-results"]');
    await expect(page.locator('[data-testid="loading"]')).not.toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/students/search*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error'
        })
      });
    });

    // Perform search
    await page.fill('input[placeholder*="zoek"]', 'test');
    await page.click('button[type="submit"]');

    // Check error message
    await page.waitForSelector('[data-testid="error-message"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Er is een fout opgetreden')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check mobile layout
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('input[placeholder*="zoek"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check that elements are properly sized for mobile
    const searchInput = page.locator('input[placeholder*="zoek"]');
    const inputBox = await searchInput.boundingBox();
    expect(inputBox?.width).toBeLessThanOrEqual(375);
  });

  test('should maintain state on page refresh', async ({ page }) => {
    // Mock API response
    await page.route('**/api/students/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          students: [
            {
              id: 'test-student-id',
              displayName: 'Rachel',
              driveFolderId: '1UcSaOYeR7rqZRLdfeotLbwAoAG7uU9DD',
              driveFolderName: 'Rachel Folder',
              subject: 'Wiskunde',
              folderConfirmed: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          ]
        })
      });
    });

    // Perform search
    await page.fill('input[placeholder*="zoek"]', 'rachel');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('[data-testid="student-results"]');
    
    // Refresh page
    await page.reload();
    
    // Check that search results are still visible (if implemented with URL state)
    // This test assumes the app maintains search state in URL or localStorage
    await expect(page.locator('input[placeholder*="zoek"]')).toHaveValue('rachel');
  });
});
