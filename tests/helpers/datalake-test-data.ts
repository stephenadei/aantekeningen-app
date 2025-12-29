/**
 * Test helper to fetch real data from datalake for testing
 * This replaces Firestore mocks with actual datalake data
 */

import { datalakeService } from '@/lib/datalake-simple';
import { datalakeMetadataService, type FileMetadata as DatalakeFileMetadata } from '@/lib/datalake-metadata';
import type { DriveStudent, FileMetadata, StudentOverview } from '@/lib/interfaces';

/**
 * Fetch the first N students from the datalake
 */
export async function getTestStudents(count: number = 5): Promise<DriveStudent[]> {
  try {
    const allStudents = await datalakeService.getAllStudentFolders();
    return allStudents.slice(0, count);
  } catch (error) {
    console.error('Failed to fetch test students from datalake:', error);
    return [];
  }
}

/**
 * Fetch files for a specific student from the datalake
 */
export async function getTestStudentFiles(studentName: string, limit: number = 5): Promise<FileMetadata[]> {
  try {
    const studentPath = await datalakeService.getStudentPath(studentName);
    if (!studentPath) {
      console.log(`⚠️ No path found for student: ${studentName}`);
      return [];
    }
    
    const allFiles = await datalakeMetadataService.getStudentFileMetadata(studentPath);
    const limitedFiles = allFiles.slice(0, limit);
    console.log(`✅ Fetched ${limitedFiles.length} files for ${studentName} (from ${allFiles.length} total)`);
    // Convert DatalakeFileMetadata to FileMetadata format expected by interfaces
    return limitedFiles as unknown as FileMetadata[];
  } catch (error) {
    console.error(`Failed to fetch test files for student ${studentName}:`, error);
    return [];
  }
}

/**
 * Get test data: first N students with their first M files each
 */
export async function getTestData(
  studentCount: number = 5,
  filesPerStudent: number = 5
): Promise<{
  students: DriveStudent[];
  studentFiles: Map<string, FileMetadata[]>;
}> {
  const students = await getTestStudents(studentCount);
  const studentFiles = new Map<string, FileMetadata[]>();

  for (const student of students) {
    const studentName = typeof student.name === 'string' ? student.name : String(student.name);
    const files = await getTestStudentFiles(studentName, filesPerStudent);
    studentFiles.set(studentName, files);
  }

  return { students, studentFiles };
}

/**
 * Get a single test student with files (for simpler tests)
 */
export async function getSingleTestStudent(): Promise<{
  student: DriveStudent;
  files: FileMetadata[];
} | null> {
  const students = await getTestStudents(1);
  if (students.length === 0) {
    console.log('⚠️ No students found in datalake');
    return null;
  }

  const student = students[0];
  // Use student.name (which is StudentName type) instead of displayName
  const studentName = typeof student.name === 'string' ? student.name : (student as any).displayName || (student as any).name;
  const files = await getTestStudentFiles(studentName, 5);

  if (files.length === 0) {
    console.log(`⚠️ No files found for student: ${studentName}`);
  }

  return { student, files };
}

