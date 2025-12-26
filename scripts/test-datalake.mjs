#!/usr/bin/env node
/**
 * Test script to verify datalake connection and list students
 */

import { datalakeService } from '../src/lib/datalake-simple.js';

async function testDatalake() {
  console.log('🔍 Testing Datalake Connection...\n');

  try {
    // Test connection
    console.log('1. Testing connection...');
    const connectionTest = await datalakeService.testDatalakeAccess();
    console.log('   Result:', connectionTest);
    
    if (!connectionTest.success) {
      console.error('❌ Connection failed:', connectionTest.message);
      console.log('\n💡 Make sure you have set these environment variables:');
      console.log('   - MINIO_ENDPOINT (default: localhost)');
      console.log('   - MINIO_PORT (default: 9000)');
      console.log('   - MINIO_SECURE (default: false)');
      console.log('   - MINIO_ACCESS_KEY (default: minioadmin)');
      console.log('   - MINIO_SECRET_KEY');
      process.exit(1);
    }

    console.log('✅ Connection successful!\n');

    // List all students
    console.log('2. Listing all students...');
    const allStudents = await datalakeService.findStudentFolders('');
    console.log(`   Found ${allStudents.length} students:`);
    allStudents.forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.name} (${student.subject})`);
    });

    if (allStudents.length === 0) {
      console.log('\n⚠️  No students found in datalake.');
      console.log('   Expected path structure: educatie-lesmateriaal/notability/Priveles/{VO|Rekenen|WO}/{StudentName}/');
      console.log('   Check if files are uploaded to the correct bucket and path.');
    }

    // Test search
    console.log('\n3. Testing search...');
    if (allStudents.length > 0) {
      const firstStudent = allStudents[0].name;
      console.log(`   Searching for: "${firstStudent}"`);
      const searchResults = await datalakeService.findStudentFolders(firstStudent);
      console.log(`   Found ${searchResults.length} matches`);
    }

    // Test file listing
    console.log('\n4. Testing file listing...');
    if (allStudents.length > 0) {
      const firstStudent = allStudents[0];
      console.log(`   Listing files for: ${firstStudent.name}`);
      const files = await datalakeService.listFilesInFolder('', firstStudent.name);
      console.log(`   Found ${files.length} files`);
      if (files.length > 0) {
        console.log('   First file:', files[0].name);
      }
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('❌ Error testing datalake:', error);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

testDatalake();

