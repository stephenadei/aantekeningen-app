#!/usr/bin/env node

/**
 * Inspect Firestore Database
 * 
 * This script helps you explore your Firestore database and check
 * metadata and analysis information.
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Initialize Firebase Admin
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'stephen-s-aantekeningen',
  credential: applicationDefault(),
};

const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];
const db = getFirestore(app);

async function inspectCollection(collectionName, limit = 5) {
  try {
    console.log(`\n📁 Collection: ${collectionName}`);
    console.log('=' .repeat(50));
    
    const snapshot = await db.collection(collectionName).limit(limit).get();
    
    if (snapshot.empty) {
      console.log('   (empty collection)');
      return;
    }
    
    console.log(`   Found ${snapshot.size} documents (showing first ${limit}):`);
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n   📄 Document ${index + 1}: ${doc.id}`);
      
      // Show key fields for different collection types
      switch (collectionName) {
        case 'students':
          console.log(`      displayName: ${data.displayName || 'N/A'}`);
          console.log(`      subject: ${data.subject || 'N/A'}`);
          console.log(`      driveFolderId: ${data.driveFolderId || 'N/A'}`);
          console.log(`      folderConfirmed: ${data.folderConfirmed || false}`);
          break;
          
        case 'fileMetadata':
          console.log(`      name: ${data.name || 'N/A'}`);
          console.log(`      studentId: ${data.studentId || 'N/A'}`);
          console.log(`      modifiedTime: ${data.modifiedTime?.toDate?.() || data.modifiedTime || 'N/A'}`);
          console.log(`      subject: ${data.subject || 'N/A'}`);
          console.log(`      topic: ${data.topic || 'N/A'}`);
          console.log(`      aiAnalyzed: ${data.aiAnalyzedAt ? 'Yes (' + data.aiAnalyzedAt.toDate().toLocaleDateString() + ')' : 'No'}`);
          break;
          
        case 'driveCache':
          console.log(`      type: ${data.type || 'N/A'}`);
          console.log(`      studentId: ${data.studentId || 'N/A'}`);
          console.log(`      expiresAt: ${data.expiresAt?.toDate?.() || data.expiresAt || 'N/A'}`);
          break;
          
        case 'notes':
          console.log(`      studentId: ${data.studentId || 'N/A'}`);
          console.log(`      subject: ${data.subject || 'N/A'}`);
          console.log(`      topic: ${data.topic || 'N/A'}`);
          console.log(`      aiGenerated: ${data.aiGenerated || false}`);
          break;
          
        case 'keyConcepts':
          console.log(`      driveFileId: ${data.driveFileId || 'N/A'}`);
          console.log(`      term: ${data.term || 'N/A'}`);
          console.log(`      explanation: ${data.explanation?.substring(0, 50) || 'N/A'}...`);
          console.log(`      isAiGenerated: ${data.isAiGenerated || false}`);
          break;
          
        default:
          // Show first few fields for unknown collections
          const keys = Object.keys(data).slice(0, 5);
          keys.forEach(key => {
            const value = data[key];
            if (typeof value === 'object' && value?.toDate) {
              console.log(`      ${key}: ${value.toDate()}`);
            } else {
              console.log(`      ${key}: ${value}`);
            }
          });
      }
    });
    
  } catch (error) {
    console.error(`❌ Error inspecting ${collectionName}:`, error.message);
  }
}

async function getCollectionStats() {
  try {
    console.log('\n📊 Collection Statistics');
    console.log('=' .repeat(50));
    
    const collections = ['students', 'fileMetadata', 'driveCache', 'notes', 'keyConcepts', 'teachers'];
    
    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).get();
        console.log(`   ${collectionName}: ${snapshot.size} documents`);
      } catch (error) {
        console.log(`   ${collectionName}: Error - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Error getting collection stats:', error.message);
  }
}

async function inspectStudentFiles(studentId) {
  try {
    console.log(`\n📁 Student Files: ${studentId}`);
    console.log('=' .repeat(50));
    
    const snapshot = await db.collection('fileMetadata')
      .where('studentId', '==', studentId)
      .orderBy('modifiedTime', 'desc')
      .get();
    
    if (snapshot.empty) {
      console.log('   No files found for this student');
      return;
    }
    
    console.log(`   Found ${snapshot.size} files:`);
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n   📄 File ${index + 1}: ${data.name}`);
      console.log(`      ID: ${doc.id}`);
      console.log(`      Modified: ${data.modifiedTime?.toDate?.() || data.modifiedTime}`);
      console.log(`      Subject: ${data.subject || 'N/A'}`);
      console.log(`      Topic: ${data.topic || 'N/A'}`);
      console.log(`      AI Analyzed: ${data.aiAnalyzed || false}`);
      console.log(`      Summary: ${data.summary?.substring(0, 100) || 'N/A'}...`);
    });
    
  } catch (error) {
    console.error(`❌ Error inspecting student files:`, error.message);
  }
}

async function main() {
  try {
    console.log('🔍 Firestore Database Inspector');
    console.log('=' .repeat(50));
    
    // Get collection statistics
    await getCollectionStats();
    
    // Inspect main collections
    await inspectCollection('students', 3);
    await inspectCollection('fileMetadata', 3);
    await inspectCollection('driveCache', 3);
    await inspectCollection('notes', 3);
    await inspectCollection('keyConcepts', 3);
    
    // Check if we have any students with files
    console.log('\n🔍 Students with Files');
    console.log('=' .repeat(50));
    
    const studentsSnapshot = await db.collection('students').limit(5).get();
    
    for (const studentDoc of studentsSnapshot.docs) {
      const studentData = studentDoc.data();
      const studentId = studentDoc.id;
      
      const filesSnapshot = await db.collection('fileMetadata')
        .where('studentId', '==', studentId)
        .get();
      
      console.log(`\n   👤 ${studentData.displayName} (${studentId})`);
      console.log(`      Files: ${filesSnapshot.size}`);
      console.log(`      Subject: ${studentData.subject || 'N/A'}`);
      console.log(`      Drive Folder: ${studentData.driveFolderId || 'N/A'}`);
      
      if (filesSnapshot.size > 0) {
        console.log(`      📁 Sample files:`);
        filesSnapshot.docs.slice(0, 2).forEach(doc => {
          const fileData = doc.data();
          console.log(`         - ${fileData.name} (${fileData.subject || 'No subject'})`);
        });
      }
    }
    
    console.log('\n✅ Inspection complete!');
    console.log('\n💡 To inspect a specific student\'s files, run:');
    console.log('   node scripts/inspect-firestore.mjs --student <student-id>');
    
  } catch (error) {
    console.error('❌ Inspection failed:', error);
    process.exit(1);
  }
}

// Check for command line arguments
const args = process.argv.slice(2);
if (args.includes('--student') && args.length > 2) {
  const studentIndex = args.indexOf('--student');
  const studentId = args[studentIndex + 1];
  console.log('🔍 Inspecting specific student...');
  inspectStudentFiles(studentId).then(() => process.exit(0)).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
} else {
  main();
}
