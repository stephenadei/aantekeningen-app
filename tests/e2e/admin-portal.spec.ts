import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Run tests serially to avoid conflicts
test.describe.configure({ mode: 'serial' });

test.describe('Admin Portal E2E', () => {
  // Increase timeout for slow dev environment
  test.setTimeout(60000);

  // Credentials
  const ADMIN_EMAIL = 'admin@stephensprivelessen.nl';
  const ADMIN_PASSWORD = 'admin123';
  const AUTH_FILE = 'playwright/.auth/admin.json';

  // Ensure auth directory exists
  if (!fs.existsSync('playwright/.auth')) {
    fs.mkdirSync('playwright/.auth', { recursive: true });
  }

  test('should load admin login page', async ({ page }) => {
    // Listen for console logs
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));
    page.on('requestfailed', request => console.log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`));

    // Ensure we start with a clean slate
    await page.context().clearCookies();
    
    await page.goto('/admin/login');
    
    // Wait for loader to disappear (NextAuth session check)
    // Increase timeout just in case
    try {
      await page.waitForSelector('text=Laden...', { state: 'detached', timeout: 15000 });
    } catch (e) {
      console.log('Loader did not disappear within timeout');
      // Take screenshot for debugging
      await page.screenshot({ path: 'debug-loader.png' });
    }
    
    // Wait a bit for potential client-side redirects
    await page.waitForTimeout(2000);
    
    // Check current URL - if already logged in (unlikely after clearCookies), we might be redirected
    const url = page.url();
    if (url.includes('/admin') && !url.includes('/login')) {
      console.log('Unexpectedly authenticated, signing out...');
      // Already authenticated - logout to test login page
      await page.goto('/api/auth/signout');
      await page.goto('/admin/login');
      await page.waitForSelector('text=Laden...', { state: 'detached' });
    }
    
    // Check for login elements
    // Use more flexible selector if needed
    if (await page.locator('text=Inloggen').count() > 0) {
      console.log('Login heading found');
    }
    
    // Wait for the form to be visible
    try {
      await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
    } catch (e) {
      console.log('Form not found within timeout');
      // Log what IS visible
      const bodyText = await page.locator('body').innerText();
      console.log('Visible body text:', bodyText);
    }
    
    // Check for login elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Inloggen")')).toBeVisible();
  });

  test('should redirect to login when accessing admin without authentication', async ({ page }) => {
    // Clear cookies to ensure we are logged out
    await page.context().clearCookies();
    
    // Try to access admin dashboard
    await page.goto('/admin');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForSelector('text=Laden...', { state: 'detached' });

    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Inloggen")');

    // Wait for navigation
    await page.waitForURL(/\/admin/);
    
    // Check admin navigation is visible
    await expect(page.locator('nav[aria-label="Admin navigation"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForSelector('text=Laden...', { state: 'detached' });

    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Inloggen")');

    // Should show error message
    await expect(page.locator('text=Inloggen mislukt')).toBeVisible();
    // Should still be on login page
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  // Tests that require authentication
  test.describe('Authenticated Admin Actions', () => {
    // Perform login once before all tests in this block
    test.beforeAll(async ({ browser, baseURL }) => {
      const page = await browser.newPage();
      const url = baseURL || 'http://localhost:3001';
      
      await page.goto(`${url}/admin/login`);
      await page.waitForSelector('text=Laden...', { state: 'detached' });
      
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button:has-text("Inloggen")');
      await page.waitForURL(/\/admin/);
      
      // Save signed-in state to 'admin.json'
      await page.context().storageState({ path: AUTH_FILE });
      await page.close();
    });

    // Use the saved authentication state
    test.use({ storageState: AUTH_FILE });

    test('should display admin dashboard after login', async ({ page }) => {
      await page.goto('/admin');
      
      // Check navigation is visible
      await expect(page.locator('nav[aria-label="Admin navigation"]')).toBeVisible();
      
      // Check dashboard content
      await expect(page.locator('h1')).toContainText('Dashboard');
    });

    test('should navigate to students page', async ({ page }) => {
      // If there is a link in the nav:
      const studentsLink = page.locator('nav a[href="/admin/students"]');
      
      // Wait for nav to be ready
      await page.goto('/admin');
      
      if (await studentsLink.isVisible()) {
        await studentsLink.click();
      } else {
        await page.goto('/admin/students');
      }

      // Check page content
      await expect(page.locator('h1')).toContainText('Studenten');
      await expect(page.locator('nav[aria-label="Admin navigation"]')).toBeVisible();
    });

    test('should navigate to drive-data page', async ({ page }) => {
      await page.goto('/admin/drive-data');
      await expect(page.locator('h1')).toContainText('Google Drive Data');
    });

    test('should navigate to audit logs', async ({ page }) => {
      await page.goto('/admin/audit');
      await expect(page.locator('h1')).toContainText('Audit Logs');
    });

    test('should be responsive on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/admin');

      // Check mobile navigation toggle
      const mobileMenuBtn = page.locator('button[aria-label="Open menu"], button[aria-label="Toggle mobile menu"]');
      
      if (await mobileMenuBtn.isVisible()) {
        await mobileMenuBtn.click();
        // Check for navigation links
        await expect(page.locator('nav a[href="/admin"]')).toBeVisible();
      } else {
        // Just verify navigation is still accessible/visible in some way
        await expect(page.locator('nav')).toBeVisible();
      }
    });
    
    test('should logout successfully', async ({ page }) => {
      await page.goto('/admin');
      
      // Click logout button (might need to open menu on mobile, but we are desktop size by default)
      await page.click('button:has-text("Uitloggen")');

      // Should redirect to login page
      await expect(page).toHaveURL(/\/admin\/login/);
      
      // Verify we are logged out by trying to access admin page
      // We need to clear cookies/storage first because we are using test.use({ storageState }) 
      // which persists across tests but not necessarily if we explicitly logout in the test
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  });
});
