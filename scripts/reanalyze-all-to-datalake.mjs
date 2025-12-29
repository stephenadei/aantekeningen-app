#!/usr/bin/env node

/**
 * Re-analyze all PDFs in datalake and store metadata in datalake
 * This script processes all students and their PDFs, runs AI analysis,
 * and stores metadata as JSON files in the datalake.
 * 
 * Uses the background sync service via API or direct import.
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

// Statistics
const stats = {
  students: 0,
  files: 0,
  analyzed: 0,
  errors: 0,
  skipped: 0,
};

// Progress tracking
const progress = {
  currentStudent: '',
  currentFile: '',
  startTime: Date.now(),
};

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
 * Print progress (currently unused but kept for future use)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _printProgress() {
  const elapsed = formatTime(Date.now() - progress.startTime);
  console.log(`\n📊 Progress:`);
  console.log(`   Students: ${stats.students}`);
  console.log(`   Files: ${stats.files} (${stats.analyzed} analyzed, ${stats.skipped} skipped, ${stats.errors} errors)`);
  console.log(`   Time: ${elapsed}`);
  if (progress.currentStudent) {
    console.log(`   Current: ${progress.currentStudent}`);
  }
  if (progress.currentFile) {
    console.log(`   File: ${progress.currentFile}`);
  }
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
 * Re-analyze all students via API
 */
async function reanalyzeAll(forceReanalyze = true) {
  console.log('🔄 Starting re-analysis of all PDFs in datalake...');
  console.log(`   Force re-analyze: ${forceReanalyze ? 'Yes' : 'No'}`);
  console.log(`   API URL: ${API_BASE_URL}`);
  console.log('');

  try {
    // Trigger full re-analysis via API
    console.log('📡 Triggering re-analysis via API...');
    const result = await makeRequest('/api/admin/reanalyze', {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'all',
        forceAll: forceReanalyze 
      }),
    });

    console.log('✅ Re-analysis triggered:', result);
    console.log('\n💡 Note: This runs in the background. Check the API logs for progress.');
    console.log('   You can check status with: node scripts/reanalyze-all-to-datalake.mjs --status');

  } catch (error) {
    console.error('\n❌ Re-analysis failed:', error);
    console.log('\n💡 Make sure:');
    console.log('   1. The app is running and accessible at:', API_BASE_URL);
    console.log('   2. You are authenticated (admin access required)');
    process.exit(1);
  }
}

/**
 * Re-analyze specific student via API
 */
async function reanalyzeStudent(studentName, forceReanalyze = true) {
  console.log(`🔄 Re-analyzing student: ${studentName}`);
  console.log(`   API URL: ${API_BASE_URL}`);
  
  try {
    // Find student by name first
    const studentsResponse = await makeRequest('/api/admin/students');
    const student = studentsResponse.students?.find(s => 
      s.displayName?.toLowerCase() === studentName.toLowerCase()
    );

    if (!student) {
      console.error(`❌ Student not found: ${studentName}`);
      if (studentsResponse.students?.length > 0) {
        console.log('Available students:', studentsResponse.students.map(s => s.displayName).join(', '));
      }
      process.exit(1);
    }

    // Trigger re-analysis for specific student
    const result = await makeRequest('/api/admin/reanalyze', {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'student',
        studentId: student.id,
        forceAll: forceReanalyze 
      }),
    });

    console.log(`✅ Re-analysis complete:`, result);
  } catch (error) {
    console.error(`❌ Error re-analyzing ${studentName}:`, error);
    console.log('\n💡 Make sure:');
    console.log('   1. The app is running and accessible at:', API_BASE_URL);
    console.log('   2. You are authenticated (admin access required)');
    process.exit(1);
  }
}

/**
 * Check re-analysis status
 */
async function checkStatus() {
  try {
    const result = await makeRequest('/api/admin/reanalyze', {
      method: 'GET',
    });
    
    console.log('📊 Re-analysis Status:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Failed to get status:', error);
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);
const command = args[0];

if (command === '--student' && args[1]) {
  // Re-analyze specific student
  reanalyzeStudent(args[1], true).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} else if (command === '--status') {
  // Check status
  checkStatus().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} else if (command === '--all' || !command) {
  // Re-analyze all students
  reanalyzeAll(true).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} else {
  console.log('Usage:');
  console.log('  node scripts/reanalyze-all-to-datalake.mjs [--all]');
  console.log('  node scripts/reanalyze-all-to-datalake.mjs --student <student-name>');
  console.log('  node scripts/reanalyze-all-to-datalake.mjs --status');
  console.log('');
  console.log('Note: This script requires the app to be running.');
  console.log('      Set NEXT_PUBLIC_API_URL or NEXTAUTH_URL environment variable if needed.');
  console.log('      Admin authentication is required.');
  process.exit(1);
}

