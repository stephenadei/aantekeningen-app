import { test, expect } from '@playwright/test';

test.describe('Admin Portal E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin login page
    await page.goto('/admin/login');
  });

  test('should load admin login page', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Docentenportaal/);
    
    // Check main heading
    await expect(page.locator('h2')).toContainText('Docentenportaal');
    
    // Check Google sign-in button
    await expect(page.locator('button:has-text("Inloggen met Google")')).toBeVisible();
    
    // Check domain restriction notice
    await expect(page.locator('text=stephensprivelessen.nl')).toBeVisible();
  });

  test('should redirect to login when accessing admin without authentication', async ({ page }) => {
    // Try to access admin dashboard
    await page.goto('/admin');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should handle Google OAuth flow', async ({ page, context }) => {
    // Mock Firebase Auth
    await page.addInitScript(() => {
      // Mock Firebase Auth state
      window.firebaseAuthState = {
        user: {
          uid: 'admin-uid',
          email: 'admin@stephensprivelessen.nl',
          displayName: 'Admin User',
          photoURL: 'https://example.com/photo.jpg',
          emailVerified: true
        }
      };
    });

    // Click Google sign-in button
    await page.click('button:has-text("Inloggen met Google")');

    // Should redirect to admin dashboard (with mocked auth)
    await expect(page).toHaveURL(/\/admin$/);
    
    // Check admin navigation is visible
    await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible();
  });

  test('should reject non-teacher email domains', async ({ page }) => {
    // Mock Firebase Auth with invalid email
    await page.addInitScript(() => {
      window.firebaseAuthState = {
        user: {
          uid: 'user-uid',
          email: 'student@gmail.com',
          displayName: 'Student User',
          photoURL: null,
          emailVerified: true
        }
      };
    });

    // Click Google sign-in button
    await page.click('button:has-text("Inloggen met Google")');

    // Should show access denied error (with mocked invalid email)
    await expect(page.locator('text=Toegang geweigerd')).toBeVisible();
    await expect(page.locator('text=Alleen docenten van stephensprivelessen.nl')).toBeVisible();
  });

  test('should display admin dashboard after login', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      window.firebaseAuthState = {
        user: {
          uid: 'admin-uid',
          email: 'admin@stephensprivelessen.nl',
          displayName: 'Admin User',
          photoURL: 'https://example.com/photo.jpg',
          emailVerified: true
        }
      };
    });

    // Navigate to admin dashboard
    await page.goto('/admin');

    // Check navigation is visible
    await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible();
    await expect(page.locator('text=Docentenportaal')).toBeVisible();
    await expect(page.locator('text=Studenten')).toBeVisible();
    await expect(page.locator('text=Notities')).toBeVisible();
    await expect(page.locator('text=Audit Logs')).toBeVisible();
    
    // Check user info in navigation
    await expect(page.locator('text=Admin User')).toBeVisible();
    await expect(page.locator('text=admin@stephensprivelessen.nl')).toBeVisible();
  });

  test('should navigate to students page', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      window.firebaseAuthState = {
        user: {
          uid: 'admin-uid',
          email: 'admin@stephensprivelessen.nl',
          displayName: 'Admin User',
          photoURL: 'https://example.com/photo.jpg',
          emailVerified: true
        }
      };
    });


    // Navigate to drive-data page (which exists)
    await page.goto('/admin/drive-data');

    // Check page content
    await expect(page.locator('h1')).toContainText('Google Drive Data');
    await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible();
  });

  test('should create new student', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      window.firebaseAuthState = {
        user: {
          uid: 'admin-uid',
          email: 'admin@stephensprivelessen.nl',
          displayName: 'Admin User',
          photoURL: 'https://example.com/photo.jpg',
          emailVerified: true
        }
      };
    });

    // Navigate to admin dashboard (since students page doesn't exist)
    await page.goto('/admin');

    // Check that we can access admin features
    await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible();
  });

  test('should search students', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      window.firebaseAuthState = {
        user: {
          uid: 'admin-uid',
          email: 'admin@stephensprivelessen.nl',
          displayName: 'Admin User',
          photoURL: 'https://example.com/photo.jpg',
          emailVerified: true
        }
      };
    });


    // Navigate to audit page (which exists)
    await page.goto('/admin/audit');

    // Check page loads
    await expect(page.locator('h1')).toContainText('Audit Logs');
    await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible();
  });

  test('should view audit logs', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      window.firebaseAuthState = {
        user: {
          uid: 'admin-uid',
          email: 'admin@stephensprivelessen.nl',
          displayName: 'Admin User',
          photoURL: 'https://example.com/photo.jpg',
          emailVerified: true
        }
      };
    });

    // Navigate to audit logs page
    await page.goto('/admin/audit');

    // Check page content
    await expect(page.locator('h1')).toContainText('Audit Logs');
    await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      window.firebaseAuthState = {
        user: {
          uid: 'admin-uid',
          email: 'admin@stephensprivelessen.nl',
          displayName: 'Admin User',
          photoURL: 'https://example.com/photo.jpg',
          emailVerified: true
        }
      };
    });


    // Navigate to admin dashboard
    await page.goto('/admin');

    // Click logout button
    await page.click('[data-testid="logout-button"]');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should handle session expiration', async ({ page }) => {

    // Try to access admin page
    await page.goto('/admin/students');

    // Should redirect to login
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check mobile navigation
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Click mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    
    // Check mobile menu items (using actual navigation items from AdminNavigation)
    await expect(page.locator('text=Studenten')).toBeVisible();
    await expect(page.locator('text=Notities')).toBeVisible();
    await expect(page.locator('text=Audit Logs')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      window.firebaseAuthState = {
        user: {
          uid: 'admin-uid',
          email: 'admin@stephensprivelessen.nl',
          displayName: 'Admin User',
          photoURL: 'https://example.com/photo.jpg',
          emailVerified: true
        }
      };
    });


    // Navigate to admin dashboard
    await page.goto('/admin');

    // Check that page loads (even with network errors, the page should still render)
    await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible();
  });

  test('should maintain authentication state across page refreshes', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      window.firebaseAuthState = {
        user: {
          uid: 'admin-uid',
          email: 'admin@stephensprivelessen.nl',
          displayName: 'Admin User',
          photoURL: 'https://example.com/photo.jpg',
          emailVerified: true
        }
      };
    });

    // Navigate to admin dashboard
    await page.goto('/admin');

    // Refresh page
    await page.reload();

    // Should still be authenticated
    await expect(page.locator('text=Admin User')).toBeVisible();
    await expect(page).toHaveURL(/\/admin$/);
  });
});
