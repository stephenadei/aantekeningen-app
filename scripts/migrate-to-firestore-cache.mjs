#!/usr/bin/env node

/**
 * Migration Script: Populate Firestore Cache from Google Drive
 * 
 * This script migrates existing Google Drive data to Firestore cache collections
 * for optimal performance.
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
// Note: This script needs to be run with proper Firebase credentials
// For now, we'll create a simple migration that doesn't require Google Drive

// Load environment variables
config({ path: '.env.local' });

// Initialize Firebase Admin
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  // Use Application Default Credentials if available, otherwise use explicit config
  ...(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY ? {
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  } : {}),
};

const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];
const db = getFirestore(app);

async function migrateToFirestoreCache() {
  try {
    console.log('🚀 Starting Firestore cache migration...');
    console.log('📊 This will populate fileMetadata collection with Google Drive data');

    // Get all students
    console.log('📚 Fetching students...');
    const students = await getAllStudents();
    console.log(`✅ Found ${students.length} students`);

    let totalFiles = 0;
    let migratedFiles = 0;
    let errors = 0;

    // Process students in batches
    const batchSize = 3;
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      
      console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(students.length/batchSize)}`);
      
      const batchPromises = batch.map(async (student) => {
        if (!student.driveFolderId) {
          console.log(`⚠️ Student ${student.displayName} has no Drive folder ID, skipping`);
          return { files: 0, migrated: 0, errors: 0 };
        }

        try {
          console.log(`📁 Migrating files for ${student.displayName}...`);
          
          // Get files from Google Drive
          const driveFiles = await googleDriveService.listFilesInFolder(student.driveFolderId);
          console.log(`   Found ${driveFiles.length} files`);

          if (driveFiles.length === 0) {
            return { files: 0, migrated: 0, errors: 0 };
          }

          // Convert to FileMetadata format
          const fileMetadata = driveFiles.map(file => ({
            id: file.id,
            studentId: student.id,
            folderId: student.driveFolderId,
            name: file.name,
            title: file.title,
            modifiedTime: new Date(file.modifiedTime),
            size: file.size,
            thumbnailUrl: file.thumbnailUrl || '',
            downloadUrl: file.downloadUrl || '',
            viewUrl: file.viewUrl || '',
            subject: file.subject,
            topic: file.topic,
            level: file.level,
            schoolYear: file.schoolYear,
            keywords: file.keywords,
            summary: file.summary,
            summaryEn: file.summaryEn,
            topicEn: file.topicEn,
            keywordsEn: file.keywordsEn,
            aiAnalyzedAt: file.aiAnalyzedAt ? new Date(file.aiAnalyzedAt) : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          // Batch write to Firestore
          const firestoreBatch = db.batch();
          fileMetadata.forEach(file => {
            const docRef = db.collection('fileMetadata').doc(file.id);
            firestoreBatch.set(docRef, file);
          });

          await firestoreBatch.commit();
          console.log(`   ✅ Migrated ${fileMetadata.length} files`);

          return { 
            files: driveFiles.length, 
            migrated: fileMetadata.length, 
            errors: 0 
          };

        } catch (error) {
          console.error(`   ❌ Error migrating ${student.displayName}:`, error.message);
          return { files: 0, migrated: 0, errors: 1 };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(result => {
        totalFiles += result.files;
        migratedFiles += result.migrated;
        errors += result.errors;
      });

      // Small delay between batches
      if (i + batchSize < students.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n🎉 Migration completed!');
    console.log(`📊 Summary:`);
    console.log(`   Total files found: ${totalFiles}`);
    console.log(`   Files migrated: ${migratedFiles}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Success rate: ${totalFiles > 0 ? Math.round((migratedFiles / totalFiles) * 100) : 0}%`);

    // Create system sync status
    await db.collection('system').doc('syncStatus').set({
      lastFullSync: new Date(),
      isRunning: false,
      version: '1.0',
      migrationCompleted: true,
      migrationDate: new Date(),
    });

    console.log('\n✅ System sync status created');
    console.log('🚀 Firestore cache is now ready for optimal performance!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateToFirestoreCache();
