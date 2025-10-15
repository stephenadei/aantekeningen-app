#!/usr/bin/env node

/**
 * Test Google Drive Connection and Sync Real Data
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

import { googleDriveService } from '../src/lib/google-drive-simple.ts';

async function testDriveConnection() {
  console.log('🧪 Testing Google Drive connection...');
  console.log('📋 Configuration:');
  console.log(`   Client ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Refresh Token: ${process.env.GOOGLE_REFRESH_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log('');

  try {
    // Test basic connection
    const result = await googleDriveService.testDriveAccess();
    
    if (result.success) {
      console.log('✅ Google Drive connection successful!');
      console.log(`📊 Found ${result.folderCount} student folders`);
      console.log('');
      
      // Get all students
      console.log('📚 Fetching all students...');
      const students = await googleDriveService.getAllStudents();
      
      console.log(`✅ Found ${students.length} students:`);
      students.forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.name} (${student.subject})`);
      });
      
      if (students.length > 0) {
        console.log('');
        console.log('🎯 Ready to sync to database!');
        console.log('   Run: node scripts/sync-real-data.mjs');
      } else {
        console.log('');
        console.log('⚠️  No students found. Check your folder structure:');
        console.log('   Notability → Priveles → [Subject Folders] → [Student Folders]');
      }
      
    } else {
      console.log('❌ Google Drive connection failed:');
      console.log(`   ${result.message}`);
      console.log('');
      console.log('🔧 Troubleshooting:');
      console.log('   1. Check your Google OAuth credentials');
      console.log('   2. Make sure the refresh token is valid');
      console.log('   3. Verify folder structure in Google Drive');
    }
    
  } catch (error) {
    console.error('❌ Error testing Google Drive connection:', error);
    console.log('');
    console.log('🔧 Common issues:');
    console.log('   1. Invalid refresh token - try re-authenticating');
    console.log('   2. Missing folder structure');
    console.log('   3. Network connectivity issues');
  }
}

testDriveConnection()
  .then(() => {
    console.log('');
    console.log('🏁 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
