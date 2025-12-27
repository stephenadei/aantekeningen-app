#!/usr/bin/env node

/**
 * Initialize PIN codes for all students
 * Sets default PIN to 000000 (6 digits) for all students without a PIN
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });
config({ path: join(__dirname, '..', '.env') });

const prisma = new PrismaClient();
const DEFAULT_PIN = '000000';

async function initializePins() {
  try {
    console.log('🔄 Initializing PIN codes for all students...');
    
    // Hash the default PIN
    const pinHash = await bcrypt.hash(DEFAULT_PIN, 10);
    console.log('✅ Default PIN hash generated');
    
    // Find all students without a PIN
    const studentsWithoutPin = await prisma.student.findMany({
      where: {
        OR: [
          { pinHash: null },
          { pinHash: '' }
        ]
      },
      select: {
        id: true,
        name: true,
        pinHash: true
      }
    });
    
    console.log(`📊 Found ${studentsWithoutPin.length} students without PIN`);
    
    if (studentsWithoutPin.length === 0) {
      console.log('✅ All students already have PIN codes');
      return;
    }
    
    // Update all students with default PIN
    const result = await prisma.student.updateMany({
      where: {
        OR: [
          { pinHash: null },
          { pinHash: '' }
        ]
      },
      data: {
        pinHash: pinHash
      }
    });
    
    console.log(`✅ Initialized PIN codes for ${result.count} students`);
    console.log(`📝 Default PIN: ${DEFAULT_PIN}`);
    console.log('⚠️  Remember to change default PINs for security!');
    
    // Show list of updated students
    if (studentsWithoutPin.length <= 20) {
      console.log('\n📋 Updated students:');
      studentsWithoutPin.forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.name} (${student.id})`);
      });
    } else {
      console.log(`\n📋 Updated ${studentsWithoutPin.length} students (too many to list)`);
    }
    
  } catch (error) {
    console.error('❌ Error initializing PIN codes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
initializePins();
