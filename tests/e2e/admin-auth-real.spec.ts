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
    await expect(page).toHaveTitle(/Aantekeningen - Stephen's Privelessen/);
    await expect(page.locator('h2')).toContainText('Docentenportaal');
    
    // Click the login button (credentials-based, not Google OAuth)
    // Note: This test needs to be updated for credentials-based auth
    await page.fill('input[type="email"]', process.env.REAL_AUTH_EMAIL || '');
    await page.fill('input[type="password"]', process.env.REAL_AUTH_PASSWORD || '');
    await page.click('button:has-text("Inloggen")');
    
    // Wait for form submission and redirect
    await page.waitForLoadState('networkidle');
    
    // Wait for redirect to admin dashboard after successful login
    await page.waitForURL(/\/admin/, { timeout: 30000 });
    
    // Verify we're authenticated and on admin dashboard
    await expect(page).toHaveURL(/\/admin/);
    
    // Check that admin navigation is visible
    await expect(page.locator('nav[aria-label="Admin navigation"]')).toBeVisible();
    
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
    await expect(page.locator('nav[aria-label="Admin navigation"]')).toBeVisible();
    
    // Refresh the page
    await page.reload();
    
    // Should still be authenticated
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('nav[aria-label="Admin navigation"]')).toBeVisible();
  });

  test('should logout properly', async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin');
    
    // Should be authenticated
    await expect(page).toHaveURL(/\/admin/);
    
    // Click logout button
    await page.click('button[aria-label*="Logout"]');
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/\/admin\/login/);
    
    // Try to access admin dashboard again
    await page.goto('/admin');
    
    // Should be redirected back to login (session cleared)
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
