import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { FirebaseCredentialsError } from './errors';

// Initialize Firebase Admin SDK
interface FirebaseAdminConfig {
  projectId: string;
  credential: unknown;
}

// Validate required environment variables
const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new FirebaseCredentialsError(missingVars);
}

console.log('🔑 Using Firebase service account credentials');

const firebaseAdminConfig: FirebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID!,
  credential: cert({
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    projectId: process.env.FIREBASE_PROJECT_ID!,
  }),
};

// Initialize Firebase Admin (only if not already initialized)
let app: ReturnType<typeof initializeApp>;
try {
  const adminConfig = firebaseAdminConfig as unknown as Record<string, unknown>;
  app = getApps().length === 0 ? initializeApp(adminConfig) : getApps()[0];
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error);
  throw error;
}

// Test credentials on startup
async function testFirebaseCredentials() {
  try {
    // Use the initialized app
    const testDb = getFirestore(app);
    
    // Try a simple query to test credentials
    await testDb.collection('_test').limit(1).get();
    console.log('✅ Firebase credentials validated successfully');
  } catch (error) {
    console.error('❌ Firebase credentials validation failed:', error);
    throw new FirebaseCredentialsError(['FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']);
  }
}

// Test credentials after initialization (only in development)
if (process.env.NODE_ENV === 'development') {
  testFirebaseCredentials().catch(error => {
    console.error('❌ Firebase credentials test failed:', error);
  });
}

// Export services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;

