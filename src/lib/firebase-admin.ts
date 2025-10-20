import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
interface FirebaseAdminConfig {
  projectId: string;
  credential?: unknown;
}

const firebaseAdminConfig: FirebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'stephen-s-aantekeningen',
};

// Check if we have explicit credentials
if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  console.log('🔑 Using explicit Firebase credentials');
  Object.assign(firebaseAdminConfig, {
    credential: cert({
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      projectId: process.env.FIREBASE_PROJECT_ID || 'stephen-s-aantekeningen',
    }),
  });
} else {
  console.log('🔄 Using Application Default Credentials');
  // Use Application Default Credentials (from gcloud auth or Firebase CLI)
  Object.assign(firebaseAdminConfig, {
    credential: applicationDefault(),
  });
}

// Validate configuration
if (!firebaseAdminConfig.projectId) {
  console.error('❌ Firebase Admin configuratie ontbreekt. Controleer FIREBASE_PROJECT_ID in .env.local');
}

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

// Export services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;

