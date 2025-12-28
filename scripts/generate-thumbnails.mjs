#!/usr/bin/env node

/**
 * Generate thumbnails for all PDFs in datalake
 * This script processes all students and their PDFs, generates thumbnails,
 * and stores them in the datalake.
 * 
 * Uses the thumbnail generator service via API endpoint.
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });
config({ path: join(__dirname, '..', '.env') });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXTAUTH_URL || 'http://localhost:3001';
const CRON_SECRET = process.env.CRON_SECRET || 'test-secret';

/**
 * Format elapsed time
 */
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Make API request
 */
async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    throw error;
  }
}

/**
 * Generate thumbnails for all students
 */
async function generateAllThumbnails(size = 'medium', force = false) {
  console.log('🖼️  Starting thumbnail generation for all PDFs in datalake...');
  console.log(`   Size: ${size}`);
  console.log(`   Force: ${force ? 'Yes (regenerate existing)' : 'No (skip existing)'}`);
  console.log(`   API URL: ${API_BASE_URL}`);
  console.log('');

  const startTime = Date.now();

  try {
    // Trigger thumbnail generation via API
    console.log('📡 Triggering thumbnail generation via API...');
    const result = await makeRequest(`/api/cron/generate-thumbnails?size=${size}&force=${force}`);

    console.log('✅ Thumbnail generation triggered:', result);
    console.log('\n💡 Note: This runs in the background. Check the API logs for progress.');
    console.log(`   Started at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('\n❌ Thumbnail generation failed:', error);
    console.log('\n💡 Make sure:');
    console.log('   1. The app is running and accessible at:', API_BASE_URL);
    console.log('   2. CRON_SECRET is set correctly in .env.local');
    process.exit(1);
  }
}

/**
 * Generate thumbnails for specific student
 */
async function generateStudentThumbnails(studentPath, size = 'medium', force = false) {
  console.log(`🖼️  Generating thumbnails for student: ${studentPath}`);
  console.log(`   Size: ${size}`);
  console.log(`   Force: ${force ? 'Yes (regenerate existing)' : 'No (skip existing)'}`);
  console.log(`   API URL: ${API_BASE_URL}`);
  
  const startTime = Date.now();

  try {
    // Trigger thumbnail generation for specific student
    const result = await makeRequest(
      `/api/cron/generate-thumbnails?student=${encodeURIComponent(studentPath)}&size=${size}&force=${force}`
    );

    console.log(`✅ Thumbnail generation triggered:`, result);
    console.log(`   Started at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error(`❌ Error generating thumbnails for ${studentPath}:`, error);
    console.log('\n💡 Make sure:');
    console.log('   1. The app is running and accessible at:', API_BASE_URL);
    console.log('   2. CRON_SECRET is set correctly in .env.local');
    console.log('   3. Student path is correct (e.g., "notability/Priveles/VO/StudentName")');
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);
const command = args[0];

// Parse options
let size = 'medium';
let force = false;
let student = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--size' && args[i + 1]) {
    size = args[i + 1];
    i++;
  } else if (args[i] === '--force') {
    force = true;
  } else if (args[i] === '--student' && args[i + 1]) {
    student = args[i + 1];
    i++;
  }
}

if (student) {
  // Generate thumbnails for specific student
  generateStudentThumbnails(student, size, force).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} else if (command === '--all' || !command || command.startsWith('--')) {
  // Generate thumbnails for all students
  generateAllThumbnails(size, force).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} else {
  console.log('Usage:');
  console.log('  node scripts/generate-thumbnails.mjs [--all] [--size small|medium|large] [--force]');
  console.log('  node scripts/generate-thumbnails.mjs --student <student-path> [--size small|medium|large] [--force]');
  console.log('');
  console.log('Options:');
  console.log('  --all              Generate thumbnails for all students (default)');
  console.log('  --student <path>   Generate thumbnails for specific student');
  console.log('  --size <size>      Thumbnail size: small, medium (default), or large');
  console.log('  --force            Regenerate thumbnails even if they already exist');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/generate-thumbnails.mjs');
  console.log('  node scripts/generate-thumbnails.mjs --all --size large');
  console.log('  node scripts/generate-thumbnails.mjs --student "notability/Priveles/VO/StudentName"');
  console.log('  node scripts/generate-thumbnails.mjs --student "notability/Priveles/VO/StudentName" --force');
  console.log('');
  console.log('Note: This script requires the app to be running.');
  console.log('      Set NEXT_PUBLIC_API_URL or NEXTAUTH_URL environment variable if needed.');
  console.log('      Set CRON_SECRET in .env.local for authentication.');
  process.exit(1);
}



