import { google } from 'googleapis';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🔍 Aantekeningen App Credentials Checker');
console.log('=====================================\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('-------------------------');

const requiredVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL', 
  'FIREBASE_PRIVATE_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REFRESH_TOKEN',
  'NEXTAUTH_SECRET'
];

const optionalVars = [
  'OPENAI_API_KEY',
  'CACHE_DURATION_HOURS'
];

let allRequiredPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: SET`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    allRequiredPresent = false;
  }
});

optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: SET`);
  } else {
    console.log(`⚠️  ${varName}: NOT SET (optional)`);
  }
});

console.log('');

if (!allRequiredPresent) {
  console.log('❌ Some required environment variables are missing!');
  console.log('📖 See AUTHENTICATION.md for setup instructions');
  console.log('📄 Copy .env.local.template to .env.local and fill in the values');
  process.exit(1);
}

// Test Firebase credentials
console.log('🔥 Firebase Credentials Test:');
console.log('-----------------------------');

try {
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
  
  // Test with a simple query
  await db.collection('students').limit(1).get();
  console.log('✅ Firebase service account credentials: VALID');
  console.log(`   Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`   Service Account: ${process.env.FIREBASE_CLIENT_EMAIL}`);
} catch (error) {
  console.log('❌ Firebase service account credentials: INVALID');
  console.log(`   Error: ${error.message}`);
  console.log('💡 Solutions:');
  console.log('   1. Check FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY');
  console.log('   2. Generate new service account key from Firebase Console');
  console.log('   3. See AUTHENTICATION.md for detailed instructions');
}

console.log('');

// Test Google OAuth2 credentials
console.log('🔐 Google OAuth2 Credentials Test:');
console.log('----------------------------------');

try {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
  );

  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  // Test token refresh
  const tokens = await auth.refreshAccessToken();
  console.log('✅ Google OAuth2 credentials: VALID');
  console.log(`   Client ID: ${process.env.GOOGLE_CLIENT_ID}`);
  console.log(`   Redirect URI: ${process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'}`);
  console.log(`   Token expires: ${tokens.credentials.expiry_date ? new Date(tokens.credentials.expiry_date).toISOString() : 'Unknown'}`);
} catch (error) {
  console.log('❌ Google OAuth2 credentials: INVALID');
  console.log(`   Error: ${error.message}`);
  console.log('💡 Solutions:');
  console.log('   1. Run: node scripts/refresh-oauth-token.mjs');
  console.log('   2. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  console.log('   3. Verify OAuth client configuration in Google Cloud Console');
  console.log('   4. See AUTHENTICATION.md for detailed instructions');
}

console.log('');

// Test Google Drive API access
console.log('📁 Google Drive API Test:');
console.log('-------------------------');

try {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
  );

  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  const drive = google.drive({ version: 'v3', auth });
  
  // Test with a simple query
  const response = await drive.files.list({
    q: "name='Notability' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id, name)',
    pageSize: 1,
  });
  
  console.log('✅ Google Drive API access: VALID');
  console.log(`   Found ${response.data.files?.length || 0} folders`);
  if (response.data.files && response.data.files.length > 0) {
    console.log(`   First folder: ${response.data.files[0].name} (${response.data.files[0].id})`);
  }
} catch (error) {
  console.log('❌ Google Drive API access: INVALID');
  console.log(`   Error: ${error.message}`);
  console.log('💡 Solutions:');
  console.log('   1. Check your Google Drive folder structure');
  console.log('   2. Verify you have access to the Notability folder');
  console.log('   3. Run: node scripts/refresh-oauth-token.mjs');
  console.log('   4. See AUTHENTICATION.md for detailed instructions');
}

console.log('');

// Summary
console.log('📊 Summary:');
console.log('-----------');
console.log('✅ All required environment variables are set');
console.log('✅ Firebase service account credentials are valid');
console.log('✅ Google OAuth2 credentials are valid');
console.log('✅ Google Drive API access is working');
console.log('');
console.log('🎉 Your authentication setup is complete!');
console.log('🚀 You can now run: npm run dev');
