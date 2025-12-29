/**
 * Datalake Sync Service
 * Syncs MinIO datalake folders and calendar events with Prisma database
 * - Creates new students from datalake folders
 * - Updates existing students with datalakePath
 * - Handles calendar events (optional)
 */

import { prisma } from './prisma';
import { datalakeService } from './datalake-simple';
import bcrypt from 'bcryptjs';
import type { DriveStudent } from './interfaces';

interface SyncReport {
  scanned: number;
  created: number;
  updated: number;
  errors: string[];
  unmatched: Array<{
    name: string;
    datalakePath: string;
    reason: string;
  }>;
}

/**
 * Generate a default PIN for new students
 */
function generateDefaultPin(): string {
  return '000000'; // Default PIN as per requirements
}

/**
 * Hash a PIN using bcrypt
 */
async function hashPin(pin: string): Promise<string> {
  return await bcrypt.hash(pin, 10);
}

/**
 * Sync students from datalake to database
 * - Creates new students if they don't exist
 * - Updates existing students with datalakePath if missing
 */
export async function syncStudentsFromDatalake(): Promise<SyncReport> {
  const report: SyncReport = {
    scanned: 0,
    created: 0,
    updated: 0,
    errors: [],
    unmatched: [],
  };

  try {
    console.log('🔄 Starting datalake sync...');

    // Get all students from datalake (notes folders)
    const datalakeStudents = await datalakeService.getAllStudentFolders();
    report.scanned = datalakeStudents.length;
    console.log(`📚 Found ${datalakeStudents.length} students in datalake`);

    // Get all existing students from database
    const existingStudents = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        datalakePath: true,
      },
    });
    console.log(`👥 Found ${existingStudents.length} students in database`);

    // Create a map for quick lookup (by name, case-insensitive)
    const studentMap = new Map<string, typeof existingStudents[0]>();
    for (const student of existingStudents) {
      const key = student.name.toLowerCase();
      // If multiple students with same name, prefer the one with datalakePath
      if (!studentMap.has(key) || !studentMap.get(key)?.datalakePath) {
        studentMap.set(key, student);
      }
    }

    // Process each datalake student
    for (const datalakeStudent of datalakeStudents) {
      try {
        const key = datalakeStudent.name.toLowerCase();
        const existing = studentMap.get(key);

        if (existing) {
          // Student exists - update datalakePath if missing or different
          if (!existing.datalakePath || existing.datalakePath !== datalakeStudent.id) {
            await prisma.student.update({
              where: { id: existing.id },
              data: { datalakePath: datalakeStudent.id },
            });
            report.updated++;
            console.log(`  ✅ Updated: ${datalakeStudent.name} (datalakePath: ${datalakeStudent.id})`);
          } else {
            console.log(`  ⏭️  Skipped: ${datalakeStudent.name} (already synced)`);
          }
        } else {
          // New student - create in database
          const defaultPin = generateDefaultPin();
          const pinHash = await hashPin(defaultPin);

          await prisma.student.create({
            data: {
              name: datalakeStudent.name,
              datalakePath: datalakeStudent.id, // Use datalake path as datalakePath
              pinHash: pinHash,
            },
          });

          report.created++;
          console.log(`  ➕ Created: ${datalakeStudent.name} (datalakePath: ${datalakeStudent.id}, PIN: ${defaultPin})`);
        }
      } catch (error) {
        const errorMsg = `Error processing ${datalakeStudent.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        report.errors.push(errorMsg);
        report.unmatched.push({
          name: datalakeStudent.name,
          datalakePath: datalakeStudent.id,
          reason: errorMsg,
        });
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    console.log('\n📊 Sync Report:');
    console.log(`   • Scanned: ${report.scanned}`);
    console.log(`   • Created: ${report.created}`);
    console.log(`   • Updated: ${report.updated}`);
    console.log(`   • Errors: ${report.errors.length}`);
    console.log(`   • Unmatched: ${report.unmatched.length}`);

    return report;
  } catch (error) {
    const errorMsg = `Failed to sync students from datalake: ${error instanceof Error ? error.message : 'Unknown error'}`;
    report.errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);
    throw error;
  }
}

/**
 * Sync calendar events (optional - checks if students with calendar events exist)
 * This doesn't create students, just ensures they're linked if they exist
 */
export async function syncCalendarEvents(): Promise<{
  scanned: number;
  found: number;
  linked: number;
  errors: string[];
}> {
  const result = {
    scanned: 0,
    found: 0,
    linked: 0,
    errors: [] as string[],
  };

  try {
    console.log('🔄 Scanning calendar events...');

    // Get all students with calendar events from datalake
    // Use empty string to find all calendar folders
    const calendarStudents = await datalakeService.findStudentsWithCalendarEvents('');
    result.scanned = calendarStudents.length;
    result.found = calendarStudents.length;

    console.log(`📅 Found ${calendarStudents.length} students with calendar events`);

    // For each calendar student, check if they exist in database
    // If they do and have no datalakePath, we could potentially link them
    // But for now, we'll just log them
    for (const calendarStudent of calendarStudents) {
      try {
        const dbStudent = await prisma.student.findFirst({
          where: {
            name: {
              equals: calendarStudent.name,
              mode: 'insensitive',
            },
          },
        });

        if (dbStudent) {
          console.log(`  ✅ Found in DB: ${calendarStudent.name}`);
          // Student exists - calendar events are already accessible via datalake
        } else {
          console.log(`  ⚠️  Not in DB: ${calendarStudent.name} (has calendar events but no database record)`);
        }
      } catch (error) {
        const errorMsg = `Error checking ${calendarStudent.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    return result;
  } catch (error) {
    const errorMsg = `Failed to sync calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);
    return result;
  }
}

/**
 * Full sync: students + calendar events
 */
export async function runFullDatalakeSync(): Promise<{
  students: SyncReport;
  calendar: {
    scanned: number;
    found: number;
    linked: number;
    errors: string[];
  };
}> {
  console.log('🚀 Starting full datalake sync...\n');

  const students = await syncStudentsFromDatalake();
  console.log('\n');
  const calendar = await syncCalendarEvents();

  console.log('\n✅ Full datalake sync completed!');

  return {
    students,
    calendar,
  };
}

