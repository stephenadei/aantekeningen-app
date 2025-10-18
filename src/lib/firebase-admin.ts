import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  // Use Application Default Credentials if available, otherwise use explicit config
  ...(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY ? {
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  } : {}),
};

// Initialize Firebase Admin (only if not already initialized)
const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];

// Export services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;

