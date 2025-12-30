#!/usr/bin/env node

/**
 * Sync students from Datalake (MinIO) to Database
 * This script reads all student folders from MinIO and creates/updates them in the database
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(projectRoot, '.env.local') });
dotenv.config({ path: path.resolve(projectRoot, '.env') });

// Import after env is loaded
const { PrismaClient } = await import('@prisma/client');
const { datalakeService } = await import('../src/lib/datalake-simple.js');
const bcrypt = await import('bcryptjs');

const prisma = new PrismaClient();

function generateDefaultPin() {
  return '000000'; // Default PIN
}

async function hashPin(pin) {
  return await bcrypt.default.hash(pin, 10);
}

async function syncStudents() {
  console.log('🔄 Starting datalake sync...\n');

  try {
    // Get all students from datalake
    console.log('📚 Fetching students from datalake...');
    const datalakeStudents = await datalakeService.getAllStudentFolders();
    console.log(`✅ Found ${datalakeStudents.length} students in datalake\n`);

    if (datalakeStudents.length === 0) {
      console.log('⚠️  No students found in datalake. Check MinIO connection and bucket configuration.');
      return;
    }

    // Get existing students from database
    console.log('👥 Fetching existing students from database...');
    const existingStudents = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        datalakePath: true,
      },
    });
    console.log(`✅ Found ${existingStudents.length} students in database\n`);

    // Create a map for quick lookup (by name, case-insensitive)
    const studentMap = new Map();
    for (const student of existingStudents) {
      const key = student.name.toLowerCase();
      // If multiple students with same name, prefer the one with datalakePath
      if (!studentMap.has(key) || !studentMap.get(key)?.datalakePath) {
        studentMap.set(key, student);
      }
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    console.log('🔄 Processing students...\n');

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
            updated++;
            console.log(`  ✅ Updated: ${datalakeStudent.name} (datalakePath: ${datalakeStudent.id})`);
          } else {
            skipped++;
            console.log(`  ⏭️  Skipped: ${datalakeStudent.name} (already synced)`);
          }
        } else {
          // New student - create in database
          const defaultPin = generateDefaultPin();
          const pinHash = await hashPin(defaultPin);

          await prisma.student.create({
            data: {
              name: datalakeStudent.name,
              datalakePath: datalakeStudent.id,
              pinHash: pinHash,
            },
          });

          created++;
          console.log(`  ➕ Created: ${datalakeStudent.name} (datalakePath: ${datalakeStudent.id}, PIN: ${defaultPin})`);
        }
      } catch (error) {
        const errorMsg = `Error processing ${datalakeStudent.name}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     SYNC COMPLEET                                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Statistieken:`);
    console.log(`   • Totaal studenten in datalake: ${datalakeStudents.length}`);
    console.log(`   • Nieuwe studenten aangemaakt: ${created}`);
    console.log(`   • Bestaande studenten bijgewerkt: ${updated}`);
    console.log(`   • Overgeslagen (al gesynced): ${skipped}`);
    console.log(`   • Fouten: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Fouten:');
      errors.forEach(err => console.log(`   • ${err}`));
    }

    console.log('\n✅ Sync voltooid!');

  } catch (error) {
    console.error('\n❌ Fout tijdens sync:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

syncStudents()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });




