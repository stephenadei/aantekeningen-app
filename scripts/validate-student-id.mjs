import { google } from 'googleapis';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get student ID from command line arguments
const studentId = process.argv[2];

if (!studentId) {
  console.log('❌ Usage: node scripts/validate-student-id.mjs <student-id>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/validate-student-id.mjs 0FTYzgjgllP6rZZBmXil');
  console.log('  node scripts/validate-student-id.mjs 1zzYz5TURBj0ieMC7-xvFAzA5gkqoQpPw');
  process.exit(1);
}

console.log('🔍 Student ID Validator');
console.log('======================');
console.log(`Student ID: ${studentId}`);
console.log('');

// Initialize Firebase
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  credential: cert({
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    projectId: process.env.FIREBASE_PROJECT_ID,
  }),
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize Google Drive API
const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
);

auth.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth });

// Check if it's a Firestore student ID
console.log('🔥 Firestore Student ID Check:');
console.log('-------------------------------');

try {
  const doc = await db.collection('students').doc(studentId).get();
  
  if (doc.exists) {
    const data = doc.data();
    console.log('✅ VALID Firestore Student ID');
    console.log(`   Display Name: ${data.displayName}`);
    console.log(`   Subject: ${data.subject || 'Not set'}`);
    console.log(`   Drive Folder ID: ${data.driveFolderId || 'Not set'}`);
    console.log(`   Created: ${data.createdAt?.toDate?.()?.toISOString() || 'Unknown'}`);
    console.log(`   Updated: ${data.updatedAt?.toDate?.()?.toISOString() || 'Unknown'}`);
  } else {
    console.log('❌ NOT FOUND in Firestore');
    console.log('   This ID does not exist in the students collection');
  }
} catch (error) {
  console.log('❌ ERROR checking Firestore');
  console.log(`   Error: ${error.message}`);
}

console.log('');

// Check if it's a Drive folder ID
console.log('📁 Google Drive Folder ID Check:');
console.log('---------------------------------');

try {
  const response = await drive.files.get({
    fileId: studentId,
    fields: 'id,name,mimeType,parents,createdTime,modifiedTime'
  });
  
  if (response.data.mimeType === 'application/vnd.google-apps.folder') {
    console.log('✅ VALID Google Drive Folder ID');
    console.log(`   Folder Name: ${response.data.name}`);
    console.log(`   Created: ${response.data.createdTime}`);
    console.log(`   Modified: ${response.data.modifiedTime}`);
    console.log(`   Parents: ${response.data.parents?.join(', ') || 'None'}`);
    
    // Check if this folder is linked to a Firestore student
    const studentQuery = await db.collection('students')
      .where('driveFolderId', '==', studentId)
      .limit(1)
      .get();
    
    if (!studentQuery.empty) {
      const student = studentQuery.docs[0].data();
      console.log(`   Linked to Firestore student: ${student.displayName} (${studentQuery.docs[0].id})`);
    } else {
      console.log('   ⚠️  Not linked to any Firestore student');
    }
  } else {
    console.log('❌ NOT a folder');
    console.log(`   This is a ${response.data.mimeType} file, not a folder`);
    console.log(`   File Name: ${response.data.name}`);
  }
} catch (error) {
  if (error.code === 404) {
    console.log('❌ NOT FOUND in Google Drive');
    console.log('   This ID does not exist in Google Drive');
  } else {
    console.log('❌ ERROR checking Google Drive');
    console.log(`   Error: ${error.message}`);
  }
}

console.log('');

// Determine ID type
console.log('🎯 ID Type Analysis:');
console.log('--------------------');

if (studentId.length === 20 && /^[a-zA-Z0-9]{20}$/.test(studentId)) {
  console.log('📊 Format: Firestore Student ID (20 alphanumeric characters)');
} else if (studentId.length > 20) {
  console.log('📊 Format: Likely Google Drive Folder ID (longer than 20 characters)');
} else {
  console.log('📊 Format: Unknown (does not match expected patterns)');
}

console.log('');

// Recommendations
console.log('💡 Recommendations:');
console.log('-------------------');

try {
  const doc = await db.collection('students').doc(studentId).get();
  if (doc.exists) {
    console.log('✅ Use this ID as a Firestore student ID');
    console.log('   API calls: /api/students/' + studentId + '?idType=firestore');
  }
} catch (error) {
  // Ignore errors
}

try {
  const response = await drive.files.get({
    fileId: studentId,
    fields: 'id,mimeType'
  });
  
  if (response.data.mimeType === 'application/vnd.google-apps.folder') {
    console.log('✅ Use this ID as a Drive folder ID');
    console.log('   API calls: /api/students/' + studentId + '?idType=drive');
  }
} catch (error) {
  // Ignore errors
}

console.log('');
console.log('📖 For more information, see AUTHENTICATION.md');
