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

    // Mock Google OAuth popup
    await page.route('**/api/auth/google', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Login successful'
        })
      });
    });

    // Click Google sign-in button
    await page.click('button:has-text("Inloggen met Google")');

    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin$/);
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

    // Mock Google OAuth popup
    await page.route('**/api/auth/google', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Login successful'
        })
      });
    });

    // Click Google sign-in button
    await page.click('button:has-text("Inloggen met Google")');

    // Should show access denied error
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

    // Mock API responses
    await page.route('**/api/admin/students*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          students: [
            {
              id: 'student-1',
              displayName: 'Rachel',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              notesCount: 5,
              lastNoteDate: '2025-10-08T12:39:30.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 50,
            total: 1,
            pages: 1
          }
        })
      });
    });

    // Navigate to admin dashboard
    await page.goto('/admin');

    // Check navigation is visible
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

    // Mock API response
    await page.route('**/api/admin/students*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          students: [
            {
              id: 'student-1',
              displayName: 'Rachel',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              notesCount: 5,
              lastNoteDate: '2025-10-08T12:39:30.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 50,
            total: 1,
            pages: 1
          }
        })
      });
    });

    // Navigate to students page
    await page.goto('/admin/students');

    // Check page content
    await expect(page.locator('h1')).toContainText('Studenten');
    await expect(page.locator('text=Rachel')).toBeVisible();
    await expect(page.locator('button:has-text("Nieuwe Student")')).toBeVisible();
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

    // Mock API responses
    await page.route('**/api/admin/students*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            students: [],
            pagination: { page: 1, limit: 50, total: 0, pages: 0 }
          })
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            student: {
              id: 'new-student-id',
              displayName: 'New Student',
              createdAt: new Date().toISOString()
            },
            pin: '123456'
          })
        });
      }
    });

    // Navigate to students page
    await page.goto('/admin/students');

    // Click "Nieuwe Student" button
    await page.click('button:has-text("Nieuwe Student")');

    // Fill form
    await page.fill('input[name="displayName"]', 'New Student');
    await page.click('button[type="submit"]');

    // Check success message
    await expect(page.locator('text=Student succesvol aangemaakt')).toBeVisible();
    await expect(page.locator('text=PIN: 123456')).toBeVisible();
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

    // Mock API response
    await page.route('**/api/admin/students*', async (route) => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search');
      
      const students = search === 'rachel' ? [
        {
          id: 'student-1',
          displayName: 'Rachel',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notesCount: 5,
          lastNoteDate: '2025-10-08T12:39:30.000Z'
        }
      ] : [];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          students,
          pagination: { page: 1, limit: 50, total: students.length, pages: 1 }
        })
      });
    });

    // Navigate to students page
    await page.goto('/admin/students');

    // Search for student
    await page.fill('input[placeholder*="zoek"]', 'rachel');
    await page.click('button[type="submit"]');

    // Check results
    await expect(page.locator('text=Rachel')).toBeVisible();
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

    // Mock API response
    await page.route('**/api/admin/audit*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          audits: [
            {
              id: 'audit-1',
              who: 'student:Rachel',
              action: 'login_ok',
              ip: '127.0.0.1',
              userAgent: 'test-agent',
              createdAt: new Date().toISOString(),
              metadata: { studentId: 'student-1' }
            }
          ],
          pagination: { page: 1, limit: 20, total: 1, pages: 1 }
        })
      });
    });

    // Navigate to audit logs page
    await page.goto('/admin/audit');

    // Check page content
    await expect(page.locator('h1')).toContainText('Audit Logs');
    await expect(page.locator('text=student:Rachel')).toBeVisible();
    await expect(page.locator('text=login_ok')).toBeVisible();
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

    // Mock logout API
    await page.route('**/api/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Logged out successfully'
        })
      });
    });

    // Navigate to admin dashboard
    await page.goto('/admin');

    // Click logout button
    await page.click('button:has-text("Uitloggen")');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should handle session expiration', async ({ page }) => {
    // Mock expired session
    await page.route('**/api/admin/students*', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Unauthorized'
        })
      });
    });

    // Try to access admin page
    await page.goto('/admin/students');

    // Should redirect to login
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check mobile navigation
    await expect(page.locator('button[aria-label="Menu"]')).toBeVisible();
    
    // Click mobile menu
    await page.click('button[aria-label="Menu"]');
    
    // Check mobile menu items
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

    // Mock network error
    await page.route('**/api/admin/students*', async (route) => {
      await route.abort('failed');
    });

    // Navigate to students page
    await page.goto('/admin/students');

    // Check error message
    await expect(page.locator('text=Er is een fout opgetreden')).toBeVisible();
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
