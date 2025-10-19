#!/usr/bin/env node

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

config({ path: '.env.local' });

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'stephen-s-aantekeningen',
  credential: applicationDefault(),
};

const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];
const db = getFirestore(app);

async function checkStudentFiles(studentId) {
  try {
    console.log(`🔍 Checking files for student: ${studentId}`);
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
      console.log(`      AI Analyzed: ${data.aiAnalyzedAt ? 'Yes (' + data.aiAnalyzedAt.toDate().toLocaleDateString() + ')' : 'No'}`);
      console.log(`      Summary: ${data.summary?.substring(0, 100) || 'N/A'}...`);
    });
    
  } catch (error) {
    console.error(`❌ Error checking student files:`, error.message);
  }
}

const studentId = process.argv[2] || 'q3sALiUiX2PtRr9bNXks';
checkStudentFiles(studentId);
