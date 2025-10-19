#!/usr/bin/env node

/**
 * Fix AI Analysis Timestamps
 * 
 * This script updates existing file metadata to add aiAnalyzedAt timestamps
 * for files that have AI-generated content but missing timestamps.
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
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

async function fixAiTimestamps() {
  try {
    console.log('🔧 Fixing AI Analysis Timestamps');
    console.log('=' .repeat(50));
    
    // Get all file metadata
    const snapshot = await db.collection('fileMetadata').get();
    
    if (snapshot.empty) {
      console.log('   No files found in Firestore');
      return;
    }
    
    console.log(`   Found ${snapshot.size} files to check`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Process files in batches
    const batch = db.batch();
    let batchCount = 0;
    const batchSize = 500; // Firestore batch limit
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Check if file has AI-generated content but no timestamp
      const hasAiContent = data.subject || data.topic || data.summary;
      const hasTimestamp = data.aiAnalyzedAt;
      
      if (hasAiContent && !hasTimestamp) {
        // Set aiAnalyzedAt to the file's updatedAt timestamp (when it was last processed)
        const aiAnalyzedAt = data.updatedAt || data.createdAt || Timestamp.now();
        
        batch.update(doc.ref, {
          aiAnalyzedAt: aiAnalyzedAt
        });
        
        updatedCount++;
        batchCount++;
        
        console.log(`   ✅ Will update: ${data.name} (${data.subject || 'No subject'})`);
        
        // Commit batch if it reaches the limit
        if (batchCount >= batchSize) {
          await batch.commit();
          console.log(`   📦 Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }
      } else {
        skippedCount++;
        if (hasTimestamp) {
          console.log(`   ⏭️  Skipped (has timestamp): ${data.name}`);
        } else {
          console.log(`   ⏭️  Skipped (no AI content): ${data.name}`);
        }
      }
    }
    
    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`   📦 Committed final batch of ${batchCount} updates`);
    }
    
    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated: ${updatedCount} files`);
    console.log(`   ⏭️  Skipped: ${skippedCount} files`);
    console.log(`   📁 Total: ${snapshot.size} files`);
    
    if (updatedCount > 0) {
      console.log('\n🎉 AI timestamps fixed successfully!');
      console.log('   Files now have proper aiAnalyzedAt timestamps');
    } else {
      console.log('\n✨ All files already have proper timestamps!');
    }
    
  } catch (error) {
    console.error('❌ Error fixing AI timestamps:', error);
    process.exit(1);
  }
}

fixAiTimestamps();
