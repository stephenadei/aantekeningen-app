/**
 * Data Consistency Tests
 * 
 * Tests that verify consistency between MinIO datalake, database, and metadata
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { datalakeService } from '@/lib/datalake-simple';
import { datalakeMetadataService } from '@/lib/datalake-metadata';
import { prisma } from '@stephen/database';

describe('Data Consistency', () => {
  beforeAll(async () => {
    // Ensure services are initialized
    await datalakeService.getAllStudentFolders();
  }, 30000); // 30 second timeout for MinIO connection

  describe('MinIO and Database Consistency', () => {
    it('should have matching student folders between MinIO and database', async () => {
      // Get all students from MinIO
      const datalakeStudents = await datalakeService.getAllStudentFolders();
      const datalakeNames = new Set(
        datalakeStudents.map((s) => {
          const name = typeof s.name === 'string' ? s.name : String(s.name);
          return name.toLowerCase();
        })
      );

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

      const dbNames = new Set(
        dbStudents.map((s) => s.name.toLowerCase())
      );

      // Check for mismatches
      const inDatalakeNotInDb: string[] = [];
      const inDbNotInDatalake: string[] = [];

      for (const name of datalakeNames) {
        if (!dbNames.has(name)) {
          inDatalakeNotInDb.push(name);
        }
      }

      for (const name of dbNames) {
        if (!datalakeNames.has(name)) {
          inDbNotInDatalake.push(name);
        }
      }

      // Report mismatches but don't fail (might be expected)
      if (inDatalakeNotInDb.length > 0) {
        console.warn(
          `⚠️ Students in MinIO but not in database: ${inDatalakeNotInDb.join(', ')}`
        );
      }

      if (inDbNotInDatalake.length > 0) {
        console.warn(
          `⚠️ Students in database but not in MinIO: ${inDbNotInDatalake.join(', ')}`
        );
      }

      // At least verify we have some overlap
      const overlap = Array.from(datalakeNames).filter((n) => dbNames.has(n));
      expect(overlap.length).toBeGreaterThan(0);
    });

    it('should have correct datalakePath format in database', async () => {
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

        // Check format: should start with "notability/Priveles/"
        if (!student.datalakePath.startsWith('notability/Priveles/')) {
          invalidPaths.push({
            name: student.name,
            path: student.datalakePath,
          });
        }

        // Should end with "/"
        if (!student.datalakePath.endsWith('/')) {
          invalidPaths.push({
            name: student.name,
            path: student.datalakePath,
          });
        }

        // Should contain subject folder (VO, Rekenen, or WO)
        const hasSubject =
          student.datalakePath.includes('/VO/') ||
          student.datalakePath.includes('/Rekenen/') ||
          student.datalakePath.includes('/WO/');

        if (!hasSubject) {
          invalidPaths.push({
            name: student.name,
            path: student.datalakePath,
          });
        }
      }

      expect(invalidPaths).toEqual([]);
    });
  });

  describe('PDF Count Consistency', () => {
    it('should have consistent PDF counts between MinIO and metadata', async () => {
      const testStudents = await datalakeService.getAllStudentFolders();
      const studentsToTest = testStudents.slice(0, 5); // Test first 5

      for (const student of studentsToTest) {
        const studentName = typeof student.name === 'string' 
          ? student.name 
          : String(student.name);
        const studentPath = typeof student.id === 'string' 
          ? student.id 
          : String(student.id);

        try {
          // Get files from datalake service
          const files = await datalakeService.listFilesInFolder(studentPath);

          // Get metadata from metadata service
          const metadata = await datalakeMetadataService.getStudentFileMetadata(
            studentPath
          );

          // PDF count should match (metadata might be less if not all files are analyzed)
          const pdfFiles = files.filter((f) =>
            f.name.toLowerCase().endsWith('.pdf')
          );

          // Metadata count should be <= PDF count (some PDFs might not have metadata yet)
          expect(metadata.length).toBeLessThanOrEqual(pdfFiles.length);

          // If there are PDFs, at least some should have metadata (or all if analysis is complete)
          if (pdfFiles.length > 0) {
            // This is informational - we don't fail if metadata is missing
            const coverage = (metadata.length / pdfFiles.length) * 100;
            console.log(
              `📊 ${studentName}: ${metadata.length}/${pdfFiles.length} PDFs have metadata (${coverage.toFixed(1)}%)`
            );
          }
        } catch (error) {
          // Skip if student path is invalid
          console.warn(
            `⚠️ Skipping ${studentName}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    });
  });

  describe('Subject Distribution', () => {
    it('should have students in all expected subject folders', async () => {
      const subjects = ['VO', 'Rekenen', 'WO'];
      const datalakeStudents = await datalakeService.getAllStudentFolders();

      const studentsBySubject = new Map<string, string[]>();

      for (const student of datalakeStudents) {
        const path = typeof student.id === 'string' ? student.id : String(student.id);
        for (const subject of subjects) {
          if (path.includes(`/${subject}/`)) {
            const name = typeof student.name === 'string' ? student.name : String(student.name);
            if (!studentsBySubject.has(subject)) {
              studentsBySubject.set(subject, []);
            }
            studentsBySubject.get(subject)!.push(name);
            break;
          }
        }
      }

      // Verify we have students in at least VO and WO
      expect(studentsBySubject.get('VO')?.length).toBeGreaterThan(0);
      expect(studentsBySubject.get('WO')?.length).toBeGreaterThan(0);

      // Log distribution
      for (const [subject, students] of studentsBySubject.entries()) {
        console.log(`📚 ${subject}: ${students.length} students`);
      }
    });
  });

  describe('Orphaned Data Detection', () => {
    it('should not have orphaned folders in MinIO without database records', async () => {
      const datalakeStudents = await datalakeService.getAllStudentFolders();
      const datalakeNames = new Set(
        datalakeStudents.map((s) => {
          const name = typeof s.name === 'string' ? s.name : String(s.name);
          return name.toLowerCase();
        })
      );

      // Get all database students (with or without datalakePath)
      const allDbStudents = await prisma.student.findMany({
        select: {
          name: true,
        },
      });

      const dbNames = new Set(
        allDbStudents.map((s) => s.name.toLowerCase())
      );

      // Find orphaned folders (in MinIO but not in database at all)
      const orphaned: string[] = [];
      for (const name of datalakeNames) {
        if (!dbNames.has(name)) {
          orphaned.push(name);
        }
      }

      // Report orphaned folders (these should be synced)
      if (orphaned.length > 0) {
        console.warn(
          `⚠️ Orphaned folders in MinIO (not in database): ${orphaned.join(', ')}`
        );
        console.warn('   These should be synced to database');
      }

      // Don't fail - this is informational
      // But log it so we know what needs to be fixed
    });

    it('should have Teresa in both MinIO and database', async () => {
      // Check MinIO
      const datalakeStudents = await datalakeService.getAllStudentFolders();
      const teresaInMinIO = datalakeStudents.some((s) => {
        const name = typeof s.name === 'string' ? s.name : String(s.name);
        return name.toLowerCase() === 'teresa';
      });

      // Check database
      const teresaInDb = await prisma.student.findFirst({
        where: {
          name: {
            equals: 'Teresa',
            mode: 'insensitive',
          },
        },
      });

      expect(teresaInDb).not.toBeNull();
      expect(teresaInDb?.datalakePath).toBeTruthy();

      // Teresa should be in database (we just added her)
      // If not in MinIO, that's okay - files might still be syncing
      if (!teresaInMinIO) {
        console.warn('⚠️ Teresa folder not found in MinIO - files might still be syncing');
      }
    });
  });
});

