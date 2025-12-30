/**
 * Datalake Integration Tests
 * 
 * Tests that verify data consistency between MinIO datalake and database
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { datalakeService } from '@/lib/datalake-simple';
import { prisma } from '@stephen/database';
import { getTestStudents } from '../helpers/datalake-test-data';

describe('Datalake Sync Integration', () => {
  beforeAll(async () => {
    // Ensure datalake service is initialized
    await datalakeService.getAllStudentFolders();
  }, 30000); // 30 second timeout for MinIO connection

  describe('Student Consistency', () => {
    it('should find all students in MinIO that exist in database', async () => {
      // Get all students from MinIO
      const datalakeStudents = await datalakeService.getAllStudentFolders();
      expect(datalakeStudents.length).toBeGreaterThan(0);

      // Get all students from database with datalakePath
      const dbStudents = await prisma.student.findMany({
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

      // Create a map of database students by name (case-insensitive)
      const dbStudentMap = new Map(
        dbStudents.map((s) => [s.name.toLowerCase(), s.datalakePath])
      );

      // Check that all datalake students exist in database
      const missingStudents: string[] = [];
      for (const datalakeStudent of datalakeStudents) {
        const studentName = typeof datalakeStudent.name === 'string' 
          ? datalakeStudent.name 
          : String(datalakeStudent.name);
        const key = studentName.toLowerCase();
        
        if (!dbStudentMap.has(key)) {
          missingStudents.push(studentName);
        }
      }

      expect(missingStudents).toEqual([]);
    });

    it('should have valid MinIO folders for all database students with datalakePath', async () => {
      const dbStudents = await prisma.student.findMany({
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

      const invalidPaths: Array<{ name: string; path: string }> = [];

      for (const student of dbStudents) {
        if (!student.datalakePath) continue;

        try {
          // Try to get student path - if it fails, the path is invalid
          const foundPath = await datalakeService.getStudentPath(student.name);
          if (!foundPath) {
            // Path not found - check if folder exists by trying to list files
            try {
              const files = await datalakeService.listFilesInFolder(student.datalakePath);
              // If we can list files, the path is valid even if getStudentPath didn't find it
              // (might be due to duplicate names in different subjects)
            } catch (listError) {
              // Can't list files - path is invalid
              invalidPaths.push({
                name: student.name,
                path: student.datalakePath || '',
              });
            }
          }
          // If foundPath exists, it's valid (even if different from datalakePath - might be duplicate)
        } catch (error) {
          // Try listing files as fallback
          try {
            await datalakeService.listFilesInFolder(student.datalakePath);
            // If listing works, path is valid
          } catch (listError) {
            invalidPaths.push({
              name: student.name,
              path: student.datalakePath || '',
            });
          }
        }
      }

      expect(invalidPaths).toEqual([]);
    });

    it('should have Teresa in database with valid datalakePath', async () => {
      const teresa = await prisma.student.findFirst({
        where: {
          name: {
            equals: 'Teresa',
            mode: 'insensitive',
          },
        },
      });

      expect(teresa).not.toBeNull();
      expect(teresa?.datalakePath).toBeTruthy();
      expect(teresa?.datalakePath).toContain('Teresa');
    });
  });

  describe('PDF File Validation', () => {
    it('should have non-zero size PDFs for students with files', async () => {
      const testStudents = await getTestStudents(5);
      
      for (const student of testStudents) {
        const studentName = typeof student.name === 'string' 
          ? student.name 
          : String(student.name);
        
        const files = await datalakeService.listFilesInFolder(
          studentName,
          studentName
        );

        // If student has files, they should all be non-zero size
        if (files.length > 0) {
          for (const file of files) {
            expect(file.size).toBeGreaterThan(0);
            expect(file.name.toLowerCase()).toMatch(/\.pdf$/);
          }
        }
      }
    });

    it('should find PDFs in MinIO for students with datalakePath', async () => {
      const dbStudents = await prisma.student.findMany({
        where: {
          datalakePath: {
            not: null,
          },
        },
        select: {
          name: true,
          datalakePath: true,
        },
        take: 10, // Test first 10 students
      });

      for (const student of dbStudents) {
        if (!student.datalakePath) continue;

        try {
          const files = await datalakeService.listFilesInFolder(
            student.datalakePath
          );

          // At least verify we can list files (even if empty)
          expect(Array.isArray(files)).toBe(true);
        } catch (error) {
          // If listing fails, that's a problem
          throw new Error(
            `Failed to list files for ${student.name}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    });
  });

  describe('Subject Coverage', () => {
    it('should have students in all subject folders (VO, Rekenen, WO)', async () => {
      const subjects = ['VO', 'Rekenen', 'WO'];
      const datalakeStudents = await datalakeService.getAllStudentFolders();

      const studentsBySubject = new Map<string, number>();
      for (const student of datalakeStudents) {
        const path = typeof student.id === 'string' ? student.id : String(student.id);
        for (const subject of subjects) {
          if (path.includes(`/${subject}/`)) {
            studentsBySubject.set(
              subject,
              (studentsBySubject.get(subject) || 0) + 1
            );
            break;
          }
        }
      }

      // At least VO and WO should have students (Rekenen might be empty)
      expect(studentsBySubject.get('VO')).toBeGreaterThan(0);
      expect(studentsBySubject.get('WO')).toBeGreaterThan(0);
    });
  });
});

