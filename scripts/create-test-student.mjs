#!/usr/bin/env node

/**
 * Create Test Student Script
 * 
 * This script creates a test student in Firestore for testing purposes
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';

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

async function createTestStudent() {
  try {
    console.log('🧪 Creating test student...');

    // Create a test student
    const testStudent = {
      displayName: 'Test Student',
      pinHash: await bcrypt.hash('123456', 10),
      pinUpdatedAt: Timestamp.now(),
      driveFolderId: 'test-folder-id',
      driveFolderName: 'Test Student Folder',
      subject: 'Wiskunde',
      folderConfirmed: true,
      folderLinkedAt: Timestamp.now(),
      folderConfirmedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Add to Firestore
    const docRef = await db.collection('students').add(testStudent);
    console.log(`✅ Test student created with ID: ${docRef.id}`);

    // Create some test file metadata
    const testFiles = [
      {
        id: 'test-file-1',
        studentId: docRef.id,
        folderId: 'test-folder-id',
        name: 'test-document.pdf',
        title: 'Test Document',
        modifiedTime: Timestamp.now(),
        size: 1024000,
        thumbnailUrl: '',
        downloadUrl: 'https://example.com/download/test-document.pdf',
        viewUrl: 'https://example.com/view/test-document.pdf',
        subject: 'Wiskunde',
        topic: 'Algebra',
        level: 'VWO 4',
        schoolYear: '2024-2025',
        keywords: ['algebra', 'vergelijkingen', 'wiskunde'],
        summary: 'Dit is een test document over algebra.',
        summaryEn: 'This is a test document about algebra.',
        topicEn: 'Algebra',
        keywordsEn: ['algebra', 'equations', 'mathematics'],
        aiAnalyzedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        id: 'test-file-2',
        studentId: docRef.id,
        folderId: 'test-folder-id',
        name: 'test-presentation.pptx',
        title: 'Test Presentation',
        modifiedTime: Timestamp.now(),
        size: 2048000,
        thumbnailUrl: '',
        downloadUrl: 'https://example.com/download/test-presentation.pptx',
        viewUrl: 'https://example.com/view/test-presentation.pptx',
        subject: 'Nederlands',
        topic: 'Literatuur',
        level: 'VWO 4',
        schoolYear: '2024-2025',
        keywords: ['literatuur', 'gedichten', 'nederlands'],
        summary: 'Dit is een test presentatie over Nederlandse literatuur.',
        summaryEn: 'This is a test presentation about Dutch literature.',
        topicEn: 'Literature',
        keywordsEn: ['literature', 'poems', 'dutch'],
        aiAnalyzedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }
    ];

    // Add test files to Firestore
    const batch = db.batch();
    testFiles.forEach(file => {
      const fileRef = db.collection('fileMetadata').doc(file.id);
      batch.set(fileRef, file);
    });

    await batch.commit();
    console.log(`✅ Created ${testFiles.length} test files`);

    console.log('\n🎉 Test data created successfully!');
    console.log(`📋 Test student: Test Student (PIN: 123456)`);
    console.log(`📁 Student ID: ${docRef.id}`);
    console.log(`📄 Files: ${testFiles.length} test files`);

  } catch (error) {
    console.error('❌ Error creating test student:', error);
    process.exit(1);
  }
}

// Run the script
createTestStudent();
