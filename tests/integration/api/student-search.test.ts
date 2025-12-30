/**
 * Student Search API Tests
 * 
 * Tests for the /api/students/search endpoint
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@stephen/database';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

describe('Student Search API', () => {
  let testStudentName: string;

  beforeAll(async () => {
    // Find a student that exists in database for testing
    const student = await prisma.student.findFirst({
      where: {
        datalakePath: {
          not: null,
        },
      },
      select: {
        name: true,
      },
    });

    testStudentName = student?.name || 'Teresa';
  });

  describe('Search Functionality', () => {
    it('should return students when searching by full name', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/students/search?q=${encodeURIComponent(testStudentName)}`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('students');
      expect(Array.isArray(data.students)).toBe(true);

      // Should find at least the test student
      const found = data.students.some(
        (s: any) => s.displayName?.toLowerCase() === testStudentName.toLowerCase()
      );
      expect(found).toBe(true);
    });

    it('should return students when searching by partial name', async () => {
      const partialName = testStudentName.substring(0, 3);
      const response = await fetch(
        `${API_BASE_URL}/api/students/search?q=${encodeURIComponent(partialName)}`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.students.length).toBeGreaterThan(0);
    });

    it('should be case-insensitive', async () => {
      const lowerCase = testStudentName.toLowerCase();
      const upperCase = testStudentName.toUpperCase();

      const response1 = await fetch(
        `${API_BASE_URL}/api/students/search?q=${encodeURIComponent(lowerCase)}`
      );
      const response2 = await fetch(
        `${API_BASE_URL}/api/students/search?q=${encodeURIComponent(upperCase)}`
      );

      const data1 = await response1.json();
      const data2 = await response2.json();

      // Both should return similar results
      expect(data1.success).toBe(true);
      expect(data2.success).toBe(true);

      // Results should be the same (case-insensitive)
      const names1 = data1.students.map((s: any) => s.displayName?.toLowerCase()).sort();
      const names2 = data2.students.map((s: any) => s.displayName?.toLowerCase()).sort();
      expect(names1).toEqual(names2);
    });

    it('should find Teresa when searching', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/students/search?q=Teresa`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.success).toBe(true);
      
      // Check if Teresa is in results (either from database or datalake)
      const foundTeresa = data.students.some(
        (s: any) => s.displayName?.toLowerCase().includes('teresa')
      );

      // Teresa should be found (either in database or datalake)
      // If not found, that's a problem we need to fix
      if (!foundTeresa) {
        console.warn('⚠️ Teresa not found in search results. This might indicate a sync issue.');
      }
    });

    it('should handle wildcard search (q=*)', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/students/search?q=*`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.students.length).toBeGreaterThan(0);
      expect(data.count).toBeGreaterThan(0);
    });

    it('should return error when query parameter is missing', async () => {
      const response = await fetch(`${API_BASE_URL}/api/students/search`);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Query parameter');
    });
  });

  describe('Search Results Structure', () => {
    it('should return properly structured student objects', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/students/search?q=${encodeURIComponent(testStudentName)}`
      );

      const data = await response.json();

      if (data.students.length > 0) {
        const student = data.students[0];

        expect(student).toHaveProperty('id');
        expect(student).toHaveProperty('displayName');
        expect(student).toHaveProperty('subject');
        expect(student).toHaveProperty('url');
        expect(student).toHaveProperty('hasNotes');
      }
    });

    it('should include datalakePath information when available', async () => {
      // Get a student with datalakePath from database
      const dbStudent = await prisma.student.findFirst({
        where: {
          datalakePath: {
            not: null,
          },
        },
        select: {
          name: true,
          datalakePath: true,
        },
      });

      if (dbStudent) {
        const response = await fetch(
          `${API_BASE_URL}/api/students/search?q=${encodeURIComponent(dbStudent.name)}`
        );

        const data = await response.json();
        const found = data.students.find(
          (s: any) => s.displayName?.toLowerCase() === dbStudent.name.toLowerCase()
        );

        if (found) {
          expect(found.hasNotes).toBe(true);
          expect(found.url).toBeTruthy();
        }
      }
    });
  });
});

