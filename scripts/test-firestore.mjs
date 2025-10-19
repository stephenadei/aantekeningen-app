#!/usr/bin/env node

/**
 * Test Firestore Connection
 * 
 * This script tests if we can connect to Firestore using the current authentication setup.
 */

import { config } from 'dotenv';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load environment variables
config({ path: '.env.local' });

async function testFirestoreConnection() {
  try {
    console.log('🧪 Testing Firestore connection...');

    // Initialize Firebase Admin with Application Default Credentials
    const firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID || 'stephen-s-aantekeningen',
      credential: applicationDefault(),
    };

    console.log('📋 Config:', {
      projectId: firebaseConfig.projectId,
      hasCredential: !!firebaseConfig.credential,
    });

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    console.log('✅ Firebase Admin SDK initialized');

    const db = getFirestore(app);
    console.log('✅ Firestore instance created');

    // Test a simple read operation
    console.log('🔍 Testing read operation...');
    const testCollection = db.collection('test');
    const snapshot = await testCollection.limit(1).get();
    
    console.log('✅ Firestore read operation successful!');
    console.log(`📊 Found ${snapshot.size} documents in test collection`);

    // Test writing a document
    console.log('✍️ Testing write operation...');
    const testDoc = testCollection.doc('connection-test');
    await testDoc.set({
      timestamp: new Date().toISOString(),
      message: 'Connection test successful',
    });
    
    console.log('✅ Firestore write operation successful!');

    // Clean up test document
    await testDoc.delete();
    console.log('🧹 Test document cleaned up');

    console.log('\n🎉 Firestore connection test completed successfully!');
    console.log('✅ You can now use Firestore in your application');

  } catch (error) {
    console.error('❌ Firestore connection test failed:', error);
    
    if (error.message.includes('Could not load the default credentials')) {
      console.log('\n💡 To fix this issue:');
      console.log('1. Run: gcloud auth application-default login');
      console.log('2. Or add explicit Firebase credentials to .env.local:');
      console.log('   FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com');
      console.log('   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
    }
    
    process.exit(1);
  }
}

// Run the test
testFirestoreConnection();
