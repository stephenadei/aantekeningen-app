#!/usr/bin/env node

/**
 * Script to trigger re-analysis of all files with AI
 * This will invalidate the cache and force re-analysis of all files
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });
config({ path: join(__dirname, '..', '.env') });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`🌐 Making request to: ${url}`);
  
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

async function checkStatus() {
  console.log('📊 Checking current sync status...');
  
  try {
    const status = await makeRequest('/api/admin/reanalyze');
    console.log('✅ Status:', JSON.stringify(status, null, 2));
    
    if (status.status?.isRunning) {
      console.log('⚠️  Sync is already running. Please wait for it to complete.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to check status:', error.message);
    return false;
  }
}

async function triggerReanalysis(action, studentId = null) {
  console.log(`🔄 Triggering ${action} re-analysis...`);
  
  try {
    const body = { action };
    if (studentId) {
      body.studentId = studentId;
    }
    
    const result = await makeRequest('/api/admin/reanalyze', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    console.log('✅ Re-analysis triggered:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Failed to trigger re-analysis:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting AI Re-analysis Script');
  console.log('=====================================');
  
  const args = process.argv.slice(2);
  const action = args[0] || 'all';
  const studentId = args[1] || null;
  
  console.log(`📋 Action: ${action}`);
  if (studentId) {
    console.log(`👤 Student ID: ${studentId}`);
  }
  console.log('');
  
  try {
    // Check if we can proceed
    const canProceed = await checkStatus();
    if (!canProceed) {
      console.log('❌ Cannot proceed with re-analysis');
      process.exit(1);
    }
    
    // Trigger the re-analysis
    await triggerReanalysis(action, studentId);
    
    console.log('');
    console.log('🎉 Re-analysis started successfully!');
    console.log('');
    console.log('📝 What happens next:');
    console.log('1. AI analysis cache is invalidated');
    console.log('2. Background sync starts processing all files');
    console.log('3. Each file is re-analyzed with AI');
    console.log('4. New metadata is stored in Firestore');
    console.log('');
    console.log('⏱️  This process may take several minutes depending on the number of files.');
    console.log('💡 You can check the status by running: npm run reanalyze:status');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node scripts/reanalyze-all-files.mjs [action] [studentId]

Actions:
  all       - Re-analyze all files for all students (default)
  student   - Re-analyze files for a specific student (requires studentId)
  status    - Check current sync status

Examples:
  node scripts/reanalyze-all-files.mjs                    # Re-analyze all files
  node scripts/reanalyze-all-files.mjs student abc123     # Re-analyze files for student abc123
  node scripts/reanalyze-all-files.mjs status             # Check status

Environment Variables:
  NEXT_PUBLIC_API_URL - API base URL (default: http://localhost:3001)
  `);
  process.exit(0);
}

main().catch(console.error);