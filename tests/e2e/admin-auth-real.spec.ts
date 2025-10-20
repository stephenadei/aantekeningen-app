import { test, expect } from '@playwright/test';

// Skip this test by default - only run when REAL_AUTH=true
test.describe.configure({ mode: 'serial' });

test.describe('Admin Portal Real Authentication E2E', () => {
  test.beforeAll(async () => {
    // Skip all tests in this file unless REAL_AUTH environment variable is set
    if (!process.env.REAL_AUTH) {
      test.skip();
    }
  });

  test('should authenticate with real Google OAuth', async ({ page }) => {
    // Navigate to admin login page
    await page.goto('/admin/login');
    
    // Check that we're on the login page
    await expect(page).toHaveTitle(/Docentenportaal/);
    await expect(page.locator('h2')).toContainText('Docentenportaal');
    
    // Click the Google sign-in button
    await page.click('button:has-text("Inloggen met Google")');
    
    // Wait for Google OAuth popup or redirect
    // This will open Google's OAuth flow
    await page.waitForLoadState('networkidle');
    
    // If redirected to Google OAuth, fill in credentials
    if (page.url().includes('accounts.google.com')) {
      // Fill in email (requires REAL_AUTH_EMAIL env var)
      const email = process.env.REAL_AUTH_EMAIL;
      if (!email) {
        throw new Error('REAL_AUTH_EMAIL environment variable is required for real auth testing');
      }
      
      await page.fill('input[type="email"]', email);
      await page.click('#identifierNext');
      
      // Wait for password field
      await page.waitForSelector('input[type="password"]', { timeout: 10000 });
      
      // Fill in password (requires REAL_AUTH_PASSWORD env var)
      const password = process.env.REAL_AUTH_PASSWORD;
      if (!password) {
        throw new Error('REAL_AUTH_PASSWORD environment variable is required for real auth testing');
      }
      
      await page.fill('input[type="password"]', password);
      await page.click('#passwordNext');
      
      // Wait for redirect back to our app
      await page.waitForURL(/\/admin/, { timeout: 30000 });
    }
    
    // Verify we're authenticated and on admin dashboard
    await expect(page).toHaveURL(/\/admin/);
    
    // Check that admin navigation is visible
    await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible();
    
    // Verify we can access admin features
    await expect(page.locator('text=Studenten')).toBeVisible();
    await expect(page.locator('text=Audit Logs')).toBeVisible();
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // This test assumes the previous test has already authenticated
    // Navigate to admin dashboard
    await page.goto('/admin');
    
    // Should be authenticated (not redirected to login)
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible();
    
    // Refresh the page
    await page.reload();
    
    // Should still be authenticated
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible();
  });

  test('should logout properly', async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin');
    
    // Should be authenticated
    await expect(page).toHaveURL(/\/admin/);
    
    // Click logout button
    await page.click('[data-testid="logout-button"]');
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/\/admin\/login/);
    
    // Try to access admin dashboard again
    await page.goto('/admin');
    
    // Should be redirected back to login (session cleared)
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
